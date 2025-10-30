import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Perfil público/privado mínimo para "Mi cuenta" */
export type AccountProfile = {
  id: number;
  email: string;
  nombre: string | null;
  emailVerificado: boolean;
  roles: string[]; // slugs
};

export type UpsertAddressInput = {
  id?: number;
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

export type AddFavoriteInput = { productoId: number };

// Tipos auxiliares para evitar any
type RoleSlugItem = { role: { slug: string } };

type LessonProgressEntry = {
  completed: boolean;
  completedAt: string;
  // Campos adicionales libres de progreso
  [k: string]: unknown;
};

type LessonProgressMap = Record<number, Record<number, LessonProgressEntry>>;

type ProgressData = {
  completedAt?: string | null;
  [k: string]: unknown;
};

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve perfil con roles */
  async getMe(userId: number): Promise<AccountProfile> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: userId }, // <-- number, no string
      include: {
        // Si tu relación es a través de una tabla pivote UsuarioRole[]
        roles: { select: { role: { select: { slug: true } } } },
        // Si en tu schema tenés many-to-many implícito (Role[]),
        // cambia por: roles: { select: { slug: true } }
      },
    });

    if (!u) throw new NotFoundException('Usuario no encontrado');

    const roleSlugs =
      Array.isArray(u.roles)
        ? (u.roles as RoleSlugItem[]).map((r) => r.role.slug)
        : [];

    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      emailVerificado: !!u.emailVerificadoEn,
      roles: roleSlugs,
    };
  }

  /** Actualiza datos básicos del perfil */
  async updateProfile(
    userId: number,
    dto: { nombre?: string; email?: string },
  ): Promise<void> {
    // Si vas a permitir cambiar email, considerá flujo de verificación.
    await this.prisma.usuario.update({
      where: { id: userId }, // <-- number
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
  async listAddresses(userId: number) {
    return this.prisma.direccion.findMany({
      where: { usuarioId: userId }, // <-- number
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

  async upsertAddress(userId: number, dto: UpsertAddressInput) {
    // Si es predeterminada, desmarcamos las demás
    if (dto.predeterminada) {
      await this.prisma.direccion.updateMany({
        where: { usuarioId: userId }, // <-- number
        data: { predeterminada: false },
      });
    }

    // Si tiene ID, actualizamos
    if (dto.id) {
      // Verificar que la dirección pertenece al usuario
      const existing = await this.prisma.direccion.findFirst({
        where: {
          id: Number(dto.id), // Convertido a number
          usuarioId: userId,
        },
        select: { id: true },
      });
      if (!existing) {
        throw new ForbiddenException('Dirección no encontrada');
      }

      return this.prisma.direccion.update({
        where: { id: Number(dto.id) },
        data: {
          etiqueta: dto.etiqueta,
          nombre: dto.nombre,
          telefono: dto.telefono,
          calle: dto.calle,
          numero: dto.numero,
          pisoDepto: dto.pisoDepto,
          ciudad: dto.ciudad,
          provincia: dto.provincia,
          cp: dto.cp,
          pais: dto.pais || 'AR',
          predeterminada: dto.predeterminada || false,
        },
      });
    }

    // Si no tiene ID, creamos
    return this.prisma.direccion.create({
      data: {
        usuarioId: userId, // <-- number
        etiqueta: dto.etiqueta,
        nombre: dto.nombre,
        telefono: dto.telefono,
        calle: dto.calle,
        numero: dto.numero,
        pisoDepto: dto.pisoDepto,
        ciudad: dto.ciudad,
        provincia: dto.provincia,
        cp: dto.cp,
        pais: dto.pais || 'AR',
        predeterminada: dto.predeterminada || false,
      },
    });
  }

  /** Elimina una dirección */
  async deleteAddress(userId: number, id: number) {
    // Verificar que la dirección pertenece al usuario
    const existing = await this.prisma.direccion.findFirst({
      where: {
        id: Number(id),
        usuarioId: userId,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new ForbiddenException('Dirección no encontrada');
    }

    return this.prisma.direccion.delete({
      where: { id: Number(id) },
    });
  }

  /** Favoritos */
  async listFavorites(userId: number) {
    const favs = await this.prisma.favorito.findMany({
      where: { usuarioId: userId }, // <-- number
      orderBy: { creadoEn: 'desc' },
      include: {
        // Asegurate que en tu schema la relación se llame "producto"
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

    // Si tu relación se llama distinto (p.ej. "productoRef"), cambia aquí:
    return favs
      .map((f) => f.producto)
      .filter(Boolean);
  }

  async addFavorite(userId: number, dto: AddFavoriteInput) {
    return this.prisma.favorito.upsert({
      where: {
        usuarioId_productoId: {
          usuarioId: userId, // <-- number
          productoId: dto.productoId, // <-- number
        },
      },
      update: {},
      create: {
        usuarioId: userId, // <-- number
        productoId: dto.productoId, // <-- number
      },
      select: { usuarioId: true },
    });
  }

  async removeFavorite(userId: number, productId: number) {
    await this.prisma.favorito.delete({
      where: {
        usuarioId_productoId: {
          usuarioId: userId, // <-- number
          productoId: productId, // <-- number
        },
      },
      select: { usuarioId: true },
    });
  }

  /** Órdenes (resumen) */
  async listOrders(userId: number) {
    const rows = await this.prisma.orden.findMany({
      where: { usuarioId: userId }, // Debe ser number para IntFilter
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: { select: { items: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      estado: r.estado,
      total: r.total,
      moneda: r.moneda,
      referenciaPago: r.referenciaPago,
      creadoEn: r.creadoEn,
      actualizadoEn: r.actualizadoEn,
      itemsConteo: r._count?.items || 0,
    }));
  }

  /** Inscripciones (LMS) */
  async listEnrollments(userId: number) {
    return this.prisma.inscripcion.findMany({
      where: { usuarioId: userId }, // <-- number
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
            modulos: {
              select: {
                id: true,
                titulo: true,
                orden: true,
                lecciones: {
                  select: {
                    id: true,
                    titulo: true,
                    orden: true,
                  },
                  orderBy: {
                    orden: 'asc',
                  },
                },
              },
              orderBy: {
                orden: 'asc',
              },
            },
          },
        },
      },
    });
  }

  /** Actualizar progreso de lección */
  async updateLessonProgress(
    userId: number,
    dto: {
      enrollmentId: number;
      moduleId: number;
      lessonId: number;
      progressData?: ProgressData;
    },
  ) {
    // Debug: entrada
    console.log('[Enrollments] updateLessonProgress:req', {
      userId,
      enrollmentId: dto.enrollmentId,
      moduleId: dto.moduleId,
      lessonId: dto.lessonId,
      progressData: dto.progressData,
    });
    // Verificar que la inscripción pertenece al usuario
    const enrollment = await this.prisma.inscripcion.findFirst({
      where: {
        id: Number(dto.enrollmentId),
        usuarioId: userId
      },
    });

    if (!enrollment) {
      throw new Error('Inscripción no encontrada o no autorizada');
    }

    // Obtener progreso actual
    const currentProgress: Record<string, Record<string, LessonProgressEntry>> =
      (enrollment.progreso as Record<string, Record<string, LessonProgressEntry>>) ?? {};

    // Normalizar claves a string (evita inconsistencias number vs string)
    const moduleKey = String(dto.moduleId);
    const lessonKey = String(dto.lessonId);

    // Asegurar estructura del módulo
    if (!currentProgress[moduleKey]) {
      currentProgress[moduleKey] = {};
    }

    // Desmarcar lección si completedAt es null
    if (dto.progressData?.completedAt === null) {
      // Desmarcar lección
      delete currentProgress[moduleKey][lessonKey];
      if (Object.keys(currentProgress[moduleKey]).length === 0) {
        delete currentProgress[moduleKey];
      }
    } else {
      // Marcar lección como completada
      const completedAt =
        (typeof dto.progressData?.completedAt === 'string'
          ? dto.progressData?.completedAt
          : undefined) || new Date().toISOString();

      // Aseguramos que completedAt sea siempre un string no nulo
      const safeCompletedAt: string = completedAt !== null && completedAt !== undefined 
        ? String(completedAt) 
        : new Date().toISOString();
      
      // Creamos un objeto con las propiedades base
      const lessonProgress: LessonProgressEntry = {
        completed: true,
        completedAt: safeCompletedAt,
      };
      
      // Añadimos las propiedades adicionales de progressData si existen
      if (dto.progressData) {
        Object.assign(lessonProgress, dto.progressData);
      }
      
      currentProgress[moduleKey][lessonKey] = lessonProgress;
    }

    // Guardar progreso actualizado
    const updated = await this.prisma.inscripcion.update({
      where: { id: Number(dto.enrollmentId) },
      data: {
        progreso: JSON.parse(JSON.stringify(currentProgress)),
        actualizadoEn: new Date(),
      },
      select: {
        id: true,
        progreso: true,
        actualizadoEn: true,
      },
    });

    console.log('[Enrollments] updateLessonProgress:resp', {
      id: updated.id,
      actualizadoEn: updated.actualizadoEn,
      progresoKeys: Object.keys((updated.progreso as Record<string, unknown>) || {}),
    });

    return updated;
  }
}
