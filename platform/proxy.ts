import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authDestination } from '@/lib/auth/routing';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // The matcher only includes /admin. /login must always remain renderable so a
  // valid Auth cookie plus a missing profile can never create a redirect cycle.
  if (!url || !key) return NextResponse.redirect(new URL('/login?setup=1', request.url));

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const destination = authDestination(request.nextUrl.pathname, Boolean(user));
  if (!destination) return response;

  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export const config = { matcher: ['/admin/:path*'] };
