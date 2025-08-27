import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  tree() {
    return this.prisma.categoria.findMany({
      where: { activa: true, parentId: null },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        hijos: {
          where: { activa: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
      },
    });
  }

  bySlug(slug: string) {
    return this.prisma.categoria.findFirst({ where: { slug } });
  }
}
