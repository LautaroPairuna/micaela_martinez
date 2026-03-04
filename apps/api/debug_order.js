
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 3; // El ID de la orden problemática
  const order = await prisma.orden.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  
  console.log(JSON.stringify(order, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
