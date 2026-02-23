
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.producto.count();
  console.log(`\n📊 Total de productos en la base de datos: ${count}`);
  
  const productos = await prisma.producto.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      titulo: true,
      precio: true,
      marca: {
        select: { nombre: true }
      },
      categoria: {
        select: { nombre: true }
      }
    }
  });

  console.log('\n📝 Últimos 10 productos agregados:');
  productos.forEach(p => {
    console.log(`[${p.marca?.nombre || '?'}] ${p.titulo} - $${p.precio} (${p.categoria?.nombre || '?'})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
