import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authDestination } from '@/lib/auth/routing';

const CACHE_HEADERS = ['cache-control', 'expires', 'pragma', 'vary'];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.redirect(new URL('/login?setup=1', request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousHeaders = new Headers(response.headers);
        response = NextResponse.next({ request });
        CACHE_HEADERS.forEach(name => {
          const value = previousHeaders.get(name);
          if (value) response.headers.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const destination = authDestination(request.nextUrl.pathname, Boolean(data?.claims));
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.append('Vary', 'Cookie');
  if (!destination) return response;

  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie));
  redirectResponse.headers.set('Cache-Control', 'private, no-store, max-age=0');
  redirectResponse.headers.append('Vary', 'Cookie');
  return redirectResponse;
}
