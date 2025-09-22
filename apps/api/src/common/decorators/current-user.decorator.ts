// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../../auth/types/jwt-user';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    if (!req?.user) throw new Error('Authenticated user not found on request');
    return req.user;
  },
);
