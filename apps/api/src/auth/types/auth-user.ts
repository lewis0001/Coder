import { AuthPayload } from './auth-response';

export interface AuthUser extends AuthPayload {
  roles: string[];
}
