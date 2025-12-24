export const SESSION_COOKIE = 'orbit_admin_session';

export const ROLES = ['admin', 'ops', 'support'] as const;
export type Role = (typeof ROLES)[number];

export interface SessionPayload {
  email: string;
  role: Role;
}

export function createSessionValue(payload: SessionPayload) {
  return `${payload.role}|${payload.email}`;
}

export function parseSessionValue(value?: string | null): SessionPayload | null {
  if (!value) return null;

  const [role, ...emailParts] = value.split('|');
  const email = emailParts.join('|');
  if (!email || !role) return null;

  if (!ROLES.includes(role as Role)) return null;

  return { email, role: role as Role };
}
