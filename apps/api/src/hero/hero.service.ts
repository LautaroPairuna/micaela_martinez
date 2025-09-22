import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HeroService {
  constructor(private prisma: PrismaService) {}

  async getActiveImages() {
    const images = await this.prisma.slider.findMany({
      where: {
        activa: true,
      },
      orderBy: {
        orden: 'asc',
      },
      select: {
        id: true,
        titulo: true,
        alt: true,
        archivo: true,
        orden: true,
      },
    });

    // Devolver solo los datos, el frontend construirá las URLs
    return images;
  }

  async getAllImages() {
    return this.prisma.slider.findMany({
      orderBy: {
        orden: 'asc',
      },
    });
  }

  async createImage(data: {
    titulo: string;
    alt: string;
    archivo: string;
    orden?: number;
  }) {
    return this.prisma.slider.create({
      data,
    });
  }

  async updateImage(
    id: string,
    data: {
      titulo?: string;
      alt?: string;
      archivo?: string;
      activa?: boolean;
      orden?: number;
    },
  ) {
    return this.prisma.slider.update({
      where: { id },
      data,
    });
  }

  async deleteImage(id: string) {
    return this.prisma.slider.delete({
      where: { id },
    });
  }
}
