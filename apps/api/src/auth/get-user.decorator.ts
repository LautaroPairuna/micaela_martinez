import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from './types/jwt-user';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
