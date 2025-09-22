import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewLikeDto } from './dto/create-review-like.dto';
import { TipoLike } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewLikesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async toggleLike(usuarioId: string, dto: CreateReviewLikeDto) {
    // Verificar que la reseña existe
    const resena = await this.prisma.resena.findUnique({
      where: { id: dto.resenaId },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Convertir string a enum TipoLike
    const tipoEnum = dto.tipo === 'like' ? TipoLike.LIKE : TipoLike.DISLIKE;

    // Verificar si ya existe un like/dislike del usuario
    const existingLike = await this.prisma.resenaLike.findUnique({
      where: {
        resenaId_usuarioId: {
          resenaId: dto.resenaId,
          usuarioId,
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
    } else {
      // Crear nuevo like/dislike
      await this.prisma.resenaLike.create({
        data: {
          resenaId: dto.resenaId,
          usuarioId,
          tipo: tipoEnum,
        },
      });

      // Crear notificación solo para likes (no dislikes)
      if (tipoEnum === TipoLike.LIKE) {
        try {
          await this.notificationsService.notifyReviewLike(
            dto.resenaId,
            usuarioId,
            'like',
          );
        } catch (error) {
          // Log del error pero no fallar la creación del like
          console.error('Error al crear notificación de like:', error);
        }
      }

      return { action: 'created', tipo: dto.tipo };
    }
  }

  async getLikesCount(resenaId: string) {
    const [likes, dislikes] = await Promise.all([
      this.prisma.resenaLike.count({
        where: {
          resenaId,
          tipo: TipoLike.LIKE,
        },
      }),
      this.prisma.resenaLike.count({
        where: {
          resenaId,
          tipo: TipoLike.DISLIKE,
        },
      }),
    ]);

    return { likes, dislikes };
  }

  async getUserLike(resenaId: string, usuarioId: string) {
    const like = await this.prisma.resenaLike.findUnique({
      where: {
        resenaId_usuarioId: {
          resenaId,
          usuarioId,
        },
      },
    });

    return like?.tipo || null;
  }

  async getResenaWithLikes(resenaId: string, usuarioId?: string) {
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            likes: {
              where: { tipo: TipoLike.LIKE },
            },
          },
        },
      },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    const [likesCount, dislikesCount, userLike] = await Promise.all([
      this.prisma.resenaLike.count({
        where: { resenaId, tipo: TipoLike.LIKE },
      }),
      this.prisma.resenaLike.count({
        where: { resenaId, tipo: TipoLike.DISLIKE },
      }),
      usuarioId ? this.getUserLike(resenaId, usuarioId) : null,
    ]);

    return {
      ...resena,
      likesCount,
      dislikesCount,
      userLike,
    };
  }
}
