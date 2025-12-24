import { cookies } from 'next/headers';

const SESSION_COOKIE = 'orbit_partner_session';

export function getSession() {
  const session = cookies().get(SESSION_COOKIE);
  if (!session || !session.value) return null;
  return { token: session.value };
}
