import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUrlUtil } from '../common/utils/image-url.util';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const categorias = await this.prisma.categoria.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
    });

    return categorias.map((categoria) => ({
      ...categoria,
      imagenUrl: ImageUrlUtil.getCategoryImageUrl(categoria.imagen),
    }));
  }

  // @deprecated: Mantengo alias por si acaso, pero ya no hay árbol
  async tree() {
    return this.list();
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
}
