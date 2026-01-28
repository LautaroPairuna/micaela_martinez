import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSliderDto } from './dto/create-slider.dto';
import { UpdateSliderDto } from './dto/update-slider.dto';

@Injectable()
export class HeroService {
  constructor(private prisma: PrismaService) {}

  async getActiveImages() {
    const images = await this.prisma.slider.findMany({
      where: { activa: true },
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        titulo: true,
        alt: true,
        archivo: true,

        subtitulo: true,
        descripcion: true,
        etiqueta: true,

        ctaPrimarioTexto: true,
        ctaPrimarioHref: true,
        ctaSecundarioTexto: true,
        ctaSecundarioHref: true,

        activa: true,
        orden: true,
      },
    });

    return images.map((img) => ({
      ...img,
      src: `/api/hero/image/${encodeURIComponent(img.archivo)}`,
    }));
  }

  async getAllImages() {
    return this.prisma.slider.findMany({
      orderBy: { orden: 'asc' },
    });
  }

  async createImage(data: CreateSliderDto) {
    return this.prisma.slider.create({ data });
  }

  async updateImage(id: string, data: UpdateSliderDto) {
    return this.prisma.slider.update({
      where: { id: Number(id) },
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.slider.findUnique({
      where: { id: Number(id) },
    });
  }

  async deleteImage(id: string) {
    return this.prisma.slider.delete({
      where: { id: Number(id) },
    });
  }
}
