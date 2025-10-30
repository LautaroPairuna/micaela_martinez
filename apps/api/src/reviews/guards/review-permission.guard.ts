import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewPermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Validar que se especifique curso o producto, pero no ambos
    if (!body.cursoId && !body.productoId) {
      throw new BadRequestException('Debe especificar cursoId o productoId');
    }
    if (body.cursoId && body.productoId) {
      throw new BadRequestException(
        'No puede especificar cursoId y productoId al mismo tiempo',
      );
    }

    // Verificar permisos según el tipo de contenido
    if (body.cursoId) {
      await this.validateCourseAccess(user.id, body.cursoId);
    }
    if (body.productoId) {
      await this.validateProductPurchase(user.id, body.productoId);
    }

    return true;
  }

  private async validateCourseAccess(userId: string, cursoId: string) {
    // Verificar que el usuario esté inscrito en el curso
    const enrollment = await this.prisma.inscripcion.findFirst({
      where: {
        usuarioId: Number(userId),
        cursoId: Number(cursoId),
        estado: 'ACTIVADA', // Solo inscripciones activas
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Debe estar inscrito en el curso para poder reseñarlo. Solo los estudiantes inscritos pueden escribir reseñas.',
      );
    }
  }

  private async validateProductPurchase(userId: string, productoId: string) {
    // Verificar que el usuario haya comprado el producto
    const purchase = await this.prisma.itemOrden.findFirst({
      where: {
        tipo: 'PRODUCTO',
        refId: Number(productoId),
        orden: {
          usuarioId: Number(userId),
          estado: 'PAGADO', // Solo órdenes pagadas
        },
      },
      include: {
        orden: {
          select: {
            estado: true,
            creadoEn: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new ForbiddenException(
        'Debe haber comprado el producto para poder reseñarlo. Solo los compradores verificados pueden escribir reseñas.',
      );
    }
  }
}
