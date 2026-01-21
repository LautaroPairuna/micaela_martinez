// src/types/express.d.ts
import { JwtUser } from '@/auth/types/jwt-user';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends JwtUser {}
    interface Request {
      user: JwtUser;
    }
  }
}
export {};
