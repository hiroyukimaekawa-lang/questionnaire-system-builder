export const UPSTREAM_HOST: string;
export function upstreamUrl(requestUrl: string): URL;
export function rewriteLocation(location: string | null, publicUrl: string): string | null;
export function proxyRequest(
  request: Request,
  fetchImpl?: (request: Request, init?: RequestInit) => Promise<Response>,
): Promise<Response>;
declare const worker: { fetch(request: Request): Promise<Response> };
export default worker;
