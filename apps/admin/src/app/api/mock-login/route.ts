import { NextResponse } from 'next/server';
import { issueSessionCookie } from '@/lib/auth';
import { ROLES, SESSION_COOKIE, type Role } from '@/lib/session';

const ROLE_BY_EMAIL: Record<string, Role> = {
  'admin@orbit.local': 'admin',
  'ops@orbit.local': 'ops',
  'support@orbit.local': 'support',
};

export async function POST(request: Request) {
  const { email, password, role } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const selectedRole: Role = role && ROLES.includes(role) ? role : ROLE_BY_EMAIL[normalizedEmail] || 'admin';

  const response = NextResponse.json({ ok: true, role: selectedRole });
  response.cookies.set(SESSION_COOKIE, issueSessionCookie({ email: normalizedEmail, role: selectedRole }), {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
