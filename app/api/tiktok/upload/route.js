import { NextResponse } from 'next/server';
import { decryptSession, tiktokCookie } from '../../../lib/tiktokSession';

export const runtime = 'nodejs';

export async function POST(request) {
  const session = decryptSession(request.cookies.get(tiktokCookie.name)?.value);
  if (!session?.access_token) {
    return NextResponse.json({ ok: false, error: 'TikTok no está conectado.' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('video');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ ok: false, error: 'Selecciona un video.' }, { status: 400 });
  }

  const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ ok: false, error: 'Usa MP4, MOV o WebM.' }, { status: 400 });
  }

  // Esta V1 pasa el archivo por una función serverless de Vercel.
  // Mantenemos el demo por debajo de 4 MB para evitar el límite del request.
  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ ok: false, error: 'Para la prueba usa un video menor de 4 MB.' }, { status: 413 });
  }

  const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: file.size,
        chunk_size: file.size,
        total_chunk_count: 1
      }
    }),
    cache: 'no-store'
  });

  const initData = await initResponse.json();
  if (!initResponse.ok || initData?.error?.code !== 'ok' || !initData?.data?.upload_url) {
    const message = initData?.error?.message || initData?.error?.code || 'No se pudo iniciar la subida.';
    return NextResponse.json({ ok: false, error: message, details: initData?.error || null }, { status: initResponse.status || 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadResponse = await fetch(initData.data.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'Content-Length': String(bytes.length),
      'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}`
    },
    body: bytes,
    cache: 'no-store'
  });

  if (!uploadResponse.ok && uploadResponse.status !== 201) {
    const body = await uploadResponse.text().catch(() => '');
    return NextResponse.json({ ok: false, error: `TikTok rechazó el archivo (${uploadResponse.status}).`, details: body }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    publish_id: initData.data.publish_id,
    message: 'Video enviado a TikTok como borrador. Abre tus notificaciones de TikTok para continuar la edición/publicación.'
  });
}
