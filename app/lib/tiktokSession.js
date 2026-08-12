import crypto from 'crypto';

const COOKIE_NAME = 'mjm_tiktok_session';

function key() {
  const secret = process.env.TIKTOK_CLIENT_SECRET;
  if (!secret) throw new Error('Missing TIKTOK_CLIENT_SECRET');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSession(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptSession(value) {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const clear = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(clear.toString('utf8'));
  } catch {
    return null;
  }
}

export const tiktokCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24
  }
};
