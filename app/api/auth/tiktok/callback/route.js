import { NextResponse } from 'next/server';
import { encryptSession, tiktokCookie } from '../../../../lib/tiktokSession';
import { firebaseConfigured, setDocument } from '../../../../lib/firebaseServer';

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

  const profileResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: 'no-store'
  });
  const profileData = await profileResponse.json().catch(() => ({}));
  const profile = profileData?.data?.user || null;

  const sessionPayload = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    refresh_expires_in: tokenData.refresh_expires_in,
    open_id: tokenData.open_id || profile?.open_id || null,
    scope: tokenData.scope || '',
    profile,
    connected_at: Date.now()
  };
  const encrypted = encryptSession(sessionPayload);

  if (firebaseConfigured() && sessionPayload.open_id) {
    try {
      await setDocument('tiktok_connections', sessionPayload.open_id, {
        encryptedSession: encrypted,
        displayName: profile?.display_name || 'TikTok',
        scope: sessionPayload.scope,
        updatedAt: Date.now()
      });
    } catch (cloudError) {
      console.error('No se pudo guardar la conexión TikTok en Firebase:', cloudError);
    }
  }

  const response = NextResponse.redirect(new URL('/tiktok-result?status=success', request.url));
  response.cookies.delete('tiktok_oauth_state');
  response.cookies.set(tiktokCookie.name, encrypted, tiktokCookie.options);
  return response;
}
