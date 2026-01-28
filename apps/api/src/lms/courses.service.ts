import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  EstadoInscripcion,
  NivelCurso,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryCourseDto } from './dto/query-course.dto';
import { getSkipTake } from '../common/utils/pagination';
import { ImageUrlUtil } from '../common/utils/image-url.util';

function mapSort(sort?: string): Prisma.CursoOrderByWithRelationInput[] {
  switch (sort) {
    case 'novedades':
      return [{ creadoEn: 'desc' }];
    case 'precio_asc':
      return [{ precio: 'asc' }];
    case 'precio_desc':
      return [{ precio: 'desc' }];
    case 'rating_desc':
      return [
        { ratingProm: 'desc' },
        { ratingConteo: 'desc' },
        { creadoEn: 'desc' },
      ];
    case 'relevancia':
    default:
      return [{ destacado: 'desc' }, { creadoEn: 'desc' }];
  }
}

const activeEnrollmentStates: EstadoInscripcion[] = [
  EstadoInscripcion.ACTIVADA,
  EstadoInscripcion.PAUSADA,
].map((state) => state.toUpperCase() as EstadoInscripcion);

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

    const where = {
      publicado: true,
      ...(q
        ? {
            OR: [{ titulo: { contains: q } }, { resumen: { contains: q } }],
          }
        : {}),
      ...(nivel ? { nivel: nivel as any } : {}),
      ...(priceFilter ? { precio: priceFilter } : {}),
    } satisfies Prisma.CursoWhereInput;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.curso.findMany({
        where,
        orderBy: mapSort(q ? 'relevancia' : sort),
        skip,
        take,
        select: {
          id: true,
          slug: true,
          titulo: true,
          nivel: true,
          precio: true,
          portada: true,
          resumen: true,
          destacado: true,
          ratingProm: true,
          ratingConteo: true,
          instructor: { select: { id: true, nombre: true } },
          _count: { select: { modulos: true, resenas: true } },
          modulos: {
            select: {
              lecciones: {
                select: { id: true, duracionS: true },
              },
            },
          },
        },
      }),
      this.prisma.curso.count({ where }),
    ]);

    // Transformar los datos para incluir URLs de imagen y cálculos
    const transformedItems = items.map((item) => {
      const totalLessons = item.modulos.reduce(
        (acc, mod) => acc + mod.lecciones.length,
        0,
      );
      const totalDurationS = item.modulos.reduce(
        (acc, mod) =>
          acc + mod.lecciones.reduce((sum, l) => sum + (l.duracionS || 0), 0),
        0,
      );

      // Eliminamos modulos de la respuesta final para no sobrecargar el payload
      const { modulos, ...rest } = item;

      return {
        ...rest,
        portadaUrl: ImageUrlUtil.getCourseImageUrl(item.portada),
        totalLessons,
        totalDuration: totalDurationS,
      };
    });

    return {
      items: transformedItems,
      meta: { total, page, perPage, pages: Math.ceil(total / perPage!) },
    };
  }

  async facets(dto: QueryCourseDto) {
    const { q, minPrice, maxPrice } = dto;

    const baseWhere: Prisma.CursoWhereInput = {
      publicado: true,
      ...(q
        ? { OR: [{ titulo: { contains: q } }, { resumen: { contains: q } }] }
        : {}),
      ...(minPrice != null || maxPrice != null
        ? { precio: { gte: minPrice ?? 0, lte: maxPrice ?? undefined } }
        : {}),
    };

    const byLevel = await this.prisma.curso.groupBy({
      by: ['nivel'],
      where: baseWhere,
      _count: { _all: true },
    });

    const niveles = [
      NivelCurso.BASICO,
      NivelCurso.INTERMEDIO,
      NivelCurso.AVANZADO,
    ] as const;
    const nivelFacets = niveles.map((n) => ({
      nivel: n,
      count: byLevel.find((x) => x.nivel === n)?._count._all ?? 0,
    }));

    return { niveles: nivelFacets };
  }

  async bySlug(slug: string) {
    // Primero verificar que el curso existe
    const cursoBase = await this.prisma.curso.findFirst({
      where: { slug, publicado: true },
      select: {
        id: true,
        slug: true,
        titulo: true,
        resumen: true,
        descripcionMD: true,
        requisitos: true,
        nivel: true,
        precio: true,
        portada: true,
        destacado: true,
        ratingProm: true,
        ratingConteo: true,
        publicado: true,
        creadoEn: true,
        instructorId: true,
        tags: true,
      },
    });

    if (!cursoBase) throw new NotFoundException('Curso no encontrado');

    // Carga paralela de datos relacionados
    const [instructor, resenas, modulos, estudiantesCount] = await Promise.all([
      // Instructor
      this.prisma.usuario.findUnique({
        where: { id: Number(cursoBase.instructorId || '0') },
        select: { id: true, nombre: true },
      }),

      // Reseñas recientes
      this.prisma.resena.findMany({
        where: { cursoId: cursoBase.id },
        take: 4,
        orderBy: { creadoEn: 'desc' },
        include: { usuario: { select: { id: true, nombre: true } } },
      }),

      // Módulos con lecciones
      this.prisma.modulo
        .findMany({
          where: { cursoId: cursoBase.id },
          orderBy: { orden: 'asc' },
          include: {
            lecciones: {
              orderBy: { orden: 'asc' },
              select: {
                id: true,
                titulo: true,
                duracionS: true,
                orden: true,
                rutaSrc: true,
                tipo: true,
                descripcion: true,
                contenido: true,
              },
            },
          },
        })
        .then((modulos) =>
          modulos.map((modulo) => ({
            ...modulo,
            lecciones: modulo.lecciones.map((leccion, index) => {
              // Si tiene rutaSrc válida, es VIDEO (URLs completas o archivos locales)
              const tieneRutaSrc =
                leccion.rutaSrc &&
                leccion.rutaSrc.trim() !== '' &&
                (leccion.rutaSrc.startsWith('http://') ||
                  leccion.rutaSrc.startsWith('https://') ||
                  leccion.rutaSrc.endsWith('.mp4') ||
                  leccion.rutaSrc.endsWith('.webm') ||
                  leccion.rutaSrc.endsWith('.mov') ||
                  leccion.rutaSrc.endsWith('.avi'));

              if (tieneRutaSrc) {
                return { ...leccion, tipo: 'VIDEO' };
              }

              // PRIORIDAD 1: Si tiene contenido real en la BD, usarlo SIEMPRE
              if (
                leccion.contenido &&
                (typeof leccion.contenido === 'object' ||
                  typeof leccion.contenido === 'string')
              ) {
                return {
                  ...leccion,
                  // El tipo ya viene de la BD, mantenerlo
                  tipo: leccion.tipo || 'TEXTO',
                };
              }

              return {
                ...leccion,
              };
            }),
          })),
        ),

      // Conteo de estudiantes inscritos
      this.prisma.inscripcion.count({
        where: {
          cursoId: cursoBase.id,
          estado: {
            in: activeEnrollmentStates,
          },
        },
      }),
    ]);

    // Duración total calculada (en segundos)
    const duracionTotalS = modulos.reduce(
      (acc, m) => acc + m.lecciones.reduce((a, l) => a + (l.duracionS ?? 0), 0),
      0,
    );

    // Combinar todos los datos y transformar imagen
    const curso = {
      ...cursoBase,
      portadaUrl: ImageUrlUtil.getCourseImageUrl(cursoBase.portada),
      instructor,
      resenas,
      modulos,
      estudiantesCount,
    };

    return { ...curso, duracionTotalS };
  }

  async getCourseContentForUser(slug: string, userId: string) {
    // Verificar que el curso existe
    const curso = await this.prisma.curso.findFirst({
      where: { slug, publicado: true },
      select: { id: true, titulo: true, slug: true },
    });

    if (!curso) {
      throw new NotFoundException('Curso no encontrado');
    }

    // Verificar que el usuario tiene una inscripción válida
    const inscripcion = await this.prisma.inscripcion.findFirst({
      where: {
        usuarioId: parseInt(userId),
        cursoId: curso.id,
        estado: {
          in: activeEnrollmentStates,
        },
      },
      select: {
        id: true,
        estado: true,
        progreso: true,
        creadoEn: true,
      },
    });

    if (!inscripcion) {
      throw new ForbiddenException(
        'No tienes acceso a este curso. Debes estar inscrito para ver el contenido.',
      );
    }

    // Si tiene acceso válido, devolver el contenido completo del curso
    return this.bySlug(slug);
  }
}
