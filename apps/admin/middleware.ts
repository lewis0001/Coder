import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseSessionValue, ROLES, SESSION_COOKIE, type Role } from './src/lib/session';

const PROTECTED_PREFIXES = ['/dashboard'];

const ROUTE_ROLE_RULES: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/dashboard/finance', roles: ['admin'] },
  { prefix: '/dashboard/operations', roles: ['admin', 'ops'] },
  { prefix: '/dashboard/support', roles: ['admin', 'support'] },
  { prefix: '/dashboard', roles: ROLES },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const session = parseSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + (request.nextUrl.search || ''));
    return NextResponse.redirect(loginUrl);
  }

  const rule = ROUTE_ROLE_RULES.find((candidate) => pathname.startsWith(candidate.prefix));
  if (rule && !rule.roles.includes(session.role)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', '/dashboard');
    loginUrl.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
