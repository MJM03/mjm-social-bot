import crypto from 'crypto';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const bucket = process.env.FIREBASE_STORAGE_BUCKET;

export function firebaseConfigured() {
  return Boolean(projectId && clientEmail && privateKey);
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

let cachedToken = null;
let cachedUntil = 0;

async function accessToken() {
  if (!firebaseConfigured()) throw new Error('Firebase no está configurado');
  if (cachedToken && Date.now() < cachedUntil) return cachedToken;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store'
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'No se pudo autenticar con Firebase');
  cachedToken = data.access_token;
  cachedUntil = Date.now() + Math.max(60, (data.expires_in || 3600) - 120) * 1000;
  return cachedToken;
}

function docUrl(collection, id = '') {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

function fieldsToObject(fields = {}) {
  const read = (v) => {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    return null;
  };
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, read(v)]));
}

function objectToFields(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) result[key] = { nullValue: null };
    else if (typeof value === 'boolean') result[key] = { booleanValue: value };
    else if (typeof value === 'number' && Number.isInteger(value)) result[key] = { integerValue: String(value) };
    else if (typeof value === 'number') result[key] = { doubleValue: value };
    else result[key] = { stringValue: String(value) };
  }
  return result;
}

async function firestoreFetch(url, options = {}) {
  const token = await accessToken();
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Firestore ${response.status}`);
  return data;
}

export async function listDocuments(collection) {
  if (!firebaseConfigured()) return [];
  const data = await firestoreFetch(`${docUrl(collection)}?pageSize=200`);
  return (data.documents || []).map(doc => ({
    id: doc.name.split('/').pop(),
    ...fieldsToObject(doc.fields)
  }));
}

export async function getDocument(collection, id) {
  if (!firebaseConfigured()) return null;
  try {
    const doc = await firestoreFetch(docUrl(collection, id));
    return { id, ...fieldsToObject(doc.fields) };
  } catch (error) {
    if (String(error.message).includes('NOT_FOUND')) return null;
    throw error;
  }
}

export async function setDocument(collection, id, obj) {
  if (!firebaseConfigured()) throw new Error('Firebase no está configurado');
  await firestoreFetch(docUrl(collection, id), {
    method: 'PATCH',
    body: JSON.stringify({ fields: objectToFields(obj) })
  });
  return { id, ...obj };
}

export async function deleteDocument(collection, id) {
  const token = await accessToken();
  const response = await fetch(docUrl(collection, id), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok && response.status !== 404) throw new Error(`Firestore ${response.status}`);
}

export async function uploadObject(path, bytes, contentType = 'application/octet-stream') {
  if (!bucket) throw new Error('FIREBASE_STORAGE_BUCKET no está configurado');
  const token = await accessToken();
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: bytes,
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Storage ${response.status}`);
  return data;
}

export async function downloadObject(path) {
  if (!bucket) throw new Error('FIREBASE_STORAGE_BUCKET no está configurado');
  const token = await accessToken();
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Storage ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
