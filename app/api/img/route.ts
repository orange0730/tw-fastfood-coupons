import { NextRequest } from 'next/server';

/**
 * 圖片代理：官方圖床可能擋外站引用（hotlink），由此轉發並交給 CDN 快取。
 * 僅允許白名單網域，避免被當成開放代理。
 */
const ALLOWED_HOSTS = new Set([
  'kfcoosfs.kfcclub.com.tw',
  'img.pizzahut.com.tw',
  'image.pizzahut.com.tw',
  'www.dominos.com.tw',
  'www.tkkfriedchicken.com',
  'www.mos.com.tw',
  'burgerkingimage.azureedge.net',
]);

const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  let url: URL;
  try {
    url = new URL(raw ?? '');
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return new Response('host not allowed', { status: 403 });
  }

  const upstream = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: `${url.origin}/` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  const type = upstream?.headers.get('content-type') ?? '';
  if (!upstream?.ok || !type.startsWith('image/')) return new Response('upstream error', { status: 502 });
  if (Number(upstream.headers.get('content-length') ?? 0) > MAX_BYTES) return new Response('too large', { status: 413 });

  return new Response(upstream.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}
