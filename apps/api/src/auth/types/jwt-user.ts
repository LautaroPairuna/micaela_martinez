// src/auth/types/jwt-user.ts
export type JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
};

export type JwtUser = {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
};
