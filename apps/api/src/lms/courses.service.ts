import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, NivelCurso } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryCourseDto } from './dto/query-course.dto';
import { getSkipTake } from '../common/utils/pagination';

function mapSort(sort?: string): Prisma.CursoOrderByWithRelationInput[] {
  switch (sort) {
    case 'novedades':   return [{ creadoEn: 'desc' }];
    case 'precio_asc':  return [{ precio: 'asc' }];
    case 'precio_desc': return [{ precio: 'desc' }];
    case 'rating_desc': return [{ ratingProm: 'desc' }, { ratingConteo: 'desc' }, { creadoEn: 'desc' }];
    case 'relevancia':
    default:
      return [{ destacado: 'desc' }, { creadoEn: 'desc' }];
  }
}

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async list(dto: QueryCourseDto) {
    const { page, perPage, q, nivel, minPrice, maxPrice, sort } = dto;
    const { skip, take } = getSkipTake(page, perPage);

    const priceFilter =
        minPrice != null || maxPrice != null
            ? { gte: minPrice ?? 0, ...(maxPrice != null ? { lte: maxPrice } : {}) }
            : undefined;

    const where: Prisma.CursoWhereInput = {
        publicado: true,
        ...(q
            ? {
                OR: [
                { titulo: { contains: q } },
                { resumen: { contains: q } },
                ],
            }
            : {}),
        ...(nivel ? { nivel } : {}),
        ...(priceFilter ? { precio: priceFilter } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.curso.findMany({
        where,
        orderBy: mapSort(q ? 'relevancia' : sort),
        skip, take,
        select: {
          id: true, slug: true, titulo: true, nivel: true, precio: true,
          portadaUrl: true, resumen: true,
          ratingProm: true, ratingConteo: true,
          instructor: { select: { id: true, nombre: true } },
          _count: { select: { modulos: true, resenas: true } },
        },
      }),
      this.prisma.curso.count({ where }),
    ]);

    return { items, meta: { total, page, perPage, pages: Math.ceil(total / perPage!) } };
  }

  async facets(dto: QueryCourseDto) {
    const { q, minPrice, maxPrice } = dto;

    const baseWhere: Prisma.CursoWhereInput = {
      publicado: true,
      ...(q ? { OR: [
        { titulo: { contains: q } },
        { resumen: { contains: q } },
      ]} : {}),
      ...(minPrice != null || maxPrice != null
        ? { precio: { gte: minPrice ?? 0, lte: maxPrice ?? undefined } }
        : {}),
    };

    const byLevel = await this.prisma.curso.groupBy({
      by: ['nivel'],
      where: baseWhere,
      _count: { _all: true },
    });

    const niveles = ['BASICO','INTERMEDIO','AVANZADO'] as const;
    const nivelFacets = niveles.map(n => ({
      nivel: n,
      count: byLevel.find(x => x.nivel === n)?._count._all ?? 0,
    }));

    return { niveles: nivelFacets };
  }

  async bySlug(slug: string) {
    const curso = await this.prisma.curso.findFirst({
      where: { slug, publicado: true },
      include: {
        instructor: { select: { id: true, nombre: true } },
        resenas: {
          take: 4, orderBy: { creadoEn: 'desc' },
          include: { Usuario: { select: { id: true, nombre: true } } },
        },
        modulos: {
          orderBy: { orden: 'asc' },
          include: {
            lecciones: { orderBy: { orden: 'asc' }, select: { id: true, titulo: true, duracionS: true, orden: true, rutaSrc: true } },
          },
        },
      },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    // Duración total calculada (en segundos)
    const duracionTotalS = curso.modulos.reduce(
      (acc, m) => acc + m.lecciones.reduce((a, l) => a + (l.duracionS ?? 0), 0), 0);

    return { ...curso, duracionTotalS };
  }
}
