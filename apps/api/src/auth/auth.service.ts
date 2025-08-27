import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, password: string, nombre?: string) {
    const exists = await this.prisma.usuario.findUnique({ where: { email } });
    if (exists) throw new UnauthorizedException('Email ya registrado');
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 10));
    const user = await this.prisma.usuario.create({ data: { email, passwordHash, nombre } });
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, rol: user.rol });
    return { token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, rol: user.rol });
    return { token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } };
  }

  async me(userId: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id: userId }, select: { id: true, email: true, nombre: true, rol: true } });
    return u;
  }
}
