import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUrlUtil } from '../common/utils/image-url.util';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const marcas = await this.prisma.marca.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
    });

    return marcas.map((marca) => ({
      ...marca,
      imagenUrl: ImageUrlUtil.getBrandImageUrl(marca.imagen),
    }));
  }

  async bySlug(slug: string) {
    const marca = await this.prisma.marca.findFirst({ where: { slug } });
    if (!marca) return null;

    return {
      ...marca,
      imagenUrl: ImageUrlUtil.getBrandImageUrl(marca.imagen),
    };
  }
}
