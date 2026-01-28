// apps/api/scripts/print-admin-meta.cjs

require('ts-node/register/transpile-only');

// ✅ Cargar variables de entorno ANTES de importar Prisma extensions
const path = require('path');
const dotenv = require('dotenv');

// Intenta cargar primero apps/api/.env, si no existe, carga el .env del repo (opcional)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Si tu monorepo tiene .env en la raíz, descomentá esto:
// dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const fs = require('fs');

async function main() {
  const { createExtendedClient } = require('../src/prisma/prisma.extensions');
  const { AdminMetaService } = require('../src/admin/meta/admin-meta.service');

  const prisma = createExtendedClient();

  try {
    const adminMeta = new AdminMetaService(prisma);
    const meta = adminMeta.getAllResources();

    const outPath = path.join(process.cwd(), 'admin-meta.json');
    fs.writeFileSync(outPath, JSON.stringify(meta, null, 2), 'utf8');

    console.log('✅ Admin meta generado.');
    console.log(`📄 Archivo: ${outPath}`);
    if (Array.isArray(meta) && meta.length > 0) {
      console.log('Ejemplo primer recurso:\n');
      console.log(JSON.stringify(meta[0], null, 2));
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error('❌ Error generando admin meta:', err);
  process.exit(1);
});
