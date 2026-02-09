
import 'dotenv/config';
import { createExtendedClient } from '../src/prisma/prisma.extensions';

const prisma = createExtendedClient();

async function main() {
  console.log('🚀 Actualizando configuración de tipo QUIZ...');

  const quizConfig = await prisma.leccionTipoConfig.findFirst({
    where: { tipo: 'QUIZ' as any }
  });

  if (!quizConfig) {
    console.error('❌ No se encontró configuración para QUIZ');
    return;
  }

  const currentSchema = quizConfig.schema as any;
  
  // Filtrar campos para eliminar 'modo'
  const newFields = (currentSchema.fields || []).filter((f: any) => f.key !== 'modo');

  const newSchema = {
    ...currentSchema,
    fields: newFields
  };

  await prisma.leccionTipoConfig.update({
    where: { id: quizConfig.id },
    data: {
      schema: newSchema
    }
  });

  console.log('✅ Schema actualizado. Campo "modo" eliminado.');
}

main().finally(() => prisma.$disconnect());
