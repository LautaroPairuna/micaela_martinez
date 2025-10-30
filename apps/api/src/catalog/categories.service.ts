import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUrlUtil } from '../common/utils/image-url.util';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async tree() {
    const categorias = await this.prisma.categoria.findMany({
      where: { activa: true, parentId: null },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        hijos: {
          where: { activa: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
      },
    });

    return categorias.map((categoria) => ({
      ...categoria,
      imagenUrl: ImageUrlUtil.getCategoryImageUrl(categoria.imagen),
      hijos: categoria.hijos.map((hijo) => ({
        ...hijo,
        imagenUrl: ImageUrlUtil.getCategoryImageUrl(hijo.imagen),
      })),
    }));
  }

  async bySlug(slug: string) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { slug },
    });
    if (!categoria) return null;

    return {
      ...categoria,
      imagenUrl: ImageUrlUtil.getCategoryImageUrl(categoria.imagen),
    };
  }

  /**
   * Obtiene el conteo de categorías hijas para una categoría padre
   */
  async getChildrenCount(parentId: string): Promise<number> {
    return await this.prisma.categoria.count({
      where: {
        parentId: Number(parentId),
        activa: true,
      },
    });
  }

  /**
   * Obtiene conteos de hijos para múltiples categorías padre
   */
  async getMultipleChildrenCounts(
    parentIds: string[],
  ): Promise<Record<string, number>> {
    const counts = await this.prisma.categoria.groupBy({
      by: ['parentId'],
      where: {
        parentId: { in: parentIds.map(id => Number(id)) },
        activa: true,
      },
      _count: {
        id: true,
      },
    });

    const result: Record<string, number> = {};
    parentIds.forEach((id) => {
      result[id] = 0; // Inicializar con 0
    });

    counts.forEach((count) => {
      if (count.parentId) {
        result[count.parentId] = count._count.id;
      }
    });

    return result;
  }

  /**
   * Obtiene categorías con sus conteos de hijos
   */
  async getWithChildrenCounts() {
    const categorias = await this.prisma.categoria.findMany({
      where: { activa: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        _count: {
          select: {
            hijos: {
              where: { activa: true },
            },
          },
        },
      },
    });

    return categorias.map((categoria) => ({
      ...categoria,
      imagenUrl: ImageUrlUtil.getCategoryImageUrl(categoria.imagen),
      childrenCount: categoria._count.hijos,
    }));
  }
}
