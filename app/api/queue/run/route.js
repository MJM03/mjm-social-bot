import { NextResponse } from 'next/server';
import { decryptSession } from '../../../lib/tiktokSession';
import { downloadObject, getDocument, listDocuments, setDocument } from '../../../lib/firebaseServer';

export const runtime = 'nodejs';

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function uploadTikTokDraft(session, item) {
  const bytes = await downloadObject(item.mediaPath);
  const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: bytes.length,
        chunk_size: bytes.length,
        total_chunk_count: 1
      }
    }),
    cache: 'no-store'
  });
  const initData = await initResponse.json();
  if (!initResponse.ok || initData?.error?.code !== 'ok' || !initData?.data?.upload_url) {
    throw new Error(initData?.error?.message || initData?.error?.code || 'TikTok no pudo iniciar la carga');
  }

  const uploadResponse = await fetch(initData.data.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': item.mediaType || 'video/mp4',
      'Content-Length': String(bytes.length),
      'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}`
    },
    body: bytes,
    cache: 'no-store'
  });
  if (!uploadResponse.ok && uploadResponse.status !== 201) {
    throw new Error(`TikTok rechazó el archivo (${uploadResponse.status})`);
  }
  return initData.data.publish_id;
}

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });

  const now = Date.now();
  const docs = await listDocuments('scheduled_posts');
  const due = docs.filter(doc => doc.status === 'Programada' && Date.parse(doc.scheduledAt || '') <= now).slice(0, 10);
  const results = [];

  for (const doc of due) {
    const item = JSON.parse(doc.payload || '{}');
    try {
      if (item.platform !== 'TikTok') throw new Error('Plataforma aún no soportada por la cola');
      if (!item.mediaPath) throw new Error('La publicación no tiene video adjunto');

      const connection = await getDocument('tiktok_connections', doc.owner);
      const session = decryptSession(connection?.encryptedSession);
      if (!session?.access_token) throw new Error('La conexión de TikTok debe renovarse');

      await setDocument('scheduled_posts', doc.id, {
        owner: doc.owner,
        status: 'Procesando',
        scheduledAt: doc.scheduledAt,
        payload: JSON.stringify({ ...item, status: 'Procesando' }),
        updatedAt: Date.now()
      });

      const publishId = await uploadTikTokDraft(session, item);
      const updated = { ...item, status: 'Enviada', publishId, sentAt: Date.now() };
      await setDocument('scheduled_posts', doc.id, {
        owner: doc.owner,
        status: 'Enviada',
        scheduledAt: doc.scheduledAt,
        payload: JSON.stringify(updated),
        updatedAt: Date.now()
      });
      results.push({ id: doc.id, ok: true, publishId });
    } catch (error) {
      const updated = { ...item, status: 'Error', error: error.message, failedAt: Date.now() };
      await setDocument('scheduled_posts', doc.id, {
        owner: doc.owner,
        status: 'Error',
        scheduledAt: doc.scheduledAt,
        payload: JSON.stringify(updated),
        updatedAt: Date.now()
      }).catch(() => {});
      results.push({ id: doc.id, ok: false, error: error.message });
    }
  }

  return NextResponse.json({ ok: true, checked: docs.length, due: due.length, results });
}
