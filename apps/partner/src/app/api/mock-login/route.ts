import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'orbit_partner_session';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DEFAULT_EMAIL = process.env.NEXT_PUBLIC_PARTNER_EMAIL || 'partner@orbit.local';
const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_PARTNER_PASSWORD || 'PartnerPass123!';

export async function POST(request: Request) {
  const body = await request.json();
  const email = body.email || DEFAULT_EMAIL;
  const password = body.password || DEFAULT_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
  }

  const apiRes = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!apiRes.ok) {
    const error = await apiRes.json().catch(() => ({}));
    return NextResponse.json({ message: error.message || 'Login failed' }, { status: 401 });
  }

  const data = await apiRes.json();
  const token = data.accessToken as string | undefined;
  if (!token) {
    return NextResponse.json({ message: 'Invalid auth response' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  // mirror for immediate availability in the same request scope
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
