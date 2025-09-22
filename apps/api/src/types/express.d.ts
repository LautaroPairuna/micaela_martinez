// src/types/express.d.ts
import { JwtUser } from '@/auth/types/jwt-user';

declare global {
  namespace Express {
    interface User extends JwtUser {}
    interface Request {
      user: JwtUser;
    }
  }
}
export {};
