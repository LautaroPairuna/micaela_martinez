import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getAllReviews(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.resena.findMany({
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
          curso: {
            select: {
              id: true,
              titulo: true,
              slug: true,
            },
          },
          producto: {
            select: {
              id: true,
              titulo: true,
              slug: true,
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count(),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createReview(userId: string, dto: CreateReviewDto) {
    console.log('=== REVIEWS SERVICE DEBUG ===');
    console.log('UserId:', userId);
    console.log('DTO received:', JSON.stringify(dto, null, 2));

    console.log(
      'dto.productoId:',
      dto.productoId,
      'type:',
      typeof dto.productoId,
    );
    console.log('============================');

    // Validar que se especifique curso o producto, pero no ambos
    if (!dto.cursoId && !dto.productoId) {
      throw new BadRequestException('Debe especificar cursoId o productoId');
    }
    if (dto.cursoId && dto.productoId) {
      throw new BadRequestException(
        'No puede especificar cursoId y productoId al mismo tiempo',
      );
    }

    // Verificar que el usuario haya comprado el curso/producto
    // TEMPORALMENTE COMENTADO PARA TESTING
    // if (dto.cursoId) {
    //   await this.validateCourseAccess(userId, dto.cursoId);
    // }
    // if (dto.productoId) {
    //   await this.validateProductPurchase(userId, dto.productoId);
    // }

    // Si es un producto, convertir slug a ID real
    let realProductoId = dto.productoId;
    if (dto.productoId) {
      const producto = await this.prisma.producto.findUnique({
        where: { slug: dto.productoId },
        select: { id: true },
      });

      if (!producto) {
        throw new BadRequestException(
          `Producto no encontrado: ${dto.productoId}`,
        );
      }

      realProductoId = producto.id;
    }

    // Crear la reseña
    const resena = await this.prisma.resena.create({
      data: {
        usuarioId: userId,
        cursoId: dto.cursoId,
        productoId: realProductoId,
        puntaje: dto.puntaje,
        comentario: dto.comentario,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Actualizar rating promedio
    if (dto.cursoId) {
      await this.updateCourseRating(dto.cursoId);
    }
    if (realProductoId) {
      await this.updateProductRating(realProductoId);
    }

    return resena;
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    // Verificar que la reseña existe y pertenece al usuario
    const existingReview = await this.prisma.resena.findFirst({
      where: {
        id: reviewId,
        usuarioId: userId,
      },
    });

    if (!existingReview) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Actualizar la reseña
    const updatedReview = await this.prisma.resena.update({
      where: { id: reviewId },
      data: dto,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Actualizar rating promedio
    if (existingReview.cursoId) {
      await this.updateCourseRating(existingReview.cursoId);
    }
    if (existingReview.productoId) {
      await this.updateProductRating(existingReview.productoId);
    }

    return updatedReview;
  }

  async deleteReview(userId: string, reviewId: string) {
    // Verificar que la reseña existe y pertenece al usuario
    const existingReview = await this.prisma.resena.findFirst({
      where: {
        id: reviewId,
        usuarioId: userId,
      },
    });

    if (!existingReview) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Eliminar la reseña
    await this.prisma.resena.delete({
      where: { id: reviewId },
    });

    // Actualizar rating promedio
    if (existingReview.cursoId) {
      await this.updateCourseRating(existingReview.cursoId);
    }
    if (existingReview.productoId) {
      await this.updateProductRating(existingReview.productoId);
    }

    return { message: 'Reseña eliminada correctamente' };
  }

  async getReviewsByProduct(productoId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.resena.findMany({
        where: { productoId },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count({ where: { productoId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewsByCourse(cursoId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.resena.findMany({
        where: { cursoId },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count({ where: { cursoId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserReview(userId: string, cursoId?: string, productoId?: string) {
    if (!cursoId && !productoId) {
      throw new BadRequestException('Debe especificar cursoId o productoId');
    }

    return this.prisma.resena.findFirst({
      where: {
        usuarioId: userId,
        ...(cursoId && { cursoId }),
        ...(productoId && { productoId }),
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
  }

  private async validateCourseAccess(userId: string, cursoId: string) {
    // Verificar que el usuario esté inscrito en el curso
    const enrollment = await this.prisma.inscripcion.findFirst({
      where: {
        usuarioId: userId,
        cursoId: cursoId,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Debe estar inscrito en el curso para poder reseñarlo',
      );
    }
  }

  private async validateProductPurchase(userId: string, productoId: string) {
    // Verificar que el usuario haya comprado el producto
    const purchase = await this.prisma.itemOrden.findFirst({
      where: {
        refId: productoId,
        tipo: 'PRODUCTO',
        orden: {
          usuarioId: userId,
          estado: 'PAGADO', // Solo órdenes pagadas
        },
      },
    });

    if (!purchase) {
      throw new ForbiddenException(
        'Debe haber comprado el producto para poder reseñarlo',
      );
    }
  }

  private async updateCourseRating(cursoId: string) {
    const stats = await this.prisma.resena.aggregate({
      where: { cursoId },
      _avg: { puntaje: true },
      _count: { id: true },
    });

    await this.prisma.curso.update({
      where: { id: cursoId },
      data: {
        ratingProm: stats._avg.puntaje
          ? new Prisma.Decimal(stats._avg.puntaje)
          : null,
        ratingConteo: stats._count.id,
      },
    });
  }

  private async updateProductRating(productoId: string) {
    const stats = await this.prisma.resena.aggregate({
      where: { productoId },
      _avg: { puntaje: true },
      _count: { id: true },
    });

    await this.prisma.producto.update({
      where: { id: productoId },
      data: {
        ratingProm: stats._avg.puntaje
          ? new Prisma.Decimal(stats._avg.puntaje)
          : null,
        ratingConteo: stats._count.id,
      },
    });
  }
}
