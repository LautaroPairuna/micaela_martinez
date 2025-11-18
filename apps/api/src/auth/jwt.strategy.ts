// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, JwtUser } from './types/jwt-user';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          // Extraer token desde cookie mp_session
          return request?.cookies?.mp_session || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Convertir el sub a número ya que ahora los IDs son numéricos
    const userId =
      typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario inexistente');

    return {
      sub: user.id,
      email: user.email ?? payload.email,
      name: user.nombre ?? payload.name,
      roles: user.roles.length ? user.roles : (payload.roles ?? ['ESTUDIANTE']),
    };
  }
}
