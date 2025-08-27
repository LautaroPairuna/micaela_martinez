import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.marca.findMany({ where: { activa: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] });
  }

  bySlug(slug: string) {
    return this.prisma.marca.findFirst({ where: { slug } });
  }
}
