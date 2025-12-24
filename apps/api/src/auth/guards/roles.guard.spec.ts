import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const getContext = (roles: string[] | undefined, userRoles: string[] | undefined) => {
    const handler = () => undefined;
    Reflect.defineMetadata(ROLES_KEY, roles, handler);
    return {
      getHandler: () => handler,
      getClass: () => function Dummy() {},
      switchToHttp: () => ({ getRequest: () => ({ user: userRoles ? { roles: userRoles } : undefined }) }),
    } as unknown as ExecutionContext;
  };

  it('allows when no roles required', () => {
    const context = getContext(undefined, ['user']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows when user has required role', () => {
    const context = getContext(['admin'], ['admin']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies when user missing roles', () => {
    const context = getContext(['admin'], ['user']);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('throws when unauthenticated', () => {
    const context = getContext(['admin'], undefined);
    expect(() => guard.canActivate(context)).toThrowError();
  });
});
