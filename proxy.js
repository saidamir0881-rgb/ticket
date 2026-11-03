import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { supabaseUrl, supabaseKey } from './lib/supabase/config';
export async function proxy(request) {
  let response = NextResponse.next({ request });
  const db = createServerClient(supabaseUrl, supabaseKey, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: values => {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  await db.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/account/:path*', '/admin/:path*', '/api/:path*'] };
