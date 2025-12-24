import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSessionValue, parseSessionValue, type SessionPayload, SESSION_COOKIE } from './session';

export function getSession(): SessionPayload | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return parseSessionValue(raw);
}

export function requireSession(): SessionPayload {
  const session = getSession();
  if (!session) redirect('/login');
  return session as SessionPayload;
}

export function issueSessionCookie(payload: SessionPayload) {
  return createSessionValue(payload);
}
