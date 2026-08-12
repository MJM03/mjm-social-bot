import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const savedState = request.cookies.get('tiktok_oauth_state')?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/tiktok-result?status=error&message=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/tiktok-result?status=error&message=state_invalid', request.url));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/tiktok-result?status=error&message=missing_env', request.url));
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store'
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    const message = tokenData.error_description || tokenData.error || 'token_exchange_failed';
    return NextResponse.redirect(new URL(`/tiktok-result?status=error&message=${encodeURIComponent(message)}`, request.url));
  }

  // V1 intentionally does not persist tokens yet. We will add encrypted server-side storage next.
  const response = NextResponse.redirect(new URL('/tiktok-result?status=success', request.url));
  response.cookies.delete('tiktok_oauth_state');
  return response;
}
