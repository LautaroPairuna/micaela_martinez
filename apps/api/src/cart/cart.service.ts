import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartItemDto } from './dto/sync-cart.dto';
import { TipoItemOrden } from '@prisma/client';

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
                slug: true,
                imagen: true,
                stock: true,
              },
            },
            curso: {
              select: {
                id: true,
                titulo: true,
                precio: true,
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
        include: { items: { include: { producto: true, curso: true } } },
      });
    }

    return this.mapCart(cart);
  }

  async syncCart(userId: number, items: CartItemDto[]) {
    console.log(`[CartService] Syncing ${items.length} items for user ${userId}`);
    // 1. Asegurar carrito existe
    let cart = await this.prisma.carrito.findUnique({ where: { usuarioId: userId } });
    if (!cart) {
      console.log(`[CartService] Creating new cart for user ${userId}`);
      cart = await this.prisma.carrito.create({ data: { usuarioId: userId } });
    }

    // 2. Procesar items (Merge Strategy: Local adds to DB, existing updates quantity)
    // Primero, limpieza de items inválidos (ghost items)
    await this.prisma.itemCarrito.deleteMany({
      where: {
        carritoId: cart.id,
        productoId: null,
        cursoId: null,
      },
    });

    for (const item of items) {
      try {
        const tipo = item.tipo === 'producto' ? TipoItemOrden.PRODUCTO : TipoItemOrden.CURSO;
        
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
            const p = await this.prisma.producto.findFirst({ where: { slug: String(pid) }, select: { id: true } });
            productoId = p?.id || null;
            if (!productoId) console.warn(`[CartService] Product slug not found: ${pid}`);
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
            const c = await this.prisma.curso.findFirst({ where: { slug: String(cid) }, select: { id: true } });
            cursoId = c?.id || null;
            if (!cursoId) console.warn(`[CartService] Course slug not found: ${cid}`);
          }
        }

        // Validación estricta: evitar items sin referencia
        if (tipo === TipoItemOrden.PRODUCTO && !productoId) {
          console.warn(`[CartService] Skipping invalid product item (no ID):`, item);
          continue;
        }
        if (tipo === TipoItemOrden.CURSO && !cursoId) {
          console.warn(`[CartService] Skipping invalid course item (no ID):`, item);
          continue;
        }

        console.log(`[CartService] Processing item: ${tipo} (Prod: ${productoId}, Course: ${cursoId}, Qty: ${item.cantidad})`);

        const existingItem = await this.prisma.itemCarrito.findFirst({
          where: {
            carritoId: cart.id,
            tipo,
            productoId,
            cursoId,
          },
        });

        if (existingItem) {
          console.log(`[CartService] Updating existing item ${existingItem.id}`);
          // Actualizamos con la cantidad que viene del frontend (asumimos que es la "verdad" actual del usuario)
          await this.prisma.itemCarrito.update({
            where: { id: existingItem.id },
            data: { cantidad: item.cantidad },
          });
        } else {
          console.log(`[CartService] Creating new item`);
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
        console.error(`[CartService] Error processing item:`, item, error);
      }
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, item: CartItemDto) {
    return this.syncCart(userId, [item]);
  }

  async removeItem(userId: number, type: 'producto' | 'curso', refId: number) {
    const cart = await this.prisma.carrito.findUnique({ where: { usuarioId: userId } });
    if (!cart) return this.getCart(userId);

    const tipo = type === 'producto' ? TipoItemOrden.PRODUCTO : TipoItemOrden.CURSO;

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
    const cart = await this.prisma.carrito.findUnique({ where: { usuarioId: userId } });
    if (cart) {
      await this.prisma.itemCarrito.deleteMany({ where: { carritoId: cart.id } });
    }
    return { items: [] };
  }

  private mapCart(cart: any) {
    // Mapear estructura plana para facilitar frontend si es necesario
    // Pero por ahora devolveremos la estructura DB enriquecida
    return cart;
  }
}
