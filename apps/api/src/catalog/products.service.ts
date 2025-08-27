import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Producto } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductDto } from './dto/query-product.dto';
import { getSkipTake } from '../common/utils/pagination';

function mapSort(sort: string | undefined): Prisma.ProductoOrderByWithRelationInput[] {
  switch (sort) {
    case 'novedades':   return [{ creadoEn: 'desc' }];
    case 'precio_asc':  return [{ precio: 'asc' }];
    case 'precio_desc': return [{ precio: 'desc' }];
    case 'rating_desc': return [{ ratingProm: 'desc' }, { ratingConteo: 'desc' }, { creadoEn: 'desc' }];
    case 'relevancia':
    default:
      // si hay q → prioridad a titulo; si no, destacado/reciente
      return [{ destacado: 'desc' }, { creadoEn: 'desc' }];
  }
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: QueryProductDto) {
    const { page, perPage, q, marca, categoria, minPrice, maxPrice, sort } = dto;
    const { skip, take } = getSkipTake(page, perPage);

    // Resolver marca/categoría como slug o id
    let marcaId: string | undefined;
    if (marca) {
      const m = await this.prisma.marca.findFirst({ where: { OR: [{ id: marca }, { slug: marca }] } });
      marcaId = m?.id;
      if (!marcaId) return { items: [], meta: { total: 0, page, perPage } };
    }

    let categoriaId: string | undefined;
    if (categoria) {
      const c = await this.prisma.categoria.findFirst({ where: { OR: [{ id: categoria }, { slug: categoria }] } });
      categoriaId = c?.id;
      if (!categoriaId) return { items: [], meta: { total: 0, page, perPage } };
    }

    const priceFilter =
    minPrice != null || maxPrice != null
        ? { gte: minPrice ?? 0, ...(maxPrice != null ? { lte: maxPrice } : {}) }
        : undefined;

    const where: Prisma.ProductoWhereInput = {
        publicado: true,
        ...(q ? { titulo: { contains: q } } : {}),
        ...(marcaId ? { marcaId } : {}),
        ...(categoriaId ? { categoriaId } : {}),
        ...(priceFilter ? { precio: priceFilter } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        orderBy: mapSort(q ? 'relevancia' : sort),
        skip, take,
        include: {
          marca: true,
          categoria: true,
          imagenes: { orderBy: { orden: 'asc' }, take: 10 },
          resenas: false,
        },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, perPage, pages: Math.ceil(total / perPage!) },
    };
  }

  async facets(dto: QueryProductDto) {
    const { q, categoria, marca, minPrice, maxPrice } = dto;

    // base where sin marca/categoría (para facetear cada dimensión)
    const baseWhere: Prisma.ProductoWhereInput = {
      publicado: true,
      ...(q ? { titulo: { contains: q } } : {}),
      ...(minPrice != null || maxPrice != null
        ? { precio: { gte: minPrice ?? 0, lte: maxPrice ?? undefined } }
        : {}),
    };

    // filtrar por categoría para facetear marcas
    let whereForBrands: Prisma.ProductoWhereInput = { ...baseWhere };
    if (categoria) {
      const c = await this.prisma.categoria.findFirst({ where: { OR: [{ id: categoria }, { slug: categoria }] } });
      if (c) whereForBrands.categoriaId = c.id; else whereForBrands.categoriaId = '__none__';
    }

    // filtrar por marca para facetear categorías
    let whereForCategories: Prisma.ProductoWhereInput = { ...baseWhere };
    if (marca) {
      const m = await this.prisma.marca.findFirst({ where: { OR: [{ id: marca }, { slug: marca }] } });
      if (m) whereForCategories.marcaId = m.id; else whereForCategories.marcaId = '__none__';
    }

    const byBrand = await this.prisma.producto.groupBy({
      by: ['marcaId'],
      where: whereForBrands,
      _count: { _all: true },
    });
    const brandIds = byBrand.map(b => b.marcaId).filter(Boolean) as string[];
    const brands = brandIds.length
      ? await this.prisma.marca.findMany({ where: { id: { in: brandIds } } })
      : [];

    const brandFacets = byBrand
      .filter(b => !!b.marcaId)
      .map(b => ({
        id: b.marcaId!,
        nombre: brands.find(x => x.id === b.marcaId)?.nombre ?? 'Desconocida',
        slug: brands.find(x => x.id === b.marcaId)?.slug ?? '',
        count: b._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const byCategory = await this.prisma.producto.groupBy({
      by: ['categoriaId'],
      where: whereForCategories,
      _count: { _all: true },
    });
    const categoryIds = byCategory.map(c => c.categoriaId).filter(Boolean) as string[];
    const categories = categoryIds.length
      ? await this.prisma.categoria.findMany({ where: { id: { in: categoryIds } } })
      : [];

    const categoryFacets = byCategory
      .filter(c => !!c.categoriaId)
      .map(c => ({
        id: c.categoriaId!,
        nombre: categories.find(x => x.id === c.categoriaId)?.nombre ?? 'Sin categoría',
        slug: categories.find(x => x.id === c.categoriaId)?.slug ?? '',
        count: c._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return { marcas: brandFacets, categorias: categoryFacets };
  }

  async bySlug(slug: string) {
    const item = await this.prisma.producto.findFirst({
      where: { slug, publicado: true },
      include: {
        marca: true,
        categoria: true,
        imagenes: { orderBy: { orden: 'asc' } },
        resenas: {
          take: 4,
          orderBy: { creadoEn: 'desc' },
          include: { Usuario: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException('Producto no encontrado');

    // FUTURO: si agregás "especificaciones Json?" al modelo, podés exponerlo aquí.
    return item;
  }
}
