import { cookies } from 'next/headers';

const SESSION_COOKIE = 'orbit_admin_session';

export function getSession() {
  const session = cookies().get(SESSION_COOKIE);
  if (!session || !session.value) return null;
  return { token: session.value };
}

export function requireSession() {
  const session = getSession();
  return session;
}
