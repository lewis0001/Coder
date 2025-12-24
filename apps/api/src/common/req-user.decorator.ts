import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../auth/types/auth-user';

export const ReqUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return request.user;
});
