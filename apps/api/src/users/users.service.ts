import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EstadoOrden } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UserForAuth = {
  id: string;
  email: string;
  nombre: string | null;
  roles: string[]; // slugs: ['CUSTOMER', 'INSTRUCTOR', ...]
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectAuth = {
    id: true,
    email: true,
    nombre: true,
    roles: { select: { role: { select: { slug: true } } } },
  } satisfies Prisma.UsuarioSelect;

  async findById(id: string | undefined): Promise<UserForAuth | null> {
    // Si el ID es undefined, retornar null inmediatamente
    if (!id) {
      console.error('Error: ID de usuario indefinido en findById');
      return null;
    }

    const u = await this.prisma.usuario.findUnique({
      where: { id },
      select: this.selectAuth,
    });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      roles: u.roles.map((ur) => ur.role.slug),
    };
  }

  async findByEmail(email: string): Promise<UserForAuth | null> {
    const u = await this.prisma.usuario.findUnique({
      where: { email },
      select: this.selectAuth,
    });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      roles: u.roles.map((ur) => ur.role.slug),
    };
  }

  /** Utilidad para asignar roles por slug (idempotente). */
  async grantRoles(userId: string, roleSlugs: string[]): Promise<void> {
    if (!roleSlugs.length) return;
    const roles = await this.prisma.role.findMany({
      where: { slug: { in: roleSlugs } },
      select: { id: true, slug: true },
    });
    if (!roles.length) return;

    await this.prisma.$transaction(
      roles.map((r) =>
        this.prisma.usuarioRol.upsert({
          where: { usuarioId_roleId: { usuarioId: userId, roleId: r.id } },
          update: {},
          create: { usuarioId: userId, roleId: r.id },
        }),
      ),
    );
  }

  /** Remueve roles por slug. */
  async revokeRoles(userId: string, roleSlugs: string[]): Promise<void> {
    if (!roleSlugs.length) return;
    const roles = await this.prisma.role.findMany({
      where: { slug: { in: roleSlugs } },
      select: { id: true },
    });
    if (!roles.length) return;

    await this.prisma.usuarioRol.deleteMany({
      where: { usuarioId: userId, roleId: { in: roles.map((r) => r.id) } },
    });
  }

  async findEnrollments(userId: string) {
    return this.prisma.inscripcion.findMany({
      where: { usuarioId: userId },
      include: {
        curso: {
          select: {
            id: true,
            titulo: true,
            slug: true,
            portada: true,
            instructor: true,
            _count: {
              select: {
                modulos: true,
              },
            },
          },
        },
      },
    });
  }

  async getSubscriptionInfo(userId: string) {
    // Buscar la orden más reciente con suscripción activa
    const activeSubscription = await this.prisma.orden.findFirst({
      where: {
        usuarioId: userId,
        esSuscripcion: true,
        suscripcionActiva: true,
        estado: EstadoOrden.PAGADO,
      },
      orderBy: {
        actualizadoEn: 'desc',
      },
      include: {
        items: true,
      },
    });

    if (!activeSubscription) {
      return {
        isActive: false,
        nextPaymentDate: null,
        subscriptionId: null,
        frequency: null,
        frequencyType: null,
        includedCourses: [],
      };
    }

    // Extraer información de metadatos
    let nextPaymentDate = null;

    try {
      const metadatos = activeSubscription.metadatos as any;

      if (metadatos?.subscription?.nextPaymentDate) {
        nextPaymentDate = metadatos.subscription.nextPaymentDate;
      } else if (metadatos?.subscription?.createdAt) {
        // Si no hay fecha de próximo pago, calcular basado en la fecha de creación y frecuencia
        const createdAt = new Date(metadatos.subscription.createdAt);
        const frequency = activeSubscription.suscripcionFrecuencia || 1;
        const frequencyType =
          activeSubscription.suscripcionTipoFrecuencia || 'months';

        // Calcular próxima fecha de pago
        const nextDate = new Date(createdAt);
        if (frequencyType === 'days') {
          nextDate.setDate(nextDate.getDate() + frequency);
        } else if (frequencyType === 'weeks') {
          nextDate.setDate(nextDate.getDate() + frequency * 7);
        } else if (frequencyType === 'months') {
          nextDate.setMonth(nextDate.getMonth() + frequency);
        } else if (frequencyType === 'years') {
          nextDate.setFullYear(nextDate.getFullYear() + frequency);
        }

        nextPaymentDate = nextDate.toISOString();
      }
    } catch (error) {
      console.error('Error al procesar metadatos de suscripción:', error);
    }

    // Extraer los cursos incluidos en la suscripción
    const includedCourses: Array<{
      id: string;
      title: string;
      slug: string;
      image?: string;
    }> = [];

    return {
      isActive: true,
      nextPaymentDate,
      subscriptionId: activeSubscription.suscripcionId,
      frequency: activeSubscription.suscripcionFrecuencia?.toString() || null,
      frequencyType: activeSubscription.suscripcionTipoFrecuencia || null,
      duration: null,
      durationType: null,
      includedCourses,
    };
  }
}
