import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewLikeDto } from './dto/create-review-like.dto';
import { TipoLike } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const toInt = (v: unknown, label = 'id'): number => {
  if (v === null || v === undefined || v === '') {
    throw new BadRequestException(`${label} es requerido`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`${label} inválido`);
  return n;
};

@Injectable()
export class ReviewLikesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async toggleLike(usuarioId: string, dto: CreateReviewLikeDto) {
    const resenaIdNum = toInt(dto.resenaId, 'resenaId');
    const usuarioIdNum = toInt(usuarioId, 'usuarioId');

    // Verificar que la reseña existe
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaIdNum },
    });
    if (!resena) throw new NotFoundException('Reseña no encontrada');

    // Convertir string a enum TipoLike
    const tipoEnum = dto.tipo === 'like' ? TipoLike.LIKE : TipoLike.DISLIKE;

    // Verificar si ya existe un like/dislike del usuario
    const existingLike = await this.prisma.resenaLike.findUnique({
      where: {
        resenaId_usuarioId: {
          resenaId: resenaIdNum,
          usuarioId: usuarioIdNum,
        },
      },
    });

    if (existingLike) {
      if (existingLike.tipo === tipoEnum) {
        // Si es el mismo tipo, eliminar el like/dislike
        await this.prisma.resenaLike.delete({
          where: { id: existingLike.id },
        });
        return { action: 'removed', tipo: dto.tipo };
      } else {
        // Si es diferente tipo, actualizar
        await this.prisma.resenaLike.update({
          where: { id: existingLike.id },
          data: { tipo: tipoEnum },
        });
        return { action: 'updated', tipo: dto.tipo };
      }
    }

    // Crear nuevo like/dislike
    await this.prisma.resenaLike.create({
      data: {
        resenaId: resenaIdNum,
        usuarioId: usuarioIdNum,
        tipo: tipoEnum,
      },
    });

    // Crear notificación solo para likes (no dislikes)
    if (tipoEnum === TipoLike.LIKE) {
      try {
        await this.notificationsService.notifyReviewLike(
          String(resenaIdNum),
          String(usuarioIdNum),
          'like',
        );
      } catch (error) {
        // Log del error pero no fallar la creación del like
        console.error('Error al crear notificación de like:', error);
      }
    }

    return { action: 'created', tipo: dto.tipo };
  }

  async findById(id: string) {
    const idNum = toInt(id, 'id');
    return this.prisma.resenaLike.findUnique({
      where: { id: idNum },
    });
  }

  // Crea un LIKE por defecto (si querés soportar DISLIKE, agregá un parámetro)
  async create(userId: string, reviewId: string) {
    const usuarioIdNum = toInt(userId, 'usuarioId');
    const resenaIdNum = toInt(reviewId, 'resenaId');

    return this.prisma.resenaLike.create({
      data: {
        usuarioId: usuarioIdNum,
        resenaId: resenaIdNum,
        tipo: TipoLike.LIKE,
      },
    });
  }

  async delete(userId: string, reviewId: string) {
    const usuarioIdNum = toInt(userId, 'usuarioId');
    const resenaIdNum = toInt(reviewId, 'resenaId');

    return this.prisma.resenaLike.deleteMany({
      where: {
        usuarioId: usuarioIdNum,
        resenaId: resenaIdNum,
      },
    });
  }

  async findByUserAndReview(userId: string, reviewId: string) {
    const usuarioIdNum = toInt(userId, 'usuarioId');
    const resenaIdNum = toInt(reviewId, 'resenaId');

    return this.prisma.resenaLike.findFirst({
      where: {
        usuarioId: usuarioIdNum,
        resenaId: resenaIdNum,
      },
    });
  }

  async getLikesCount(resenaId: string) {
    const resenaIdNum = toInt(resenaId, 'resenaId');

    const [likes, dislikes] = await Promise.all([
      this.prisma.resenaLike.count({
        where: {
          resenaId: resenaIdNum,
          tipo: TipoLike.LIKE,
        },
      }),
      this.prisma.resenaLike.count({
        where: {
          resenaId: resenaIdNum,
          tipo: TipoLike.DISLIKE,
        },
      }),
    ]);

    return { likes, dislikes };
  }

  async countByReview(reviewId: string) {
    const resenaIdNum = toInt(reviewId, 'resenaId');
    return this.prisma.resenaLike.count({
      where: { resenaId: resenaIdNum },
    });
  }

  async getUserLike(resenaId: string, usuarioId: string) {
    const resenaIdNum = toInt(resenaId, 'resenaId');
    const usuarioIdNum = toInt(usuarioId, 'usuarioId');

    const like = await this.prisma.resenaLike.findUnique({
      where: {
        resenaId_usuarioId: {
          resenaId: resenaIdNum,
          usuarioId: usuarioIdNum,
        },
      },
    });

    return like?.tipo || null;
  }

  async findLikesByUser(userId: string) {
    const usuarioIdNum = toInt(userId, 'usuarioId');

    return this.prisma.resenaLike.findMany({
      where: { usuarioId: usuarioIdNum },
      include: { resena: true },
    });
  }

  async getResenaWithLikes(resenaId: string, usuarioId?: string) {
    const resenaIdNum = toInt(resenaId, 'resenaId');

    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaIdNum },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    const [likesCount, dislikesCount, userLike] = await Promise.all([
      this.prisma.resenaLike.count({
        where: { resenaId: resenaIdNum, tipo: TipoLike.LIKE },
      }),
      this.prisma.resenaLike.count({
        where: { resenaId: resenaIdNum, tipo: TipoLike.DISLIKE },
      }),
      usuarioId ? this.getUserLike(String(resenaIdNum), usuarioId) : null,
    ]);

    return {
      ...resena,
      likesCount,
      dislikesCount,
      userLike,
    };
  }
}
