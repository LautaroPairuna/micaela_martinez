import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Producto } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { QueryProductDto } from './dto/query-product.dto';
import { getSkipTake } from '../common/utils/pagination';
import { ImageUrlUtil } from '../common/utils/image-url.util';

function mapSort(
  sort: string | undefined,
): Prisma.ProductoOrderByWithRelationInput[] {
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
      // si hay q → prioridad a titulo; si no, destacado/reciente
      return [{ destacado: 'desc' }, { creadoEn: 'desc' }];
  }
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async list(dto: QueryProductDto) {
    // ✅ Implementar caché para consultas de productos del catálogo
    const cacheKey = this.cacheService.generateCatalogKey(
      dto.page || 1,
      dto.perPage || 12,
      dto.q,
      dto.marca,
      dto.categoria,
      dto.minPrice,
      dto.maxPrice,
      dto.sort,
    );

    // Intentar obtener del caché primero
    const cachedResult = this.cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const { page, perPage, q, marca, categoria, minPrice, maxPrice, sort } =
      dto;
    const { skip, take } = getSkipTake(page, perPage);

    // Resolver marca/categoría como slug o id
    let marcaId: number | undefined;
    if (marca) {
      const or: Prisma.MarcaWhereInput[] = [{ slug: marca }];
      const num = Number(marca);
      if (Number.isFinite(num)) {
        or.unshift({ id: num });
      }
      const m = await this.prisma.marca.findFirst({
        where: { OR: or },
      });
      marcaId = m?.id;
      if (!marcaId) return { items: [], meta: { total: 0, page, perPage } };
    }

    let categoriaId: number | undefined;
    if (categoria) {
      const or: Prisma.CategoriaWhereInput[] = [{ slug: categoria }];
      const num = Number(categoria);
      if (Number.isFinite(num)) {
        or.unshift({ id: num });
      }
      const c = await this.prisma.categoria.findFirst({
        where: { OR: or },
      });
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
        skip,
        take,
        include: {
          marca: true,
          categoria: true,
          imagenes: { orderBy: { orden: 'asc' }, take: 10 },
          resenas: false,
        },
      }),
      this.prisma.producto.count({ where }),
    ]);

    // Transformar los datos para incluir URLs de imagen
    const transformedItems = items.map((item) => ({
      ...item,
      imagenUrl: ImageUrlUtil.getProductImageUrl(item.imagen),
      marca: item.marca
        ? {
            ...item.marca,
            imagenUrl: ImageUrlUtil.getBrandImageUrl(item.marca.imagen),
          }
        : null,
      categoria: item.categoria
        ? {
            ...item.categoria,
            imagenUrl: ImageUrlUtil.getCategoryImageUrl(item.categoria.imagen),
          }
        : null,
      imagenes: item.imagenes
        .filter(
          (img) =>
            typeof img.archivo === 'string' && img.archivo.trim().length > 0,
        )
        .map((img) => ({
          ...img,
          url: ImageUrlUtil.getProductGalleryImageUrl(img.archivo),
        })),
    }));

    const result = {
      items: transformedItems,
      meta: { total, page, perPage, pages: Math.ceil(total / perPage!) },
    };


    // ✅ Guardar resultado en caché (TTL: 5 minutos para catálogo público)
    this.cacheService.set(cacheKey, result, 300000);

    return result;
  }

  async facets(dto: QueryProductDto) {
    const { q, categoria, marca, minPrice, maxPrice } = dto;

    // base where sin marca/categoría (para facetear cada dimensión)
    const priceFilterFacets =
      minPrice != null || maxPrice != null
        ? { gte: minPrice ?? 0, ...(maxPrice != null ? { lte: maxPrice } : {}) }
        : undefined;

    const baseWhere: Prisma.ProductoWhereInput = {
      publicado: true,
      ...(q ? { titulo: { contains: q } } : {}),
      ...(priceFilterFacets ? { precio: priceFilterFacets } : {}),
    };

    // filtrar por categoría para facetear marcas
    const whereForBrands: Prisma.ProductoWhereInput = { ...baseWhere };
    if (categoria) {
      const or: Prisma.CategoriaWhereInput[] = [{ slug: categoria }];
      const num = Number(categoria);
      if (Number.isFinite(num)) {
        or.unshift({ id: num });
      }
      const c = await this.prisma.categoria.findFirst({
        where: { OR: or },
      });
      if (c) whereForBrands.categoriaId = c.id;
      else whereForBrands.categoriaId = -1; // Usando -1 en lugar de '__none__'
    }

    // filtrar por marca para facetear categorías
    const whereForCategories: Prisma.ProductoWhereInput = { ...baseWhere };
    if (marca) {
      const or: Prisma.MarcaWhereInput[] = [{ slug: marca }];
      const num = Number(marca);
      if (Number.isFinite(num)) {
        or.unshift({ id: num });
      }
      const m = await this.prisma.marca.findFirst({
        where: { OR: or },
      });
      if (m) whereForCategories.marcaId = m.id;
      else whereForCategories.marcaId = -1; // Usando -1 en lugar de '__none__'
    }


    const byBrand = await this.prisma.producto.groupBy({
      by: ['marcaId'],
      where: whereForBrands,
      _count: { _all: true },
    });
    const brandIds = byBrand.map((b) => b.marcaId).filter(Boolean) as number[];
    const brands = brandIds.length
      ? await this.prisma.marca.findMany({ where: { id: { in: brandIds } } })
      : [];

    const brandFacets = byBrand
      .filter((b) => !!b.marcaId)
      .map((b) => ({
        id: b.marcaId!,
        nombre: brands.find((x) => x.id === b.marcaId)?.nombre ?? 'Desconocida',
        slug: brands.find((x) => x.id === b.marcaId)?.slug ?? '',
        count: b._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const byCategory = await this.prisma.producto.groupBy({
      by: ['categoriaId'],
      where: whereForCategories,
      _count: { _all: true },
    });
    const categoryIds = byCategory
      .map((c) => c.categoriaId)
      .filter(Boolean) as number[];
    const categories = categoryIds.length
      ? await this.prisma.categoria.findMany({
          where: { id: { in: categoryIds } },
        })
      : [];

    const categoryFacets = byCategory
      .filter((c) => !!c.categoriaId)
      .map((c) => ({
        id: c.categoriaId!,
        nombre:
          categories.find((x) => x.id === c.categoriaId)?.nombre ??
          'Sin categoría',
        slug: categories.find((x) => x.id === c.categoriaId)?.slug ?? '',
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
          include: { usuario: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException('Producto no encontrado');

    // Transformar los datos para incluir URLs de imagen
    const transformedItem = {
      ...item,
      imagenUrl: ImageUrlUtil.getProductImageUrl(item.imagen),
      marca: item.marca
        ? {
            ...item.marca,
            imagenUrl: ImageUrlUtil.getBrandImageUrl(item.marca.imagen),
          }
        : null,
      categoria: item.categoria
        ? {
            ...item.categoria,
            imagenUrl: ImageUrlUtil.getCategoryImageUrl(item.categoria.imagen),
          }
        : null,
      imagenes: item.imagenes.map((img) => ({
        ...img,
        url: ImageUrlUtil.getProductGalleryImageUrl(img.archivo),
      })),
    };

    return transformedItem;
  }
}
