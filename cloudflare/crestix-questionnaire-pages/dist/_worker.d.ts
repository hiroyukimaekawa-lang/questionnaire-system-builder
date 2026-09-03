export const UPSTREAM_HOST: string;
export function isPrivatePath(pathname: string): boolean;
export function upstreamUrl(requestUrl: string): URL;
export function rewriteLocation(location: string | null, publicUrl: string): string | null;
declare const worker: { fetch(request: Request): Promise<Response> };
export default worker;
