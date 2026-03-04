import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartItemDto } from './dto/sync-cart.dto';
import { TipoItemOrden } from '@prisma/client';
import { ImageUrlUtil } from '../common/utils/image-url.util';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    let cart = await this.prisma.carrito.findUnique({
      where: { usuarioId: userId },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                titulo: true,
                precio: true,
                descuento: true,
                slug: true,
                imagen: true,
                imagenes: true, // Agregado para soportar fallback de imágenes
                stock: true,
              },
            },
            curso: {
              select: {
                id: true,
                titulo: true,
                precio: true,
                descuento: true,
                slug: true,
                portada: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.carrito.create({
        data: { usuarioId: userId },
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  titulo: true,
                  precio: true,
                  descuento: true,
                  slug: true,
                  imagen: true,
                  imagenes: true,
                  stock: true,
                },
              },
              curso: {
                select: {
                  id: true,
                  titulo: true,
                  precio: true,
                  descuento: true,
                  slug: true,
                  portada: true,
                },
              },
            },
          },
        },
      });
    }

    return this.mapCart(cart);
  }

  async syncCart(userId: number, items: CartItemDto[]) {
    try {
      console.log(
        `[CartService] Syncing ${items?.length ?? 0} items for user ${userId}`,
      );

      // 0. Validación defensiva
      if (!items || !Array.isArray(items)) {
        return this.getCart(userId);
      }

      // 1. Asegurar carrito existe (Atomic UPSERT para evitar race conditions)
      const cart = await this.prisma.carrito.upsert({
        where: { usuarioId: userId },
        create: { usuarioId: userId },
        update: {}, // No-op si existe
      });

      // 2. Procesar items (Estrategia: Mirroring / Full Sync)
      // El frontend manda el estado "verdad", así que debemos borrar lo que no venga en 'items'

      // a) Recolectar IDs válidos del payload para preservarlos
      const validProductIds: number[] = [];
      const validCourseIds: number[] = [];

      // Normalizar items de entrada para tener IDs resueltos antes de borrar nada
      const itemsToProcess = [];

      for (const item of items) {
        // Resolver IDs (pueden venir como número, string numérico o slug)
        let productoId: number | null = null;
        if (item.productoId) {
          const pid = item.productoId;
          if (typeof pid === 'number') {
            productoId = pid;
          } else if (!isNaN(Number(pid))) {
            productoId = Number(pid);
          } else {
            // Es un slug
            const p = await this.prisma.producto.findFirst({
              where: { slug: String(pid) },
              select: { id: true },
            });
            productoId = p?.id || null;
          }
        }

        let cursoId: number | null = null;
        if (item.cursoId) {
          const cid = item.cursoId;
          if (typeof cid === 'number') {
            cursoId = cid;
          } else if (!isNaN(Number(cid))) {
            cursoId = Number(cid);
          } else {
            // Es un slug
            const c = await this.prisma.curso.findFirst({
              where: { slug: String(cid) },
              select: { id: true },
            });
            cursoId = c?.id || null;
          }
        }

        if (productoId) validProductIds.push(productoId);
        if (cursoId) validCourseIds.push(cursoId);

        // Guardamos item normalizado para el paso de upsert
        itemsToProcess.push({ original: item, productoId, cursoId });
      }

      // b) Borrar items de la DB que NO están en el payload (Pruning)
      // Borramos productos que no estén en validProductIds
      await this.prisma.itemCarrito.deleteMany({
        where: {
          carritoId: cart.id,
          tipo: TipoItemOrden.PRODUCTO,
          productoId: { notIn: validProductIds },
        },
      });

      // Borramos cursos que no estén en validCourseIds
      await this.prisma.itemCarrito.deleteMany({
        where: {
          carritoId: cart.id,
          tipo: TipoItemOrden.CURSO,
          cursoId: { notIn: validCourseIds },
        },
      });

      // c) Upsert de los items válidos
      for (const { original: item, productoId, cursoId } of itemsToProcess) {
        try {
          const tipo =
            item.tipo?.toLowerCase() === 'producto'
              ? TipoItemOrden.PRODUCTO
              : TipoItemOrden.CURSO;

          if (!productoId && !cursoId) continue;

          // Buscar si existe (por combinación única)
          const whereClause: any = {
             carritoId: cart.id,
             tipo,
          };
          if (productoId) whereClause.productoId = productoId;
          if (cursoId) whereClause.cursoId = cursoId;

          const existingItem = await this.prisma.itemCarrito.findFirst({
            where: whereClause
          });

          if (existingItem) {
            await this.prisma.itemCarrito.update({
              where: { id: existingItem.id },
              data: { cantidad: item.cantidad },
            });
          } else {
            await this.prisma.itemCarrito.create({
              data: {
                carritoId: cart.id,
                tipo,
                productoId,
                cursoId,
                cantidad: item.cantidad,
              },
            });
          }
        } catch (error) {
          console.error(`[CartService] Error processing item upsert:`, item, error);
        }
      }

      return this.getCart(userId);
    } catch (error) {
      console.error(`[CartService] Critical error in syncCart:`, error);
      // Fallback: intentar devolver el carrito actual aunque la sincronización fallara
      // o relanzar si es crítico. Preferimos no romper la app del usuario.
      try {
        return await this.getCart(userId);
      } catch (innerError) {
        // Si incluso getCart falla, entonces sí lanzamos 500
        throw error;
      }
    }
  }

  async updateItem(userId: number, item: CartItemDto) {
    return this.syncCart(userId, [item]);
  }

  async removeItem(userId: number, type: 'producto' | 'curso', refId: number) {
    const cart = await this.prisma.carrito.findUnique({
      where: { usuarioId: userId },
    });
    if (!cart) return this.getCart(userId);

    const tipo = type === 'producto' ? ('PRODUCTO' as any) : ('CURSO' as any);

    await this.prisma.itemCarrito.deleteMany({
      where: {
        carritoId: cart.id,
        tipo,
        [type === 'producto' ? 'productoId' : 'cursoId']: refId,
      },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.carrito.findUnique({
      where: { usuarioId: userId },
    });
    if (cart) {
      await this.prisma.itemCarrito.deleteMany({
        where: { carritoId: cart.id },
      });
    }
    return { items: [] };
  }

  private mapCart(cart: any) {
    if (!cart || !cart.items) return cart;

    // Mapear imágenes para que el frontend reciba rutas relativas válidas (/uploads/...)
    cart.items = cart.items.map((item: any) => {
      if (item.producto) {
        // Asegurar que imagen tenga la ruta completa
        if (item.producto.imagen && !item.producto.imagen.startsWith('/')) {
          item.producto.imagen = ImageUrlUtil.getProductImageUrl(
            item.producto.imagen,
          );
        }

        if (Array.isArray(item.producto.imagenes)) {
          item.producto.imagenes = item.producto.imagenes.map((img: any) => ({
            ...img,
            url: img.url || ImageUrlUtil.getProductGalleryImageUrl(img.archivo),
          }));
        }

        // Fallback: si 'imagen' es null pero hay 'imagenes', poblar 'imagen'
        if (!item.producto.imagen && item.producto.imagenes?.length > 0) {
          item.producto.imagen = item.producto.imagenes[0].url;
        }
      }
      if (item.curso) {
        if (item.curso.portada && !item.curso.portada.startsWith('/')) {
          item.curso.portada = ImageUrlUtil.getCourseImageUrl(
            item.curso.portada,
          );
        }
      }
      return item;
    });

    return cart;
  }
}
