import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Perfil público/privado mínimo para “Mi cuenta” */
export type AccountProfile = {
  id: string;
  email: string;
  nombre: string | null;
  emailVerificado: boolean;
  roles: string[]; // slugs
};

export type UpsertAddressInput = {
  id?: string;
  etiqueta?: string | null;
  nombre: string;
  telefono?: string | null;
  calle: string;
  numero?: string | null;
  pisoDepto?: string | null;
  ciudad: string;
  provincia: string;
  cp: string;
  pais?: string; // default "AR" si no viene
  predeterminada?: boolean; // si true, desmarca las demás
};

export type AddFavoriteInput = { productoId: string };

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve perfil con roles */
  async getMe(userId: string): Promise<AccountProfile> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        emailVerificadoEn: true,
        roles: { select: { role: { select: { slug: true } } } },
      },
    });
    if (!u) throw new NotFoundException('Usuario no encontrado');

    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      emailVerificado: !!u.emailVerificadoEn,
      roles: u.roles.map((r) => r.role.slug),
    };
  }

  /** Actualiza datos básicos del perfil */
  async updateProfile(
    userId: string,
    dto: { nombre?: string; email?: string },
  ): Promise<void> {
    // Si vas a permitir cambiar email, considerá flujo de verificación.
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.email !== undefined
          ? { email: dto.email, emailVerificadoEn: null }
          : {}),
      },
      select: { id: true },
    });
  }

  /** Direcciones */
  async listAddresses(userId: string) {
    return this.prisma.direccion.findMany({
      where: { usuarioId: userId },
      orderBy: [{ predeterminada: 'desc' }, { actualizadoEn: 'desc' }],
      select: {
        id: true,
        etiqueta: true,
        nombre: true,
        telefono: true,
        calle: true,
        numero: true,
        pisoDepto: true,
        ciudad: true,
        provincia: true,
        cp: true,
        pais: true,
        predeterminada: true,
        actualizadoEn: true,
        creadoEn: true,
      },
    });
  }

  async upsertAddress(userId: string, dto: UpsertAddressInput) {
    const payload = {
      etiqueta: dto.etiqueta ?? null,
      nombre: dto.nombre,
      telefono: dto.telefono ?? null,
      calle: dto.calle,
      numero: dto.numero ?? null,
      pisoDepto: dto.pisoDepto ?? null,
      ciudad: dto.ciudad,
      provincia: dto.provincia,
      cp: dto.cp,
      pais: dto.pais ?? 'AR',
      predeterminada: !!dto.predeterminada,
    };

    return this.prisma.$transaction(async (tx) => {
      // Si marcó predeterminada, desmarcamos las demás
      if (payload.predeterminada) {
        await tx.direccion.updateMany({
          where: { usuarioId: userId, predeterminada: true },
          data: { predeterminada: false },
        });
      }

      // Upsert manual por id (si viene)
      if (dto.id) {
        const existing = await tx.direccion.findFirst({
          where: { id: dto.id, usuarioId: userId },
          select: { id: true },
        });
        if (!existing)
          throw new ForbiddenException('No puedes modificar esta dirección');

        return tx.direccion.update({
          where: { id: dto.id },
          data: payload,
          select: { id: true },
        });
      }

      // Create
      return tx.direccion.create({
        data: { ...payload, usuarioId: userId },
        select: { id: true },
      });
    });
  }

  async deleteAddress(userId: string, id: string) {
    const d = await this.prisma.direccion.findFirst({
      where: { id, usuarioId: userId },
      select: { id: true },
    });
    if (!d) throw new NotFoundException('Dirección no encontrada');
    await this.prisma.direccion.delete({ where: { id } });
  }

  /** Favoritos */
  async listFavorites(userId: string) {
    const favs = await this.prisma.favorito.findMany({
      where: { usuarioId: userId },
      orderBy: { creadoEn: 'desc' },
      select: {
        productoId: true,
        producto: {
          select: {
            id: true,
            slug: true,
            titulo: true,
            precio: true,
            imagen: true,
            destacado: true,
            publicado: true,
          },
        },
      },
    });
    return favs.map((f) => f.producto);
  }

  async addFavorite(userId: string, dto: AddFavoriteInput) {
    return this.prisma.favorito.upsert({
      where: {
        usuarioId_productoId: { usuarioId: userId, productoId: dto.productoId },
      },
      update: {},
      create: { usuarioId: userId, productoId: dto.productoId },
      select: { usuarioId: true },
    });
  }

  async removeFavorite(userId: string, productId: string) {
    await this.prisma.favorito.delete({
      where: {
        usuarioId_productoId: { usuarioId: userId, productoId: productId },
      },
      select: { usuarioId: true },
    });
  }

  /** Órdenes (resumen) */
  async listOrders(userId: string) {
    return this.prisma.orden
      .findMany({
        where: { usuarioId: userId },
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          estado: true,
          total: true,
          moneda: true,
          referenciaPago: true,
          creadoEn: true,
          actualizadoEn: true,
          items: { select: { id: true } },
        },
      })
      .then((rows) =>
        rows.map((r) => ({
          ...r,
          itemsConteo: r.items.length,
          items: undefined as never,
        })),
      );
  }

  /** Inscripciones (LMS) */
  async listEnrollments(userId: string) {
    return this.prisma.inscripcion.findMany({
      where: { usuarioId: userId },
      orderBy: { actualizadoEn: 'desc' },
      select: {
        id: true,
        cursoId: true,
        estado: true,
        creadoEn: true,
        actualizadoEn: true,
        progreso: true,
        curso: {
          select: {
            id: true,
            slug: true,
            titulo: true,
            portada: true,
            nivel: true,
            instructor: { select: { nombre: true } },
            _count: { select: { modulos: true } },
          },
        },
      },
    });
  }

  /** Actualizar progreso de lección */
  async updateLessonProgress(
    userId: string,
    dto: {
      enrollmentId: string;
      moduleId: string;
      lessonId: string;
      progressData?: any;
    },
  ) {
    // Verificar que la inscripción pertenece al usuario
    const enrollment = await this.prisma.inscripcion.findFirst({
      where: {
        id: dto.enrollmentId,
        usuarioId: userId,
      },
    });

    if (!enrollment) {
      throw new Error('Inscripción no encontrada o no autorizada');
    }

    // Obtener progreso actual
    const currentProgress = (enrollment.progreso as any) || {};

    // Actualizar progreso de la lección específica
    if (!currentProgress[dto.moduleId]) {
      currentProgress[dto.moduleId] = {};
    }

    // Verificar si se está desmarcando la lección (completedAt es null)
    if (dto.progressData?.completedAt === null) {
      // Desmarcar lección - eliminar del progreso
      delete currentProgress[dto.moduleId][dto.lessonId];

      // Si el módulo queda vacío, eliminarlo también
      if (Object.keys(currentProgress[dto.moduleId]).length === 0) {
        delete currentProgress[dto.moduleId];
      }
    } else {
      // Marcar lección como completada
      currentProgress[dto.moduleId][dto.lessonId] = {
        completed: true,
        completedAt: dto.progressData?.completedAt || new Date().toISOString(),
        ...dto.progressData,
      };
    }

    // Guardar progreso actualizado
    return this.prisma.inscripcion.update({
      where: { id: dto.enrollmentId },
      data: {
        progreso: currentProgress,
        actualizadoEn: new Date(),
      },
      select: {
        id: true,
        progreso: true,
        actualizadoEn: true,
      },
    });
  }
}
