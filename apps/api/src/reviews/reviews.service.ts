import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Prisma, TipoItemOrden } from '@prisma/client';

const toInt = (v: unknown, label = 'id'): number => {
  if (v === null || v === undefined || v === '') {
    throw new BadRequestException(`${label} es requerido`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`${label} inválido`);
  return n;
};

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getAllReviews(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.resena.findMany({
        include: {
          usuario: { select: { id: true, nombre: true } },
          curso: { select: { id: true, titulo: true, slug: true } },
          producto: { select: { id: true, titulo: true, slug: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count(),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async createReview(userId: string | number, dto: CreateReviewDto) {
    const userIdNum = toInt(userId, 'userId');

    // Validar que se especifique curso o producto, pero no ambos
    if (!dto.cursoId && !dto.productoId) {
      throw new BadRequestException('Debe especificar cursoId o productoId');
    }
    if (dto.cursoId && dto.productoId) {
      throw new BadRequestException(
        'No puede especificar cursoId y productoId al mismo tiempo',
      );
    }

    // Normalizar IDs
    const cursoIdNum =
      dto.cursoId !== undefined ? toInt(dto.cursoId, 'cursoId') : undefined;

    // productoId puede venir como número o como slug: lo normalizamos a number
    let productoIdNum: number | undefined = undefined;
    if (dto.productoId !== undefined) {
      const raw = dto.productoId as unknown as string;
      if (/^\d+$/.test(String(raw))) {
        productoIdNum = toInt(raw, 'productoId');
      } else {
        const producto = await this.prisma.producto.findUnique({
          where: { slug: raw },
          select: { id: true },
        });
        if (!producto)
          throw new BadRequestException(`Producto no encontrado: ${raw}`);
        productoIdNum = producto.id;
      }
    }

    // Buscar si ya existe una reseña del usuario para este curso/producto
    const existingReview = await this.prisma.resena.findFirst({
      where: {
        usuarioId: userIdNum,
        ...(cursoIdNum !== undefined ? { cursoId: cursoIdNum } : {}),
        ...(productoIdNum !== undefined ? { productoId: productoIdNum } : {}),
      },
    });

    let resena;
    let isUpdate = false;

    if (existingReview) {
      // Actualizar la reseña existente
      isUpdate = true;
      resena = await this.prisma.resena.update({
        where: { id: existingReview.id },
        data: {
          puntaje: dto.puntaje,
          comentario: dto.comentario,
        },
        include: {
          usuario: { select: { id: true, nombre: true } },
        },
      });
    } else {
      // Crear una nueva reseña
      const data: any = {
        usuarioId: userIdNum,
        puntaje: dto.puntaje,
        comentario: dto.comentario,
      };

      if (cursoIdNum) {
        data.cursoId = cursoIdNum;
      }

      if (productoIdNum) {
        data.productoId = productoIdNum;
      }

      resena = await this.prisma.resena.create({
        data,
        include: {
          usuario: { select: { id: true, nombre: true } },
        },
      });
    }

    // Actualizar rating promedio
    if (cursoIdNum !== undefined) {
      await this.updateCourseRating(cursoIdNum);
    }
    if (productoIdNum !== undefined) {
      await this.updateProductRating(productoIdNum);
    }

    return { ...resena, isUpdate };
  }

  async updateReview(
    userId: string | number,
    reviewId: string | number,
    dto: UpdateReviewDto,
  ) {
    const userIdNum = toInt(userId, 'userId');
    const reviewIdNum = toInt(reviewId, 'reviewId');

    // Verificar que la reseña existe y pertenece al usuario
    const existingReview = await this.prisma.resena.findFirst({
      where: { id: reviewIdNum, usuarioId: userIdNum },
    });
    if (!existingReview) throw new NotFoundException('Reseña no encontrada');

    const updatedReview = await this.prisma.resena.update({
      where: { id: reviewIdNum },
      data: dto,
      include: { usuario: { select: { id: true, nombre: true } } },
    });

    // Actualizar rating promedio
    if (existingReview.cursoId !== null) {
      await this.updateCourseRating(existingReview.cursoId);
    }
    if (existingReview.productoId !== null) {
      await this.updateProductRating(existingReview.productoId);
    }

    return updatedReview;
  }

  async deleteReview(userId: string | number, reviewId: string | number) {
    const userIdNum = toInt(userId, 'userId');
    const reviewIdNum = toInt(reviewId, 'reviewId');

    const existingReview = await this.prisma.resena.findFirst({
      where: { id: reviewIdNum, usuarioId: userIdNum },
    });
    if (!existingReview) throw new NotFoundException('Reseña no encontrada');

    await this.prisma.resena.delete({ where: { id: reviewIdNum } });

    if (existingReview.cursoId !== null) {
      await this.updateCourseRating(existingReview.cursoId);
    }
    if (existingReview.productoId !== null) {
      await this.updateProductRating(existingReview.productoId);
    }

    return { message: 'Reseña eliminada correctamente' };
  }

  async getReviewsByProduct(productoId: string | number, page = 1, limit = 10) {
    const productoIdNum = toInt(productoId, 'productoId');
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.resena.findMany({
        where: { productoId: productoIdNum },
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count({ where: { productoId: productoIdNum } }),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getReviewsByCourse(cursoId: string | number, page = 1, limit = 10) {
    const cursoIdNum = toInt(cursoId, 'cursoId');
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.resena.findMany({
        where: { cursoId: cursoIdNum },
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count({ where: { cursoId: cursoIdNum } }),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getUserReview(
    userId: string | number,
    cursoId?: string | number,
    productoId?: string | number,
  ) {
    if (cursoId === undefined && productoId === undefined) {
      throw new BadRequestException('Debe especificar cursoId o productoId');
    }

    const userIdNum = toInt(userId, 'userId');
    const where: Prisma.ResenaWhereInput = {
      usuarioId: userIdNum,
      ...(cursoId !== undefined ? { cursoId: toInt(cursoId, 'cursoId') } : {}),
      ...(productoId !== undefined
        ? { productoId: toInt(productoId, 'productoId') }
        : {}),
    };

    return this.prisma.resena.findFirst({
      where,
      include: { usuario: { select: { id: true, nombre: true } } },
    });
  }

  private async validateCourseAccess(
    userId: string | number,
    cursoId: string | number,
  ) {
    const userIdNum = toInt(userId, 'userId');
    const cursoIdNum = toInt(cursoId, 'cursoId');

    const enrollment = await this.prisma.inscripcion.findFirst({
      where: { usuarioId: userIdNum, cursoId: cursoIdNum },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Debe estar inscrito en el curso para poder reseñarlo',
      );
    }
  }

  private async validateProductPurchase(
    userId: string | number,
    productoId: string | number,
  ) {
    const userIdNum = toInt(userId, 'userId');
    const productoIdNum = toInt(productoId, 'productoId');

    const purchase = await this.prisma.itemOrden.findFirst({
      where: {
        refId: productoIdNum,
        tipo: TipoItemOrden.PRODUCTO,
        orden: { usuarioId: userIdNum, estado: 'PAGADO' },
      },
    });

    if (!purchase) {
      throw new ForbiddenException(
        'Debe haber comprado el producto para poder reseñarlo',
      );
    }
  }

  private async updateCourseRating(cursoId: number) {
    const stats = await this.prisma.resena.aggregate({
      where: { cursoId },
      _avg: { puntaje: true },
      _count: { _all: true },
    });

    await this.prisma.curso.update({
      where: { id: cursoId },
      data: {
        ratingProm: stats._avg?.puntaje
          ? new Prisma.Decimal(stats._avg.puntaje)
          : null,
        ratingConteo: stats._count?._all ?? 0,
      },
    });
  }

  private async updateProductRating(productoId: number) {
    const stats = await this.prisma.resena.aggregate({
      where: { productoId },
      _avg: { puntaje: true },
      _count: { _all: true },
    });

    await this.prisma.producto.update({
      where: { id: productoId },
      data: {
        ratingProm: stats._avg?.puntaje
          ? new Prisma.Decimal(stats._avg.puntaje)
          : null,
        ratingConteo: stats._count?._all ?? 0,
      },
    });
  }
}
