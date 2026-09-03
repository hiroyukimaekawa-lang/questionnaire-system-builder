export const UPSTREAM_HOST = 'survey-pages.hiroyuki-maekawa.workers.dev';

export function isPrivatePath(pathname) {
  return pathname === '/login' || pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/auth' || pathname.startsWith('/auth/');
}

export function upstreamUrl(requestUrl) {
  const url = new URL(requestUrl);
  url.protocol = 'https:';
  url.hostname = UPSTREAM_HOST;
  url.port = '';
  return url;
}

export function rewriteLocation(location, publicUrl) {
  if (!location) return location;
  let target;
  try { target = new URL(location); } catch { return location; }
  if (target.hostname !== UPSTREAM_HOST) return location;
  const origin = new URL(publicUrl);
  target.protocol = origin.protocol;
  target.host = origin.host;
  return target.toString();
}

function appendVaryCookie(headers) {
  const values = (headers.get('Vary') || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!values.some(v => v.toLowerCase() === 'cookie')) values.push('Cookie');
  headers.set('Vary', values.join(', '));
}

export default {
  async fetch(request) {
    const original = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set('host', UPSTREAM_HOST);
    headers.set('x-forwarded-host', original.host);
    headers.set('x-forwarded-proto', 'https');
    const upstream = await fetch(new Request(upstreamUrl(request.url), { method: request.method, headers, body: request.body, redirect: 'manual' }));
    const responseHeaders = new Headers(upstream.headers);
    const getSetCookie = upstream.headers.getSetCookie;
    if (typeof getSetCookie === 'function') {
      const cookies = getSetCookie.call(upstream.headers);
      if (cookies.length) { responseHeaders.delete('Set-Cookie'); cookies.forEach(cookie => responseHeaders.append('Set-Cookie', cookie)); }
    }
    const location = rewriteLocation(responseHeaders.get('Location'), request.url);
    if (location) responseHeaders.set('Location', location);
    if (isPrivatePath(original.pathname)) { responseHeaders.set('Cache-Control', 'private, no-store, max-age=0'); appendVaryCookie(responseHeaders); }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  },
};
