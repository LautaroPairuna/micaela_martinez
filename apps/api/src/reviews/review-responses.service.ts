import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewResponseDto } from './dto/create-review-response.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewResponsesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createResponse(
    resenaId: string,
    usuarioId: string,
    createResponseDto: CreateReviewResponseDto,
  ) {
    // Verificar que la reseña existe
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaId },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Si es una respuesta a otra respuesta, verificar que existe
    if (createResponseDto.parentId) {
      const respuestaPadre = await this.prisma.resenaRespuesta.findUnique({
        where: { id: createResponseDto.parentId },
      });

      if (!respuestaPadre || respuestaPadre.resenaId !== resenaId) {
        throw new NotFoundException('Respuesta padre no encontrada');
      }
    }

    const respuesta = await this.prisma.resenaRespuesta.create({
      data: {
        contenido: createResponseDto.contenido,
        resenaId,
        usuarioId,
        parentId: createResponseDto.parentId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            contenido: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: {
            hijos: true,
          },
        },
      },
    });

    // Crear notificación para el autor de la reseña
    try {
      await this.notificationsService.notifyReviewResponse(
        resenaId,
        respuesta.id,
        usuarioId,
      );
    } catch (error) {
      // Log del error pero no fallar la creación de la respuesta
      console.error('Error al crear notificación de respuesta:', error);
    }

    return respuesta;
  }

  async getResponsesByReview(resenaId: string) {
    // Verificar que la reseña existe
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaId },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Obtener todas las respuestas de la reseña organizadas por threading
    const respuestas = await this.prisma.resenaRespuesta.findMany({
      where: {
        resenaId,
        eliminado: false,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            contenido: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        hijos: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            _count: {
              select: {
                hijos: true,
              },
            },
          },
          orderBy: {
            creadoEn: 'asc',
          },
        },
        _count: {
          select: {
            hijos: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'asc',
      },
    });

    // Agregar información de edición a cada respuesta
    const respuestasConEdicion = respuestas.map((respuesta) => ({
      ...respuesta,
      editado:
        respuesta.creadoEn.getTime() !== respuesta.actualizadoEn.getTime(),
      hijos: respuesta.hijos.map((hijo) => ({
        ...hijo,
        editado: hijo.creadoEn.getTime() !== hijo.actualizadoEn.getTime(),
      })),
    }));

    // Organizar en estructura de árbol
    const respuestasRaiz = respuestasConEdicion.filter((r) => !r.parentId);

    return this.buildResponseTree(respuestasRaiz, respuestasConEdicion);
  }

  private buildResponseTree(
    respuestasRaiz: any[],
    todasLasRespuestas: any[],
  ): any[] {
    return respuestasRaiz.map((respuesta: any) => {
      const hijosRespuestas = todasLasRespuestas.filter(
        (r) => r.parentId === respuesta.id,
      );

      return {
        ...respuesta,
        hijos:
          hijosRespuestas.length > 0
            ? this.buildResponseTree(hijosRespuestas, todasLasRespuestas)
            : [],
      };
    });
  }

  async updateResponse(
    responseId: string,
    usuarioId: string,
    contenido: string,
  ) {
    const respuesta = await this.prisma.resenaRespuesta.findUnique({
      where: { id: responseId },
    });

    if (!respuesta) {
      throw new NotFoundException('Respuesta no encontrada');
    }

    if (respuesta.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permisos para editar esta respuesta',
      );
    }

    return this.prisma.resenaRespuesta.update({
      where: { id: responseId },
      data: { contenido },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            contenido: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: {
            hijos: true,
          },
        },
      },
    });
  }

  async deleteResponse(responseId: string, usuarioId: string) {
    const respuesta = await this.prisma.resenaRespuesta.findUnique({
      where: { id: responseId },
      include: {
        _count: {
          select: {
            hijos: true,
          },
        },
      },
    });

    if (!respuesta) {
      throw new NotFoundException('Respuesta no encontrada');
    }

    if (respuesta.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta respuesta',
      );
    }

    // Si tiene respuestas hijas, solo marcar como eliminada
    if (respuesta._count.hijos > 0) {
      return this.prisma.resenaRespuesta.update({
        where: { id: responseId },
        data: {
          contenido: '[Respuesta eliminada]',
          eliminado: true,
        },
      });
    }

    // Si no tiene respuestas hijas, eliminar completamente
    return this.prisma.resenaRespuesta.delete({
      where: { id: responseId },
    });
  }

  async getResponsesCount(resenaId: string): Promise<number> {
    return this.prisma.resenaRespuesta.count({
      where: {
        resenaId,
        eliminado: false,
      },
    });
  }
}
