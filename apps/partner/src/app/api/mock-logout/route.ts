import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'orbit_partner_session';

export async function POST() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'));
  response.cookies.delete(SESSION_COOKIE, { path: '/' });
  return response;
}
