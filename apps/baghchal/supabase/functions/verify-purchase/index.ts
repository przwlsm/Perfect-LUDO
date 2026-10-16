// verify-purchase: the only path from a store receipt to coins or the pass.
//
// The client sends the purchase it just made (or restored); this checks it
// with the store's own API and, only then, grants the product through
// grant_iap with the service role. The client can neither call grant_iap
// nor forge a token the store will not confirm. Guests may buy: their
// coins live on this profile, and the Supporter Pass can be restored to a
// later profile from the same store account.
//
// Secrets (Dashboard → Edge Functions → verify-purchase → Secrets):
//   GOOGLE_PLAY_SERVICE_ACCOUNT  JSON key of a service account with
//                                "View financial data" on the Play Console
//   ANDROID_PACKAGE_NAME         com.devmindslabs.baghchal
//   APP_STORE_SHARED_SECRET      App Store Connect → App Information
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY come from the platform.

import { createClient } from 'jsr:@supabase/supabase-js@2';

type Body = {
  platform: 'android' | 'ios';
  productId: string;
  /** Android purchase token, or the iOS app receipt / signed transaction. */
  token: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** OAuth2 access token for the Play Developer API, from the service account key. */
async function googleAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return (await res.json()).access_token as string;
}

/** Returns the store's order id when the purchase is genuine and paid. */
async function verifyAndroid(productId: string, token: string): Promise<string> {
  const sa = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
  const pkg = Deno.env.get('ANDROID_PACKAGE_NAME');
  if (!sa || !pkg) throw new Error('Android verification is not configured yet.');
  const access = await googleAccessToken(sa);
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`,
    { headers: { Authorization: `Bearer ${access}` } },
  );
  if (!res.ok) throw new Error(`Play refused the receipt (${res.status}).`);
  const purchase = await res.json();
  // 0 = purchased; 1 = cancelled; 2 = pending.
  if (purchase.purchaseState !== 0) throw new Error('That purchase is not completed.');
  return (purchase.orderId as string) ?? token.slice(0, 200);
}

async function verifyIos(productId: string, receipt: string): Promise<string> {
  const secret = Deno.env.get('APP_STORE_SHARED_SECRET');
  if (!secret) throw new Error('iOS verification is not configured yet.');
  const ask = (url: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'receipt-data': receipt, password: secret }),
    }).then((r) => r.json());
  let data = await ask('https://buy.itunes.apple.com/verifyReceipt');
  // 21007: a sandbox receipt sent to production; retry against sandbox.
  if (data.status === 21007) data = await ask('https://sandbox.itunes.apple.com/verifyReceipt');
  if (data.status !== 0) throw new Error(`The App Store refused the receipt (${data.status}).`);
  type Line = { product_id: string; transaction_id: string };
  const lines: Line[] = [
    ...((data.latest_receipt_info as Line[] | undefined) ?? []),
    ...((data.receipt?.in_app as Line[] | undefined) ?? []),
  ];
  const entry = lines.find((p) => p.product_id === productId);
  if (!entry) throw new Error('That receipt does not contain this product.');
  return entry.transaction_id;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only.' });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData?.user) return json(401, { error: 'Sign in to buy.' });

    const body = (await req.json()) as Body;
    if (
      (body.platform !== 'android' && body.platform !== 'ios') ||
      typeof body.productId !== 'string' ||
      typeof body.token !== 'string' ||
      body.token.length === 0
    ) {
      return json(400, { error: 'Malformed purchase.' });
    }

    const orderId =
      body.platform === 'android'
        ? await verifyAndroid(body.productId, body.token)
        : await verifyIos(body.productId, body.token);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: wallet, error } = await admin.rpc('grant_iap', {
      p_uid: userData.user.id,
      p_product_id: body.productId,
      p_platform: body.platform,
      p_order_id: orderId,
    });
    if (error) return json(400, { error: error.message });
    return json(200, { wallet });
  } catch (e) {
    return json(400, { error: e instanceof Error ? e.message : 'Verification failed.' });
  }
});
