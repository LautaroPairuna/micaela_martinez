// src/auth/types/jwt-user.ts
export type JwtPayload = {
  sub: number;
  email?: string;
  name?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
};

export type JwtUser = {
  sub: number;
  email?: string;
  name?: string;
  roles: string[];
};
