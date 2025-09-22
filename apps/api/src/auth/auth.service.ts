// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EventTypes, AuthEventPayload } from '../events/event.types';

type JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Selección mínima del usuario para auth (incluye roles M:N)
  private readonly authSelect = {
    id: true,
    email: true,
    nombre: true,
    passwordHash: true,
    emailVerificadoEn: true,
    roles: { select: { role: { select: { slug: true } } } },
  } as const;

  private toRoleSlugs(u: { roles: { role: { slug: string } }[] }): string[] {
    return u.roles.map((ur) => ur.role.slug);
  }

  private signAccessToken(user: {
    id: string;
    email: string;
    nombre: string | null;
    roles: string[];
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.nombre ?? undefined,
      roles: user.roles,
    };
    // Ajustá expiración según tu configuración
    return this.jwt.sign(payload, { expiresIn: '3h' });
  }

  private signRefreshToken(user: { id: string; roles: string[] }) {
    const payload: JwtPayload = { sub: user.id, roles: user.roles };
    return this.jwt.sign(payload, { expiresIn: '7d' });
  }

  /** Login por email/password */
  async loginWithEmailPassword(email: string, password: string, req?: Request) {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      select: this.authSelect,
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const roles = this.toRoleSlugs(user);

    // Emitir evento de login
    const payload: AuthEventPayload = {
      userId: user.id,
      userEmail: user.email,
      action: 'login',
      timestamp: new Date(),
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      endpoint: req?.url || '/api/auth/login',
    };

    this.eventEmitter.emit(EventTypes.USER_LOGIN, payload);

    return {
      accessToken: this.signAccessToken({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        roles,
      }),
      refreshToken: this.signRefreshToken({ id: user.id, roles }),
      user: { id: user.id, email: user.email, nombre: user.nombre, roles },
    };
  }

  /** Registro básico: crea usuario y le otorga rol CUSTOMER por defecto */
  async register(
    email: string,
    nombre: string | null,
    rawPassword: string,
    req?: Request,
  ) {
    const exists = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Email en uso');

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const created = await this.prisma.usuario.create({
      data: { email, nombre, passwordHash, emailVerificadoEn: null },
      select: { id: true, email: true, nombre: true },
    });

    const customer = await this.prisma.role.findUnique({
      where: { slug: 'customer' },
      select: { id: true },
    });
    if (customer) {
      await this.prisma.usuarioRol.create({
        data: { usuarioId: created.id, roleId: customer.id },
      });
    }
    const roles = ['customer'];

    // Emitir evento de registro
    const payload: AuthEventPayload = {
      userId: created.id,
      userEmail: created.email,
      action: 'register',
      timestamp: new Date(),
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      endpoint: req?.url || '/api/auth/register',
    };

    this.eventEmitter.emit(EventTypes.USER_REGISTERED, payload);

    return {
      accessToken: this.signAccessToken({
        id: created.id,
        email: created.email,
        nombre: created.nombre,
        roles,
      }),
      refreshToken: this.signRefreshToken({ id: created.id, roles }),
      user: { ...created, roles },
    };
  }

  /** Refresh tokens con roles actuales en DB */
  async refreshTokens(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        roles: { select: { role: { select: { slug: true } } } },
      },
    });
    if (!user) throw new UnauthorizedException('Usuario inexistente');

    const roles = this.toRoleSlugs(user);
    return {
      accessToken: this.signAccessToken({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        roles,
      }),
      refreshToken: this.signRefreshToken({ id: user.id, roles }),
    };
  }
}
