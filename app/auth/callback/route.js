import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request) {
  const url = new URL(request.url), code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/account';
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/account', url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', url.origin));
}
