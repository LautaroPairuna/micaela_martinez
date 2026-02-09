
import 'dotenv/config';
import { TipoLeccion } from '@prisma/client';
import { createExtendedClient } from '../src/prisma/prisma.extensions';

const prisma = createExtendedClient();

// Helper para normalizar el enum de TipoLeccion
function enumKey(enm: any, input: unknown): string {
  const s = String(input);
  for (const [k, v] of Object.entries(enm)) {
    if (v === s) return k;
    if (k === s) return k;
  }
  return s;
}

const E = {
  tipoLeccion: (v: unknown) => enumKey(TipoLeccion, v) as TipoLeccion,
};

async function main() {
  console.log('🚀 Actualizando configuración de tipos de lección con tooltips y etiquetas normalizadas...');

  const tipoVideo = E.tipoLeccion('VIDEO');
  const tipoDocumento = E.tipoLeccion('DOCUMENTO');
  const tipoQuiz = E.tipoLeccion('QUIZ');
  const tipoTexto = E.tipoLeccion('TEXTO');

  // 1. VIDEO
  await prisma.leccionTipoConfig.update({
    where: { tipo: tipoVideo },
    data: {
      schema: {
        version: 2,
        title: 'Video',
        fields: [
          { 
            key: 'url', 
            label: 'URL del Video', 
            type: 'url', 
            required: true,
            help: 'Enlace directo al archivo de video (mp4, webm) o plataforma soportada.'
          },
          { 
            key: 'duracionMin', 
            label: 'Duración (minutos)', 
            type: 'number', 
            min: 0,
            help: 'Tiempo estimado de duración en minutos para mostrar al alumno.'
          },
          { 
            key: 'posterUrl', 
            label: 'Imagen de Portada (Poster)', 
            type: 'url',
            help: 'Imagen que se muestra antes de reproducir el video. Opcional.'
          },
          { 
            key: 'resumen', 
            label: 'Resumen Corto', 
            type: 'textarea',
            help: 'Breve descripción del contenido del video que aparecerá en el listado.'
          },
        ],
      },
    },
  });
  console.log('✅ Video actualizado');

  // 2. DOCUMENTO
  await prisma.leccionTipoConfig.update({
    where: { tipo: tipoDocumento },
    data: {
      schema: {
        version: 2,
        title: 'Documento',
        fields: [
          { 
            key: 'tituloDoc', 
            label: 'Título del Archivo', 
            type: 'text',
            help: 'Nombre visible del archivo para descargar.'
          },
          { 
            key: 'url', 
            label: 'URL del Documento', 
            type: 'url',
            help: 'Enlace directo al archivo PDF, DOCX, etc.'
          },
          { 
            key: 'resumen', 
            label: 'Resumen Corto', 
            type: 'textarea',
            help: 'Descripción breve sobre qué contiene el documento.'
          },
        ],
      },
    },
  });
  console.log('✅ Documento actualizado');

  // 3. QUIZ
  await prisma.leccionTipoConfig.update({
    where: { tipo: tipoQuiz },
    data: {
      schema: {
        version: 2,
        title: 'Quiz',
        fields: [
          { 
            key: 'intro', 
            label: 'Introducción / Instrucciones', 
            type: 'textarea',
            help: 'Texto que se mostrará en una pantalla de bienvenida antes de comenzar el quiz. Útil para dar instrucciones o reglas.'
          },
          { 
            key: 'preguntas', 
            label: 'Preguntas del Cuestionario', 
            type: 'quiz',
            help: 'Agrega y configura las preguntas, opciones y respuestas correctas.'
          },
        ],
      },
    },
  });
  console.log('✅ Quiz actualizado');

  // 4. TEXTO
  await prisma.leccionTipoConfig.update({
    where: { tipo: tipoTexto },
    data: {
      schema: {
        version: 2,
        title: 'Texto',
        fields: [
          { 
            key: 'contenido', 
            label: 'Contenido Principal', 
            type: 'richtext', 
            required: true,
            help: 'Cuerpo principal de la lección. Puedes usar formato enriquecido, imágenes y enlaces.'
          },
          { 
            key: 'resumen', 
            label: 'Resumen Corto', 
            type: 'textarea',
            help: 'Breve descripción que se muestra en la vista previa de la lección.'
          },
        ],
      },
    },
  });
  console.log('✅ Texto actualizado');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
