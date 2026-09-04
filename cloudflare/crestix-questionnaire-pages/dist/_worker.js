export const UPSTREAM_HOST = 'survey-pages.hiroyuki-maekawa.workers.dev';

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
  try {
    target = new URL(location);
  } catch {
    return location;
  }

  if (target.hostname !== UPSTREAM_HOST) return location;

  const origin = new URL(publicUrl);
  target.protocol = origin.protocol;
  target.host = origin.host;
  return target.toString();
}

function isRedirect(status) {
  return status >= 300 && status < 400;
}

export async function proxyRequest(request, fetchImpl = fetch) {
  const original = new URL(request.url);

  try {
    const upstreamRequest = new Request(upstreamUrl(request.url), request);
    const upstream = await fetchImpl(upstreamRequest, { redirect: 'manual' });
    const location = upstream.headers.get('Location');
    const rewrittenLocation = isRedirect(upstream.status)
      ? rewriteLocation(location, request.url)
      : location;

    if (rewrittenLocation === location) return upstream;

    const response = new Response(upstream.body, upstream);
    response.headers.set('Location', rewrittenLocation);
    return response;
  } catch (error) {
    console.error('[pages-proxy]', {
      path: original.pathname,
      error: error instanceof Error ? error.message : 'unknown',
    });
    throw error;
  }
}

export default {
  async fetch(request) {
    return proxyRequest(request);
  },
};
