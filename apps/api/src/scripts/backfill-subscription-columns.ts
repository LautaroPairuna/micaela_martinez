import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function parseJson<T extends object = Record<string, any>>(value: any): T {
  if (!value) return {} as T;
  try {
    if (typeof value === 'string') return JSON.parse(value) as T;
    return value as T;
  } catch {
    return {} as T;
  }
}

async function main() {
  console.log('=== Backfill subscription columns START ===');

  // 1) Backfill Orden.suscripcionProximoPago desde metadatos.subscription.nextPaymentDate
  const orders = await prisma.orden.findMany({
    where: {
      esSuscripcion: true,
      suscripcionProximoPago: null,
      metadatos: { not: Prisma.DbNull }, // Corregido para Prisma JSON filter
    },
    select: { id: true, metadatos: true },
  });

  let ordersUpdated = 0;

  for (const o of orders) {
    const meta = parseJson<any>(o.metadatos);
    const next = meta?.subscription?.nextPaymentDate;
    if (!next) continue;

    const dt = new Date(next);
    if (!Number.isFinite(dt.getTime())) continue;

    await prisma.orden.update({
      where: { id: o.id },
      data: { suscripcionProximoPago: dt },
    });

    ordersUpdated++;
  }

  console.log(`Ordenes actualizadas: ${ordersUpdated}`);

  // 2) Backfill Inscripcion columnas desde progreso.subscription
  const enrollments = await prisma.inscripcion.findMany({
    select: {
      id: true,
      progreso: true,
      subscriptionOrderId: true,
      subscriptionId: true,
      subscriptionEndDate: true,
      subscriptionActive: true,
    },
  });

  let enrollUpdated = 0;

  for (const e of enrollments) {
    // Si ya tiene columnas principales, skip
    if (e.subscriptionOrderId || e.subscriptionEndDate || e.subscriptionId)
      continue;

    const prog = parseJson<any>(e.progreso);
    const sub = prog?.subscription;
    if (!sub) continue;

    const orderId = sub.orderId ? Number(sub.orderId) : null;
    const subscriptionId = sub.subscriptionId
      ? String(sub.subscriptionId)
      : null;

    const endDateStr = sub.endDate ?? null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const endDateOk =
      endDate && Number.isFinite(endDate.getTime()) ? endDate : null;

    const active = typeof sub.isActive === 'boolean' ? sub.isActive : null;

    await prisma.inscripcion.update({
      where: { id: e.id },
      data: {
        subscriptionOrderId: Number.isFinite(orderId ?? NaN) ? orderId : null,
        subscriptionId,
        subscriptionEndDate: endDateOk,
        subscriptionActive: active,
      },
    });

    enrollUpdated++;
  }

  console.log(`Inscripciones actualizadas: ${enrollUpdated}`);

  console.log('=== Backfill subscription columns DONE ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
