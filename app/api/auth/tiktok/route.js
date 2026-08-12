import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !redirectUri) {
    return new NextResponse('Faltan TIKTOK_CLIENT_KEY o TIKTOK_REDIRECT_URI en las variables de entorno.', { status: 500 });
  }

  const state = crypto.randomBytes(24).toString('hex');
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
  url.searchParams.set('client_key', clientKey);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'user.info.basic,video.upload');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  const response = NextResponse.redirect(url);
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/'
  });
  return response;
}
