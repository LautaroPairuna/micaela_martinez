// apps/api/src/admin/dashboard/admin-dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoOrden } from '@prisma/client';
import {
  DashboardSummaryDto,
  OrdersByStatusDto,
  DailyRevenuePointDto,
  LastOrderDto,
  RecentActivityItemDto,
} from './admin-dashboard.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<DashboardSummaryDto> {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ─────────────────────── Contadores básicos ───────────────────────
    const [
      totalUsers,
      totalCursos,
      totalProducts,
      totalOrders,
      newUsersToday,
      newOrdersToday,
      activeSubscriptions,
    ] = await this.prisma.$transaction([
      this.prisma.usuario.count(),
      this.prisma.curso.count(),
      this.prisma.producto.count(),
      this.prisma.orden.count(),

      // Usuarios creados hoy
      this.prisma.usuario.count({
        where: {
          creadoEn: { gte: startOfToday },
        },
      }),

      // Órdenes creadas hoy
      this.prisma.orden.count({
        where: {
          creadoEn: { gte: startOfToday },
        },
      }),

      // Suscripciones activas
      this.prisma.orden.count({
        where: {
          esSuscripcion: true,
          suscripcionActiva: true,
        },
      }),
    ]);

    // ─────────────────────── Órdenes por estado ───────────────────────
    const ordersByStatusRaw = await this.prisma.orden.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const ordersByStatus: OrdersByStatusDto = {};
    for (const row of ordersByStatusRaw) {
      const status = row.estado ?? 'DESCONOCIDO';
      const count = row._count._all ?? 0;
      ordersByStatus[status] = count;
    }

    // ─────────────────────── Facturación hoy / mes ───────────────────────
    // Usamos como "facturadas" las órdenes PAGADO + CUMPLIDO
    const paidStates: EstadoOrden[] = [
      EstadoOrden.PAGADO,
      EstadoOrden.CUMPLIDO,
    ];

    const [revenueTodayAgg, revenueMonthAgg] = await Promise.all([
      this.prisma.orden.aggregate({
        where: {
          estado: { in: paidStates },
          creadoEn: { gte: startOfToday },
        },
        _sum: { total: true },
      }),
      this.prisma.orden.aggregate({
        where: {
          estado: { in: paidStates },
          creadoEn: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
    ]);

    const totalRevenueToday = Number(revenueTodayAgg._sum.total ?? 0);
    const totalRevenueThisMonth = Number(revenueMonthAgg._sum.total ?? 0);

    // ─────────────────────── Serie últimos 7 días ───────────────────────
    const last7DaysRevenue: DailyRevenuePointDto[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
      );
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i + 1,
      );

      const agg = await this.prisma.orden.aggregate({
        where: {
          estado: { in: paidStates },
          creadoEn: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        _sum: { total: true },
      });

      last7DaysRevenue.push({
        date: this.formatIsoDateLocal(dayStart),
        total: Number(agg._sum.total ?? 0),
      });
    }

    // ─────────────────────── Últimas órdenes ───────────────────────
    const lastOrdersPrisma = await this.prisma.orden.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 5,
      include: {
        usuario: {
          select: {
            email: true,
            nombre: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    const lastOrders: LastOrderDto[] = lastOrdersPrisma.map((o) => ({
      id: o.id,
      estado: o.estado,
      total: o.total,
      moneda: o.moneda,
      creadoEn: o.creadoEn.toISOString(),
      usuarioEmail: o.usuario?.email ?? null,
      usuarioNombre: o.usuario?.nombre ?? null,
      itemsCount: o._count.items,
    }));

    // ─────────────────────── Actividad reciente (AuditLog) ───────────────────────
    const recentLogs = await this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
          },
        },
      },
    });

    const recentActivity: RecentActivityItemDto[] = await Promise.all(
      recentLogs.map(async (log) => {
        const recordNameFromAudit = this.extractRecordNameFromAuditLog(log);
        const recordName =
          this.normalizeTitle(recordNameFromAudit) ??
          (await this.getRecordDisplayName(log.tableName, log.recordId));

        return {
          id: log.id,
          type: this.mapLogType(log.tableName, log.action),
          message: this.buildLogMessage(
            log.tableName,
            log.action,
            log.recordId,
            recordName,
          ),
          createdAt: log.timestamp.toISOString(),
          actor: log.user?.nombre ?? log.user?.email ?? null,
          meta: {
            tableName: log.tableName,
            recordId: log.recordId,
            recordName,
            action: log.action,
            endpoint: log.endpoint,
            ipAddress: log.ipAddress,
          },
        };
      }),
    );

    // ─────────────────────── Resultado final ───────────────────────
    return {
      totalUsers,
      totalCursos,
      totalProducts,
      totalOrders,
      newUsersToday,
      newOrdersToday,
      activeSubscriptions,
      totalRevenueToday,
      totalRevenueThisMonth,
      ordersByStatus,
      last7DaysRevenue,
      lastOrders,
      recentActivity,
    };
  }

  // ─────────────────────── Helpers privados ───────────────────────

  private mapLogType(
    tableName: string,
    action: string,
  ): RecentActivityItemDto['type'] {
    const t = (tableName ?? '').toLowerCase();
    const a = (action ?? '').toLowerCase();

    if (t === 'orden') return 'order';
    if (t === 'producto') return 'product';
    if (t === 'curso') return 'course';
    if (t === 'usuario' && (a.includes('login') || a.includes('auth'))) {
      return 'login';
    }

    if (
      ['direccion', 'slider', 'categoria', 'marca', 'notificacion'].includes(t)
    ) {
      return 'system';
    }

    return 'other';
  }

  private buildLogMessage(
    tableName: string,
    action: string,
    recordId: string,
    recordName?: string,
  ): string {
    const t = (tableName ?? '').toLowerCase();
    const a = (action ?? '').toLowerCase();

    const knownEntity =
      t === 'producto'
        ? 'Producto'
        : t === 'curso'
          ? 'Curso'
          : t === 'orden'
            ? 'Orden'
            : t === 'usuario'
              ? 'Usuario'
              : t === 'slider'
                ? 'Slider'
                : t === 'categoria'
                  ? 'Categoría'
                  : t === 'marca'
                    ? 'Marca'
                    : t === 'direccion'
                      ? 'Dirección'
                      : t === 'notificacion'
                        ? 'Notificación'
                        : undefined;

    const entity =
      knownEntity ?? this.humanizeTableName(tableName) ?? 'Registro';

    let verb = 'Actualización';
    if (a.includes('create') || a.includes('insert')) verb = 'Creación';
    else if (a.includes('delete') || a.includes('remove')) verb = 'Eliminación';
    else if (a.includes('update') || a.includes('edit')) verb = 'Actualización';

    const normalizedRecordName = this.normalizeTitle(recordName);
    return `${verb} de ${normalizedRecordName ?? entity} #${recordId}`;
  }

  private normalizeTitle(value?: string): string | undefined {
    const s = (value ?? '').replace(/\s+/g, ' ').trim();
    return s ? s : undefined;
  }

  private extractRecordNameFromAuditLog(log: {
    oldData?: unknown;
    newData?: unknown;
    recordId?: unknown;
  }): string | undefined {
    return (
      this.extractRecordNameFromAuditData(log.newData) ??
      this.extractRecordNameFromAuditData(log.oldData)
    );
  }

  private extractRecordNameFromAuditData(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;

    const obj = value as Record<string, unknown>;
    const candidates = [
      'titulo',
      'title',
      'name',
      'nombre',
      'etiqueta',
      'codigo',
      'code',
      'email',
      'slug',
    ];

    for (const k of candidates) {
      const v = obj[k];
      if (typeof v === 'string') {
        const s = this.normalizeTitle(v);
        if (s) return s;
      }
    }

    return undefined;
  }

  private toIntId(value: string): number | undefined {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return undefined;
    return n;
  }

  private async getRecordDisplayName(
    tableName: string,
    recordId: string,
  ): Promise<string | undefined> {
    const t = (tableName ?? '').toLowerCase();
    const id = this.toIntId(recordId);
    if (!id) return undefined;

    if (t === 'producto') {
      const row = await this.prisma.producto.findUnique({
        where: { id },
        select: { titulo: true },
      });
      return row?.titulo;
    }

    if (t === 'curso') {
      const row = await this.prisma.curso.findUnique({
        where: { id },
        select: { titulo: true },
      });
      return row?.titulo;
    }

    if (t === 'marca') {
      const row = await this.prisma.marca.findUnique({
        where: { id },
        select: { nombre: true },
      });
      return row?.nombre;
    }

    if (t === 'categoria') {
      const row = await this.prisma.categoria.findUnique({
        where: { id },
        select: { nombre: true },
      });
      return row?.nombre;
    }

    if (t === 'slider') {
      const row = await this.prisma.slider.findUnique({
        where: { id },
        select: { titulo: true },
      });
      return row?.titulo;
    }

    if (t === 'direccion') {
      const row = await this.prisma.direccion.findUnique({
        where: { id },
        select: { etiqueta: true, nombre: true },
      });
      return row?.etiqueta ?? row?.nombre;
    }

    if (t === 'notificacion') {
      const row = await this.prisma.notificacion.findUnique({
        where: { id },
        select: { titulo: true },
      });
      return row?.titulo;
    }

    if (t === 'usuario') {
      const row = await this.prisma.usuario.findUnique({
        where: { id },
        select: { nombre: true, email: true },
      });
      return row?.nombre ?? row?.email;
    }

    return undefined;
  }

  private formatIsoDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private humanizeTableName(raw: string): string | undefined {
    const s = (raw ?? '').trim();
    if (!s) return undefined;

    const withSpaces = s
      .replace(/[_-]+/g, ' ')
      .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

    return withSpaces
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(' ');
  }
}
