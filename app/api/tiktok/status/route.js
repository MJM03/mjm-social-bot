import { NextResponse } from 'next/server';
import { decryptSession, tiktokCookie } from '../../../lib/tiktokSession';

export const runtime = 'nodejs';

export async function POST(request) {
  const session = decryptSession(request.cookies.get(tiktokCookie.name)?.value);
  if (!session?.access_token) {
    return NextResponse.json({ ok: false, error: 'TikTok no está conectado.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }

  const publishId = payload?.publish_id;
  if (!publishId) {
    return NextResponse.json({ ok: false, error: 'Falta publish_id.' }, { status: 400 });
  }

  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({ publish_id: publishId }),
    cache: 'no-store'
  });

  const data = await response.json();
  if (!response.ok || data?.error?.code !== 'ok') {
    return NextResponse.json({
      ok: false,
      error: data?.error?.message || data?.error?.code || 'No se pudo consultar el estado.',
      details: data?.error || null
    }, { status: response.status || 400 });
  }

  return NextResponse.json({
    ok: true,
    publish_id: publishId,
    status: data?.data?.status || 'UNKNOWN',
    fail_reason: data?.data?.fail_reason || null,
    uploaded_bytes: data?.data?.uploaded_bytes ?? null,
    post_ids: data?.data?.publicaly_available_post_id || []
  });
}
