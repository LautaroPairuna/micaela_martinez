// apps/api/scripts/print-admin-meta.cjs

// 1) Registramos ts-node para poder importar archivos .ts
require('ts-node').register({
  transpileOnly: true,
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
});

// 2) Ahora podemos requerir directamente el util en TypeScript
const { buildAdminMeta } = require('../src/admin/meta/admin-meta.utils');

// 3) Módulos nativos de Node
const fs = require('fs');
const path = require('path');

async function main() {
  const meta = buildAdminMeta();

  // Archivo de salida en la raíz de apps/api
  const outPath = path.join(process.cwd(), 'admin-meta.json');

  fs.writeFileSync(outPath, JSON.stringify(meta, null, 2), 'utf8');

  console.log('✅ Admin meta generado.');
  console.log(`📄 Archivo: ${outPath}`);
  console.log('Ejemplo primer recurso:\n');
  if (Array.isArray(meta) && meta.length > 0) {
    console.log(JSON.stringify(meta[0], null, 2));
  }
}

main().catch((err) => {
  console.error('❌ Error generando admin meta:', err);
  process.exit(1);
});
