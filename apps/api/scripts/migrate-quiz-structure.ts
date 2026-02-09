
import 'dotenv/config';
import { createExtendedClient } from '../src/prisma/prisma.extensions';

const prisma = createExtendedClient();

async function main() {
  console.log('🚀 Iniciando migración de estructura de Quiz...');
  
  try {
    const quizzes = await prisma.leccion.findMany({
      where: {
        tipo: 'QUIZ' as any
      }
    });

    console.log(`📋 Encontradas ${quizzes.length} lecciones tipo QUIZ.`);

    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const quiz of quizzes) {
      processed++;
      const content = quiz.contenido as any;
      let needsMigration = false;
      let newContent = { ...content };

      // Verificar si tiene estructura anidada data.preguntas
      if (content?.data?.preguntas && Array.isArray(content.data.preguntas)) {
        console.log(`🔄 Migrando Quiz ID: ${quiz.id} ("${quiz.titulo}")`);
        
        // Mover preguntas a la raíz
        newContent.preguntas = content.data.preguntas;
        
        // Preservar configuración si existe
        if (content.data.configuracion) {
          newContent.configuracion = content.data.configuracion;
        }

        // Eliminar estructura antigua 'data' si ya movimos todo lo útil
        delete newContent.data;
        
        needsMigration = true;
      }

      if (needsMigration) {
        try {
          await prisma.leccion.update({
            where: { id: quiz.id },
            data: {
              contenido: newContent
            }
          });
          console.log(`✅ Migrado correctamente: ${quiz.id}`);
          migrated++;
        } catch (error) {
          console.error(`❌ Error al actualizar ${quiz.id}:`, error);
          errors++;
        }
      } else {
        skipped++;
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   Total procesados: ${processed}`);
    console.log(`   Migrados: ${migrated}`);
    console.log(`   Omitidos (ya correctos): ${skipped}`);
    console.log(`   Errores: ${errors}`);

  } catch (error) {
    console.error('Error fatal durante la migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
