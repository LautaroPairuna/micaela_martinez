import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewResponseDto } from './dto/create-review-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '../generated/prisma/client';

const toInt = (v: unknown, label = 'id'): number => {
  if (v === null || v === undefined || v === '') {
    throw new BadRequestException(`${label} es requerido`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`${label} inválido`);
  return n;
};

// Tipo con include para que TS “vea” hijos/parent/usuario/_count
type ResenaRespuestaWithRelations = Prisma.ResenaRespuestaGetPayload<{
  include: {
    usuario: { select: { id: true; nombre: true; email: true } };
    parent: {
      select: {
        id: true;
        contenido: true;
        usuario: { select: { id: true; nombre: true } };
      };
    };
    hijos: {
      include: {
        usuario: { select: { id: true; nombre: true; email: true } };
        _count: { select: { hijos: true } };
      };
    };
    _count: { select: { hijos: true } };
  };
}>;

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
    const resenaIdNum = toInt(resenaId, 'resenaId');
    const usuarioIdNum = toInt(usuarioId, 'usuarioId');
    const parentIdNum =
      createResponseDto.parentId !== undefined &&
      createResponseDto.parentId !== null
        ? toInt(createResponseDto.parentId, 'parentId')
        : null;

    // Verificar que la reseña existe
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaIdNum },
    });
    if (!resena) throw new NotFoundException('Reseña no encontrada');

    // Si es respuesta a otra respuesta, verificar que existe y pertenece a la misma reseña
    if (parentIdNum !== null) {
      const respuestaPadre = await this.prisma.resenaRespuesta.findUnique({
        where: { id: parentIdNum },
      });
      if (!respuestaPadre || respuestaPadre.resenaId !== resenaIdNum) {
        throw new NotFoundException('Respuesta padre no encontrada');
      }
    }

    const respuesta = await this.prisma.resenaRespuesta.create({
      data: {
        contenido: createResponseDto.contenido,
        resenaId: resenaIdNum,
        usuarioId: usuarioIdNum,
        parentId: parentIdNum,
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        parent: {
          select: {
            id: true,
            contenido: true,
            usuario: { select: { id: true, nombre: true } },
          },
        },
        _count: { select: { hijos: true } },
      },
    });

    // Crear notificación (la API espera strings)
    try {
      await this.notificationsService.notifyReviewResponse(
        String(resenaIdNum),
        String(respuesta.id),
        String(usuarioIdNum),
      );
    } catch (error) {
      console.error('Error al crear notificación de respuesta:', error);
    }

    return respuesta;
  }

  async getResponsesByReview(resenaId: string) {
    const resenaIdNum = toInt(resenaId, 'resenaId');

    // Verificar que la reseña existe
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaIdNum },
    });
    if (!resena) throw new NotFoundException('Reseña no encontrada');

    // Obtener todas las respuestas con relaciones
    const respuestas = (await this.prisma.resenaRespuesta.findMany({
      where: { resenaId: resenaIdNum, eliminado: false },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        parent: {
          select: {
            id: true,
            contenido: true,
            usuario: { select: { id: true, nombre: true } },
          },
        },
        hijos: {
          include: {
            usuario: { select: { id: true, nombre: true, email: true } },
            _count: { select: { hijos: true } },
          },
          orderBy: { creadoEn: 'asc' },
        },
        _count: { select: { hijos: true } },
      },
      orderBy: { creadoEn: 'asc' },
    })) as ResenaRespuestaWithRelations[];

    // Agregar flag de edición
    const respuestasConEdicion = respuestas.map((r) => ({
      ...r,
      editado: r.creadoEn.getTime() !== r.actualizadoEn.getTime(),
      hijos: r.hijos.map((h) => ({
        ...h,
        editado: h.creadoEn.getTime() !== h.actualizadoEn.getTime(),
      })),
    }));

    // Respuestas raíz (sin parent)
    const respuestasRaiz = respuestasConEdicion.filter((r) => !r.parentId);

    return this.buildResponseTree(respuestasRaiz, respuestasConEdicion);
  }

  private buildResponseTree(
    respuestasRaiz: ResenaRespuestaWithRelations[],
    todas: ResenaRespuestaWithRelations[],
  ): ResenaRespuestaWithRelations[] {
    return respuestasRaiz.map((resp) => {
      const hijosRespuestas = todas.filter((r) => r.parentId === resp.id);
      return {
        ...resp,
        hijos:
          hijosRespuestas.length > 0
            ? (this.buildResponseTree(hijosRespuestas, todas) as any)
            : [],
      } as ResenaRespuestaWithRelations;
    });
  }

  async updateResponse(
    responseId: string,
    usuarioId: string,
    contenido: string,
  ) {
    const responseIdNum = toInt(responseId, 'responseId');
    const usuarioIdNum = toInt(usuarioId, 'usuarioId');

    const respuesta = await this.prisma.resenaRespuesta.findUnique({
      where: { id: responseIdNum },
    });
    if (!respuesta) throw new NotFoundException('Respuesta no encontrada');

    if (respuesta.usuarioId !== usuarioIdNum) {
      throw new ForbiddenException(
        'No tienes permisos para editar esta respuesta',
      );
    }

    return this.prisma.resenaRespuesta.update({
      where: { id: responseIdNum },
      data: { contenido },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        parent: {
          select: {
            id: true,
            contenido: true,
            usuario: { select: { id: true, nombre: true } },
          },
        },
        _count: { select: { hijos: true } },
      },
    });
  }

  async deleteResponse(responseId: string, usuarioId: string) {
    const responseIdNum = toInt(responseId, 'responseId');
    const usuarioIdNum = toInt(usuarioId, 'usuarioId');

    const respuesta = await this.prisma.resenaRespuesta.findUnique({
      where: { id: responseIdNum },
      include: { _count: { select: { hijos: true } } },
    });
    if (!respuesta) throw new NotFoundException('Respuesta no encontrada');

    if (respuesta.usuarioId !== usuarioIdNum) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta respuesta',
      );
    }

    if (respuesta._count.hijos > 0) {
      // marcar como eliminada
      return this.prisma.resenaRespuesta.update({
        where: { id: responseIdNum },
        data: { contenido: '[Respuesta eliminada]', eliminado: true },
      });
    }

    // eliminar definitivamente
    return this.prisma.resenaRespuesta.delete({ where: { id: responseIdNum } });
  }

  async getResponsesCount(resenaId: string): Promise<number> {
    const resenaIdNum = toInt(resenaId, 'resenaId');
    return this.prisma.resenaRespuesta.count({
      where: { resenaId: resenaIdNum, eliminado: false },
    });
  }
}
