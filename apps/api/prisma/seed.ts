
/// <reference types="node" />
import 'dotenv/config';
import {
  Prisma,
  EstadoInscripcion,
  EstadoOrden,
  NivelCurso,
  TipoItemOrden,
  TipoLeccion,
} from '@prisma/client';
import { createExtendedClient } from '../src/prisma/prisma.extensions';

const prisma = createExtendedClient();

/**
 * Cast helper para JSON (Prisma Json)
 */
const json = (v: unknown) => v as Prisma.InputJsonValue;

/**
 * Prisma 7.2.0 + enums con @map: en algunos setups/runtime el engine valida esperando la KEY del enum
 * (ej: "BASICO") en lugar del VALUE mapeado (ej: "basico").
 *
 * Este normalizador:
 * - si recibe "basico" → devuelve "BASICO"
 * - si recibe NivelCurso.BASICO (que hoy vale "basico") → devuelve "BASICO"
 * - si recibe "BASICO" → devuelve "BASICO"
 */
function enumKey<T extends Record<string, string>>(enm: T, input: unknown): string {
  if (input == null) return input as any;

  const s = String(input);

  // Si ya es una key válida:
  if (Object.prototype.hasOwnProperty.call(enm, s)) return s;

  // Si es un value mapeado, buscamos la key:
  for (const [k, v] of Object.entries(enm)) {
    if (v === s) return k;
  }

  // Si no matchea, devolvemos lo que venga (dejar que Prisma tire error si corresponde)
  return s;
}

// Normalizadores concretos (devuelven la KEY y se castea a any para no pelear con el tipo TS del enum)
const E = {
  nivelCurso: (v: unknown) => enumKey(NivelCurso as any, v) as any,
  estadoOrden: (v: unknown) => enumKey(EstadoOrden as any, v) as any,
  estadoInscripcion: (v: unknown) => enumKey(EstadoInscripcion as any, v) as any,
  tipoItemOrden: (v: unknown) => enumKey(TipoItemOrden as any, v) as any,
  tipoLeccion: (v: unknown) => enumKey(TipoLeccion as any, v) as any,
};

/* ───────── Helpers ───────── */

function simpleSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

const upsertRoleBySlug = (slug: string, name: string) =>
  prisma.role.upsert({
    where: { slug },
    update: { name },
    create: { slug, name, createdAt: new Date() },
  });

const upsertUserByEmail = async (
  email: string,
  data: Omit<Prisma.UsuarioCreateInput, 'email'>,
) => {
  await prisma.usuario.upsert({
    where: { email },
    update: {
      nombre: data.nombre,
      passwordHash: (data as any).passwordHash,
      emailVerificadoEn: (data as any).emailVerificadoEn ?? undefined,
    },
    create: { ...data, email } as any,
  });

  const u = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!u) throw new Error(`No se pudo obtener usuario ${email}`);
  return u.id;
};

const upsertCategoriaBySlug = (slug: string, nombre: string) =>
  prisma.categoria.upsert({
    where: { slug },
    update: { nombre, activa: true },
    create: { slug, nombre, activa: true, creadoEn: new Date() },
  });

const upsertMarcaBySlug = (slug: string, nombre: string) =>
  prisma.marca.upsert({
    where: { slug },
    update: { nombre, activa: true },
    create: { slug, nombre, activa: true, creadoEn: new Date() },
  });

/** Producto por slug → devuelve id Int */
const upsertProductoGetId = async (p: {
  slug: string; titulo: string; precio: number; stock: number;
  publicado?: boolean; destacado?: boolean; imagen?: string | null;
  descripcionMD?: string | null; descuento?: number | null;
  marcaSlug?: string | null; categoriaSlug?: string | null;
}) => {
  const marca = p.marcaSlug
    ? await prisma.marca.findUnique({ where: { slug: p.marcaSlug }, select: { id: true } })
    : null;

  const categoria = p.categoriaSlug
    ? await prisma.categoria.findUnique({ where: { slug: p.categoriaSlug }, select: { id: true } })
    : null;

  await prisma.producto.upsert({
    where: { slug: p.slug },
    update: {
      titulo: p.titulo,
      precio: p.precio,
      stock: p.stock,
      publicado: p.publicado ?? true,
      destacado: p.destacado ?? false,
      imagen: p.imagen ?? null,
      descripcionMD: p.descripcionMD ?? null,
      descuento: p.descuento ?? 0,
      marcaId: marca?.id ?? null,
      categoriaId: categoria?.id ?? null,
    },
    create: {
      slug: p.slug,
      titulo: p.titulo,
      precio: p.precio,
      stock: p.stock,
      publicado: p.publicado ?? true,
      destacado: p.destacado ?? false,
      imagen: p.imagen ?? null,
      descripcionMD: p.descripcionMD ?? null,
      descuento: p.descuento ?? 0,
      marcaId: marca?.id ?? null,
      categoriaId: categoria?.id ?? null,
      creadoEn: new Date(),
    },
  });

  const prod = await prisma.producto.findUnique({
    where: { slug: p.slug },
    select: { id: true },
  });
  if (!prod) throw new Error(`No se pudo obtener producto ${p.slug}`);
  return prod.id;
};

/** Curso por slug → devuelve id Int */
const upsertCursoGetId = async (c: {
  idSlug: string;
  titulo: string;
  resumen: string;
  descripcionMD: string;
  precio: number;
  nivel: NivelCurso | string; // aceptamos string para que no te mate el bug
  portada: string;
  destacado?: boolean;
  descuento?: number;
  tags?: string[];
  queAprenderas?: string[];
  videoPreview?: string;
  requisitos?: string | string[]; // <-- Permitir string[] también
}) => {
  const nivelKey = E.nivelCurso(c.nivel); // <- CLAVE: manda "BASICO"/"INTERMEDIO"/"AVANZADO"

  await prisma.curso.upsert({
    where: { slug: c.idSlug },
    update: {
      titulo: c.titulo,
      resumen: c.resumen,
      descripcionMD: c.descripcionMD,
      precio: c.precio,
      publicado: true,
      nivel: nivelKey,
      portada: c.portada,
      destacado: c.destacado ?? false,
      descuento: c.descuento ?? 0,
      tags: json(c.tags ?? []),
      queAprenderas: c.queAprenderas ? json(c.queAprenderas) : undefined,
      videoPreview: c.videoPreview ?? null,
      requisitos: c.requisitos ? json(c.requisitos) : undefined,
    } as any,
    create: {
      slug: c.idSlug,
      titulo: c.titulo,
      resumen: c.resumen,
      descripcionMD: c.descripcionMD,
      precio: c.precio,
      publicado: true,
      nivel: nivelKey,
      portada: c.portada,
      destacado: c.destacado ?? false,
      descuento: c.descuento ?? 0,
      tags: json(c.tags ?? []),
      creadoEn: new Date(),
      queAprenderas: json(c.queAprenderas ?? []),
      videoPreview: c.videoPreview ?? null,
      requisitos: json(c.requisitos ?? []),
    } as any,
    });

  const curso = await prisma.curso.findUnique({
    where: { slug: c.idSlug },
    select: { id: true },
  });
  if (!curso) throw new Error(`No se pudo obtener curso ${c.idSlug}`);
  return curso.id;
};

async function main() {
  // Debug útil (te muestra el enum generado y cómo lo normaliza)
  console.log('NivelCurso enum:', NivelCurso);
  console.log('NivelCurso.BASICO (value):', (NivelCurso as any).BASICO);
  console.log('Normalize "basico" ->', enumKey(NivelCurso as any, 'basico'));
  console.log('Normalize NivelCurso.BASICO ->', enumKey(NivelCurso as any, (NivelCurso as any).BASICO));

  // ───────────────── Roles
  const [rAdmin, rCust, rStaff] = await Promise.all([
    upsertRoleBySlug('ADMIN', 'Administrador'),
    upsertRoleBySlug('CUSTOMER', 'Cliente'),
    upsertRoleBySlug('STAFF', 'Staff'),
  ]);

  // ───────────────── Usuarios
  const adminId = await upsertUserByEmail('admin@demo.com', {
    nombre: 'Admin Demo',
    passwordHash: '$2b$10$oc6bQbe6F67xUabv2r1.mecBi8Emco5qNTH3NUBFzUyJQRIyJDXym',
    emailVerificadoEn: new Date(),
  } as any);

  const clienteId = await upsertUserByEmail('cliente@demo.com', {
    nombre: 'Cliente Demo',
    passwordHash: '$2b$10$lY1J9JyencWSaSqJjLnr0.n82C5pVF65rNME63FdicIskJ4LRSevi',
  } as any);

  // ───────────────── Usuario ↔ Rol
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: adminId, roleId: rAdmin.id } },
    update: {},
    create: { usuarioId: adminId, roleId: rAdmin.id },
  });
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: adminId, roleId: rStaff.id } },
    update: {},
    create: { usuarioId: adminId, roleId: rStaff.id },
  });
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: clienteId, roleId: rCust.id } },
    update: {},
    create: { usuarioId: clienteId, roleId: rCust.id },
  });

  // ───────────────── Direcciones (idempotente simple)
  const dirCasa = await prisma.direccion.findFirst({
    where: { usuarioId: clienteId, calle: 'España', numero: '350' },
  });
  if (!dirCasa) {
    await prisma.direccion.create({
      data: {
        usuarioId: clienteId,
        etiqueta: 'Casa',
        nombre: 'Cliente Demo',
        telefono: '3875550001',
        calle: 'España',
        numero: '350',
        pisoDepto: '2° B',
        ciudad: 'Salta',
        provincia: 'Salta',
        cp: '4400',
        pais: 'AR',
        predeterminada: true,
        creadoEn: new Date(),
      } as any,
    });
  }

  const dirTrabajo = await prisma.direccion.findFirst({
    where: { usuarioId: clienteId, calle: 'Caseros', numero: '120' },
  });
  if (!dirTrabajo) {
    await prisma.direccion.create({
      data: {
        usuarioId: clienteId,
        etiqueta: 'Trabajo',
        nombre: 'Cliente Demo',
        telefono: '3875550002',
        calle: 'Caseros',
        numero: '120',
        ciudad: 'Salta',
        provincia: 'Salta',
        cp: '4400',
        pais: 'AR',
        predeterminada: false,
        creadoEn: new Date(),
      } as any,
    });
  }

  // ───────────────── Categorías Reales
  await upsertCategoriaBySlug('pestanas', 'Pestañas');
  await upsertCategoriaBySlug('pestanas-tecnologicas', 'Pestañas Tecnológicas');
  await upsertCategoriaBySlug('adhesivos', 'Adhesivos y Preparadores');
  await upsertCategoriaBySlug('herramientas-pestanas', 'Herramientas y Accesorios');
  await upsertCategoriaBySlug('cosmetica', 'Cosmética Profesional');
  await upsertCategoriaBySlug('cuidado-facial', 'Cuidado Facial');
  await upsertCategoriaBySlug('cuidado-corporal', 'Cuidado Corporal');
  await upsertCategoriaBySlug('proteccion-solar', 'Protección Solar');

  // ───────────────── Marcas Reales
  await upsertMarcaBySlug('nagaraku', 'Nagaraku');
  await upsertMarcaBySlug('exel', 'Exel');

  // ───────────────── Productos Reales
  const productosData = [
    // NAGARAKU - Pestañas
    {
      titulo: 'Nagaraku 4D -U- 0.07 «D» MIX 8-15mm',
      precio: 9890,
      stock: 45,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'pestanas-tecnologicas',
      descripcion: 'Extensiones de pestañas Nagaraku, fabricadas en fibra especial para un acabado natural y ligero. Curva D, grosor 0.07 mm, y mix de longitudes (8 a 15 mm). Incluye 12 líneas por bandeja.',
    },
    {
      titulo: 'Nagaraku 3D -U- 0.07 «D» MIX 8-15mm',
      precio: 14600,
      stock: 30,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'pestanas-tecnologicas',
      descripcion: 'Extensiones de pestañas volumen 3D pre-armado. Ideales para lograr volumen y definición profesional en cada aplicación de manera rápida.',
    },
    {
      titulo: 'Nagaraku YY – 0.05 Curva D – Mix',
      precio: 6300,
      stock: 60,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'pestanas-tecnologicas',
      descripcion: 'Pestañas tecnológicas formato YY (Y Shape). Acabado trenzado suave que otorga volumen con un look texturizado único. Grosor 0.05 para máxima ligereza.',
    },
    {
      titulo: 'Nagaraku W Shape 3D – 0.07 Mix',
      precio: 10500,
      stock: 25,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'pestanas-tecnologicas',
      descripcion: 'Pestañas tecnológicas formato W (Trébol). Tres puntas por base para un volumen rápido y eficaz. Fibra suave y ligera.',
    },
    {
      titulo: 'Nagaraku Ellipse Flat - Mate 0.15 Mix',
      precio: 9000,
      stock: 40,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'pestanas-tecnologicas',
      descripcion: 'Pestañas planas (Ellipse) con acabado mate. Base aplanada para mejor adherencia y menor peso. Apariencia de mayor grosor sin dañar la pestaña natural.',
    },

    // NAGARAKU - Adhesivos y Herramientas
    {
      titulo: 'Adhesivo Nagaraku Premium 5ml',
      precio: 18500,
      stock: 15,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'adhesivos',
      descripcion: 'Pegamento profesional para extensiones de pestañas. Secado rápido (1-2 seg) y retención prolongada de hasta 6 semanas. Baja emisión de vapores.',
    },
    {
      titulo: 'Removedor en Crema Nagaraku (Green) 5g',
      precio: 10200,
      stock: 20,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'adhesivos',
      descripcion: 'Removedor de adhesivo en crema, fórmula suave. No irrita, ideal para pieles sensibles. Color verde para fácil visualización. Acción en 3-5 minutos.',
    },
    {
      titulo: 'Pinza Nagaraku N-01 Recta (Aislar)',
      precio: 5500,
      stock: 50,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'herramientas-pestanas',
      descripcion: 'Pinza de acero inoxidable de alta precisión serie N. Punta recta fina ideal para aislar pestañas naturales con comodidad.',
    },
    {
      titulo: 'Pinza Nagaraku N-02 Curva (Volumen)',
      precio: 5800,
      stock: 45,
      marcaSlug: 'nagaraku',
      categoriaSlug: 'herramientas-pestanas',
      descripcion: 'Pinza curva de precisión para técnica de volumen y clásica. Agarre perfecto (sweet spot) para abanicos.',
    },

    // EXEL - Facial
    {
      titulo: 'Gel Hidratante Reparador con Liposomas de Vitamina C',
      precio: 23760,
      stock: 12,
      marcaSlug: 'exel',
      categoriaSlug: 'cuidado-facial',
      descripcion: 'Gel liviano antioxidante y reparador. Sus liposomas de Vitamina C penetran en profundidad mejorando la luminosidad y elasticidad de la piel.',
    },
    {
      titulo: 'Máscara Facial Hidratante y Reparadora con ADN',
      precio: 23200,
      stock: 10,
      marcaSlug: 'exel',
      categoriaSlug: 'cuidado-facial',
      descripcion: 'Máscara cremosa reparadora. Contiene ADN vegetal y Ácido Hialurónico para una hidratación profunda y efecto anti-age visible.',
    },
    {
      titulo: 'Loción Herbácea Tonificante con Aloe Vera',
      precio: 15400,
      stock: 25,
      marcaSlug: 'exel',
      categoriaSlug: 'cuidado-facial',
      descripcion: 'Tónico descongestivo y humectante. Ideal para finalizar la limpieza facial y equilibrar el pH de la piel. Para todo tipo de pieles.',
    },
    {
      titulo: 'Emulsión de Limpieza con Vitamina E',
      precio: 12500,
      stock: 30,
      marcaSlug: 'exel',
      categoriaSlug: 'cuidado-facial',
      descripcion: 'Leche de limpieza suave que elimina maquillaje e impurezas sin resecar. Enriquecida con Vitamina E antioxidante.',
    },

    // EXEL - Corporal y Solar
    {
      titulo: 'Crema Corporal Reafirmante con Q10',
      precio: 28900,
      stock: 8,
      marcaSlug: 'exel',
      categoriaSlug: 'cuidado-corporal',
      descripcion: 'Emulsión corporal formulada para mejorar la firmeza y elasticidad de la piel. Coenzima Q10 y Centella Asiática.',
    },
    {
      titulo: 'Gel Neutro Conductior 1kg',
      precio: 8500,
      stock: 50,
      marcaSlug: 'exel',
      categoriaSlug: 'cuidado-corporal',
      descripcion: 'Gel base neutro de alta viscosidad para aparatología estética (ultrasonido, radiofrecuencia). Hipoalergénico y soluble en agua.',
    },
    {
      titulo: 'Protector Solar Pantalla FPS 60',
      precio: 19800,
      stock: 18,
      marcaSlug: 'exel',
      categoriaSlug: 'proteccion-solar',
      descripcion: 'Pantalla solar de muy alta protección. Filtros UVA/UVB de amplio espectro. Textura no grasa, toque seco. Resistente al agua.',
    },
  ];

  let demoProductId: number = 0;
  let demoProductTitle = '';
  let demoProductPrice = 0;

  for (const p of productosData) {
    const slug = simpleSlug(p.titulo);
    const id = await upsertProductoGetId({
      slug,
      titulo: p.titulo,
      precio: p.precio,
      stock: p.stock,
      publicado: true,
      destacado: Math.random() > 0.7,
      descripcionMD: p.descripcion,
      marcaSlug: p.marcaSlug,
      categoriaSlug: p.categoriaSlug,
      imagen: null, // Sin imagen por ahora
    });

    // Guardamos el primero como demo
    if (!demoProductId) {
      demoProductId = id;
      demoProductTitle = p.titulo;
      demoProductPrice = p.precio;
    }
  }

  // ───────────────── Cursos (incluye curso de prueba)
  const cursoPruebaId = await upsertCursoGetId({
    idSlug: 'curso-de-prueba',
    titulo: 'Curso de Prueba',
    resumen: 'Curso para testing de suscripciones mensuales.',
    descripcionMD:
      'Este es un curso de prueba para verificar el funcionamiento de las suscripciones mensuales en MercadoPago.',
    precio: 1000,
    nivel: NivelCurso.BASICO, // OK: lo normalizamos a "BASICO"
    portada: 'curso-prueba.jpg',
    destacado: true,
    tags: ['prueba', 'testing', 'suscripcion'],
    queAprenderas: ['Cómo realizar pagos', 'Cómo cancelar suscripciones', 'Acceso al contenido'],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-applying-makeup-to-a-woman-5264/1080p.mp4',
    requisitos: ['Ninguno.', 'Acceso a internet.'],
  });

  const cursoMaquId = await upsertCursoGetId({
    idSlug: 'maquillaje-profesional',
    titulo: 'Maquillaje Profesional',
    resumen: 'Domina técnicas de maquillaje profesional.',
    descripcionMD: 'Contenido completo con prácticas y feedback.',
    precio: 40000,
    nivel: NivelCurso.INTERMEDIO,
    portada: 'curso-maqu.jpg',
    destacado: true,
    tags: ['maquillaje', 'ojos', 'mate'],
    queAprenderas: [
      'Diagnóstico de piel y preparación',
      'Colorimetría y correcciones',
      'Técnicas de ojos: Smokey, Cut Crease, Delineados',
      'Piel blindada y larga duración',
      'Maquillaje para fotografía y eventos',
    ],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-makeup-artist-applying-eyeshadow-5263/1080p.mp4',
    requisitos: ['Kit básico de maquillaje.', 'Brochas y esponjas limpias.', 'Modelo para practicar (opcional).'],
  });

  const cursoSkinId = await upsertCursoGetId({
    idSlug: 'skincare-basico',
    titulo: 'Skincare Básico',
    resumen: 'Rutinas diarias para tu piel.',
    descripcionMD: 'Aprende a construir rutinas efectivas por tipo de piel.',
    precio: 28000,
    nivel: NivelCurso.BASICO,
    portada: 'curso-skin.jpg',
    destacado: false,
    tags: ['skincare', 'hidratacion', 'rutinas'],
    queAprenderas: [
      'Identificar tu biotipo cutáneo',
      'Pasos esenciales: Limpieza, Hidratación, Protección',
      'Cómo leer etiquetas de ingredientes básicos',
      'Errores comunes en el cuidado de la piel',
    ],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-applying-cream-to-face-5268/1080p.mp4',
    requisitos: ['Espejo con buena iluminación.', 'Vincha para retirar el cabello.', 'Disposición para crear nuevos hábitos.'],
  });

  const cursoOjosId = await upsertCursoGetId({
    idSlug: 'maquillaje-ojos-avanzado',
    titulo: 'Maquillaje de Ojos Avanzado',
    resumen: 'Domina smokey, cut crease y delineados gráficos.',
    descripcionMD: 'Técnicas pro para fotografía y eventos.',
    precio: 45000,
    nivel: NivelCurso.AVANZADO,
    portada: 'curso-ojos.jpg',
    destacado: true,
    tags: ['ojos', 'smokey', 'cut-crease'],
    queAprenderas: [
      'Difuminados perfectos y transiciones',
      'Cut Crease abierto y cerrado',
      'Delineados gráficos y foxy eyes',
      'Aplicación de glitter y pigmentos',
    ],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-applying-eyeliner-5265/1080p.mp4',
    requisitos: ['Conocimientos básicos de maquillaje.', 'Variedad de pinceles de ojos (difuminar, precisión).', 'Prebase de sombras y pigmentos.'],
  });

  const cursoCejasId = await upsertCursoGetId({
    idSlug: 'cejas-perfectas-diseno-perfilado',
    titulo: 'Cejas Perfectas: Diseño y Perfilado',
    resumen: 'Medición, simetría, técnicas de perfilado y relleno.',
    descripcionMD: 'Curso integral con práctica guiada.',
    precio: 32000,
    nivel: NivelCurso.INTERMEDIO,
    portada: 'curso-cejas.jpg',
    destacado: false,
    tags: ['cejas', 'diseño', 'perfilado'],
    queAprenderas: [
      'Visagismo y diseño de cejas según el rostro',
      'Técnicas de depilación con pinza y cera',
      'Laminado de cejas (Brow Lamination)',
      'Henna y tinte híbrido',
    ],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-shaping-eyebrows-5266/1080p.mp4',
    requisitos: ['Pinza de depilar y tijera pequeña.', 'Hilo para diseño (mapping).', 'Cepillo de cejas (goubillon).'],
  });

  const cursoDermoId = await upsertCursoGetId({
    idSlug: 'dermocosmetica-y-rutinas-pro',
    titulo: 'Dermocosmética y Rutinas Pro',
    resumen: 'Activos, formulaciones y armado de rutinas avanzadas.',
    descripcionMD: 'De la teoría a la práctica con estudios de caso.',
    precio: 52000,
    nivel: NivelCurso.AVANZADO,
    portada: 'curso-dermo.jpg',
    destacado: true,
    tags: ['dermocosmetica', 'rutinas', 'activos'],
    queAprenderas: [
      'Química cosmética avanzada',
      'Combinación de ácidos y activos potentes',
      'Tratamiento de hiperpigmentación y acné',
      'Rutinas anti-age con evidencia científica',
    ],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-woman-applying-serum-5267/1080p.mp4',
    requisitos: ['Conocimientos de biología de la piel (recomendado).', 'Interés en química cosmética.', 'Notebook para tomar apuntes.'],
  });

  const cursoSkinSensId = await upsertCursoGetId({
    idSlug: 'skincare-piel-sensible',
    titulo: 'Skincare para Piel Sensible',
    resumen: 'Rutinas suaves y efectivas sin irritación.',
    descripcionMD: 'Selección de activos, tolerancia y protocolos.',
    precio: 30000,
    nivel: NivelCurso.BASICO,
    portada: 'curso-skin-sensible.jpg',
    destacado: false,
    tags: ['piel sensible', 'rutinas', 'tolerancia'],
    queAprenderas: [
      'Recuperación de la barrera cutánea',
      'Ingredientes calmantes y antiinflamatorios',
      'Cómo introducir nuevos productos sin reacción',
      'Maquillaje apto para pieles reactivas',
    ],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-woman-washing-face-5269/1080p.mp4',
    requisitos: ['Piel sensible o reactiva (propia o de clientes).', 'Paciencia para probar productos.', 'Evitar exfoliantes fuertes durante el curso.'],
  });

  // ───────────────── Módulos + Lecciones
  const resetCurso = async (cursoId: number) => {
    const modulos = await prisma.modulo.findMany({
      where: { cursoId },
      select: { id: true },
    });
    const moduloIds = modulos.map((m) => m.id);

    if (moduloIds.length > 0) {
      await prisma.leccion.deleteMany({ where: { moduloId: { in: moduloIds } } });
    }
    await prisma.modulo.deleteMany({ where: { cursoId } });
  };

  // Curso de Prueba
  await resetCurso(cursoPruebaId);
  const modP1 = await prisma.modulo.create({
    data: { cursoId: cursoPruebaId, titulo: 'Módulo 1: Introducción', orden: 1 } as any,
  });
  const modP2 = await prisma.modulo.create({
    data: { cursoId: cursoPruebaId, titulo: 'Módulo 2: Contenido Principal', orden: 2 } as any,
  });

  await prisma.leccion.createMany({
    data: [
      {
        moduloId: modP1.id,
        titulo: 'Lección 1: Bienvenida',
        descripcion: 'Bienvenida al curso de prueba',
        contenido: '# Bienvenida\n\nEste es un curso para probar suscripciones.',
        duracion: 5,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modP2.id,
        titulo: 'Lección 2: Contenido Principal',
        descripcion: 'Contenido principal',
        contenido: '# Contenido Principal\n\nDetalle del curso de prueba.',
        duracion: 10,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modP2.id,
        titulo: 'Lección 3: Conclusión',
        descripcion: 'Cierre del curso',
        contenido: '# Conclusión\n\n¡Gracias por completar el curso!',
        duracion: 5,
        orden: 2,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
    ] as any,
  });

  // Curso Maquillaje Profesional
  await resetCurso(cursoMaquId);
  const modM1 = await prisma.modulo.create({
    data: { cursoId: cursoMaquId, titulo: 'Módulo 1: Preparación y diagnóstico', orden: 1 } as any,
  });
  const modM2 = await prisma.modulo.create({
    data: { cursoId: cursoMaquId, titulo: 'Módulo 2: Correcciones y base', orden: 2 } as any,
  });
  const modM3 = await prisma.modulo.create({
    data: { cursoId: cursoMaquId, titulo: 'Módulo 3: Ojos, cejas y labios', orden: 3 } as any,
  });

  await prisma.leccion.createMany({
    data: [
      {
        moduloId: modM1.id,
        titulo: 'Diagnóstico de piel y objetivos de look',
        descripcion: 'Cómo leer la piel y definir el resultado final.',
        contenido: json({
          contenido:
            'Antes de maquillar, definí el objetivo del look (social, editorial, día, noche) y el tipo de piel.\n\nChecklist rápido:\n- Tipo de piel: grasa, mixta, seca o sensible\n- Estado: deshidratación, textura, poros, rojeces\n- Preferencia de acabado: mate, natural, glow\n\nCon esta lectura vas a elegir productos, cobertura y técnica correctas.',
          resumen: 'Diagnóstico inicial para elegir técnica y productos.',
        }),
        duracion: 12,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM1.id,
        titulo: 'Higiene, preparación y herramientas',
        descripcion: 'Rutina de preparación + brochas y esponjas.',
        contenido: json({
          contenido:
            'Preparación esencial:\n1) Limpieza suave y tónico\n2) Hidratante según tipo de piel\n3) Primer específico (poros, brillo, luminosidad)\n\nHerramientas:\n- Brochas de base: plana y lengua de gato\n- Esponja húmeda para acabado natural\n- Brochas de ojos: blending, precisión, plano\n\nDesinfectá brochas y productos en cada clienta.',
          resumen: 'Pasos de higiene y set básico de herramientas.',
        }),
        duracion: 10,
        orden: 2,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM1.id,
        titulo: 'Guía descargable: Preparación de piel',
        descripcion: 'Material de apoyo con checklist completo.',
        contenido: json({
          url: 'https://example.com/guia-preparacion-piel.pdf',
          nombre: 'Guía de preparación de piel',
          tipoArchivo: 'PDF',
          resumen: 'Checklist previo y recomendaciones por tipo de piel.',
        }),
        duracion: 5,
        orden: 3,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.DOCUMENTO),
      },
      {
        moduloId: modM1.id,
        titulo: 'Quiz: Diagnóstico y preparación',
        descripcion: 'Evaluá los conceptos clave antes de avanzar.',
        contenido: json({
          intro:
            'Responde las siguientes preguntas para confirmar que dominas diagnóstico, preparación e higiene.',
          preguntas: [
            {
              pregunta: '¿Cuál es el primer paso antes de aplicar cualquier producto de maquillaje?',
              opciones: [
                'Aplicar base de alta cobertura',
                'Limpieza e higiene del rostro',
                'Sellar con polvo traslúcido',
                'Aplicar iluminador',
              ],
              respuestaCorrecta: 1,
              explicacion: 'La higiene previa garantiza adherencia, duración y salud de la piel.',
            },
            {
              pregunta: '¿Qué primer es más adecuado para piel grasa?',
              opciones: [
                'Primer hidratante glow',
                'Primer matificante',
                'Aceite facial nutritivo',
                'Crema muy emoliente',
              ],
              respuestaCorrecta: 1,
              explicacion: 'El matificante controla brillo y poros visibles.',
            },
            {
              pregunta: '¿Cuál es el objetivo del diagnóstico inicial?',
              opciones: [
                'Elegir el labial',
                'Definir look, técnica y productos',
                'Seleccionar el peinado',
                'Aplicar máscara primero',
              ],
              respuestaCorrecta: 1,
              explicacion: 'El diagnóstico guía cobertura, acabado y método.',
            },
          ],
        }),
        duracion: 8,
        orden: 4,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.QUIZ),
      },
      {
        moduloId: modM2.id,
        titulo: 'Correcciones estratégicas y colorimetría',
        descripcion: 'Cómo neutralizar ojeras, rojeces y manchas.',
        contenido: json({
          contenido:
            'Reglas rápidas de colorimetría:\n- Verde neutraliza rojeces\n- Salmón neutraliza ojeras azuladas\n- Durazno para ojeras marrones\n\nAplica corrector en capas finas y difumina bordes para evitar textura.\nDespués, unifica con base del tono exacto del cuello.',
          resumen: 'Neutralización de imperfecciones con color corrector.',
        }),
        duracion: 14,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM2.id,
        titulo: 'Demostración: Aplicación de base y sellado',
        descripcion: 'Técnica paso a paso para acabado profesional.',
        duracion: 18,
        orden: 2,
        rutaSrc: 'base-sellado-pro.mp4',
        tipo: E.tipoLeccion(TipoLeccion.VIDEO),
      },
      {
        moduloId: modM2.id,
        titulo: 'Diferencias de acabado: mate, natural y glow',
        descripcion: 'Cómo ajustar productos según el look.',
        contenido: json({
          contenido:
            'Acabado mate: base oil-free + polvo microfino.\nAcabado natural: base ligera + sellado mínimo.\nAcabado glow: hidratación previa + iluminador líquido en puntos altos.\n\nEn piel grasa, controla brillo en zona T; en piel seca, evita exceso de polvo.',
          resumen: 'Ajuste de acabado según piel y ocasión.',
        }),
        duracion: 9,
        orden: 3,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM3.id,
        titulo: 'Diseño de cejas y estructura del rostro',
        descripcion: 'Balance visual para realzar la mirada.',
        contenido: json({
          contenido:
            'Ubicá tres puntos: inicio (aleta de nariz), arco (pupila) y cola (aleta de nariz y comisura externa).\nRellena con trazos tipo pelo y fija con gel.\nAjusta intensidad según el look final.',
          resumen: 'Guía de diseño de cejas y proporciones.',
        }),
        duracion: 11,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM3.id,
        titulo: 'Ojos: transición, profundidad y brillo',
        descripcion: 'Construcción de un smokey suave y versátil.',
        contenido: json({
          contenido:
            'Paso a paso:\n1) Sombra de transición en cuenca\n2) Profundidad en esquina externa\n3) Sombra plana en el párpado móvil\n4) Iluminación en lagrimal\n\nDifumina bordes con brocha limpia para un degradado profesional.',
          resumen: 'Estructura base para ojos con profundidad.',
        }),
        duracion: 13,
        orden: 2,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM3.id,
        titulo: 'Labios: definición y duración',
        descripcion: 'Cómo lograr labios nítidos y de larga duración.',
        contenido: json({
          contenido:
            'Prepara con exfoliación suave y bálsamo.\nPerfila con lápiz del mismo tono del labial.\nAplica color en capas finas, retira exceso con tissue y re-aplica.\nSella con polvo traslúcido si buscas máxima duración.',
          resumen: 'Técnica de labios con acabado profesional.',
        }),
        duracion: 9,
        orden: 3,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modM3.id,
        titulo: 'Quiz: Ojos, cejas y labios',
        descripcion: 'Repaso final de conceptos clave.',
        contenido: json({
          intro:
            'Completa este quiz para consolidar técnicas de ojos, cejas y labios.',
          preguntas: [
            {
              pregunta: '¿Qué punto define el arco ideal de la ceja?',
              opciones: [
                'Centro de la frente',
                'Pupila en línea recta con la aleta de la nariz',
                'Inicio de la ceja',
                'Comisura interna del ojo',
              ],
              respuestaCorrecta: 1,
              explicacion: 'El arco se define con la línea aleta de nariz–pupila.',
            },
            {
              pregunta: '¿Cuál es el paso clave para un degradado suave en ojos?',
              opciones: [
                'Aplicar glitter primero',
                'Difuminar bordes con brocha limpia',
                'Usar sombra sin transición',
                'Sellar con polvo suelto',
                'Difuminar bordes con brocha limpia',
              ],
              respuestaCorrecta: 1,
              explicacion: 'El difuminado con brocha limpia evita cortes visibles.',
            },
            {
              pregunta: '¿Qué mejora la duración del labial?',
              opciones: [
                'Aplicar una sola capa gruesa',
                'Sellar entre capas finas',
                'Evitar delinear',
                'Usar bálsamo encima',
              ],
              respuestaCorrecta: 1,
              explicacion: 'Capas finas y sellado intermedio prolongan el color.',
            },
          ],
        }),
        duracion: 7,
        orden: 4,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.QUIZ),
      },
    ] as any,
  });

  // Bootstrap para cursos restantes
  const bootstrapCurso = async (cursoId: number, titulo1: string, titulo2: string) => {
    await resetCurso(cursoId);
    const a = await prisma.modulo.create({ data: { cursoId, titulo: titulo1, orden: 1 } as any });
    const b = await prisma.modulo.create({ data: { cursoId, titulo: titulo2, orden: 2 } as any });

    await prisma.leccion.createMany({
      data: [
        {
          moduloId: a.id,
          titulo: 'Introducción',
          orden: 1,
          duracion: 5,
          rutaSrc: 'intro.mp4',
          tipo: E.tipoLeccion(TipoLeccion.VIDEO),
          descripcion: 'Introducción al módulo.',
        },
        {
          moduloId: b.id,
          titulo: 'Contenido principal',
          orden: 1,
          duracion: 10,
          rutaSrc: null,
          tipo: E.tipoLeccion(TipoLeccion.TEXTO),
          descripcion: 'Contenido base.',
          contenido: '# Contenido\n\nDetalles del módulo.',
        },
      ] as any,
    });
  };

  await bootstrapCurso(cursoSkinId, 'Rutinas y tipos de piel', 'Productos clave');
  await bootstrapCurso(cursoOjosId, 'Smokey & degradados', 'Cut crease y gráficos');
  await bootstrapCurso(cursoCejasId, 'Diseño y medición', 'Perfilado y relleno');
  await bootstrapCurso(cursoDermoId, 'Activos clave', 'Rutinas avanzadas');
  await bootstrapCurso(cursoSkinSensId, 'Fundamentos piel sensible', 'Armado de rutina');

  // ───────────────── Inscripción DEMO
  await prisma.inscripcion.upsert({
    where: { usuarioId_cursoId: { usuarioId: clienteId, cursoId: cursoMaquId } },
    update: {
      estado: E.estadoInscripcion(EstadoInscripcion.ACTIVADA),
      progreso: json({
        completado: [],
        subscription: {
          duration: '1',
          durationType: 'mes',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        },
      }),
    } as any,
    create: {
      usuarioId: clienteId,
      cursoId: cursoMaquId,
      estado: E.estadoInscripcion(EstadoInscripcion.ACTIVADA),
      progreso: json({
        completado: [],
        subscription: {
          duration: '1',
          durationType: 'mes',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        },
      }),
      creadoEn: new Date(),
    } as any,
  });

  // ───────────────── Reseña DEMO (producto)
  // Usamos el primer producto real como demo si existe
  if (demoProductId) {
    await prisma.resena.upsert({
      where: { productoId_usuarioId: { productoId: demoProductId, usuarioId: clienteId } },
      update: { puntaje: 5, comentario: 'Excelente calidad, justo lo que necesitaba.' },
      create: { productoId: demoProductId, usuarioId: clienteId, puntaje: 5, comentario: 'Excelente calidad, justo lo que necesitaba.', creadoEn: new Date() } as any,
    });
  }

  // ───────────────── Orden + Ítems
  const refPago = 'MP-REF-0001';
  const existingOrder = await prisma.orden.findFirst({
    where: { referenciaPago: refPago },
    select: { id: true },
  });

  const ordenId = existingOrder
    ? existingOrder.id
    : (
        await prisma.orden.create({
          data: {
            usuarioId: clienteId,
            estado: E.estadoOrden(EstadoOrden.PAGADO),
            total: 70000,
            moneda: 'ARS',
            referenciaPago: refPago,
            creadoEn: new Date(),
          } as any,
          select: { id: true },
        })
      ).id;

  await prisma.itemOrden.deleteMany({ where: { ordenId } });
  
  const itemsOrdenData = [];
  if (demoProductId) {
    itemsOrdenData.push({
      ordenId,
      tipo: E.tipoItemOrden(TipoItemOrden.PRODUCTO),
      refId: demoProductId,
      titulo: demoProductTitle,
      cantidad: 2,
      precioUnitario: demoProductPrice,
    });
  }
  
  itemsOrdenData.push({
    ordenId,
    tipo: E.tipoItemOrden(TipoItemOrden.CURSO),
    refId: cursoMaquId,
    titulo: 'Maquillaje Profesional',
    cantidad: 1,
    precioUnitario: 40000,
  });

  await prisma.itemOrden.createMany({
    data: itemsOrdenData as any,
  });

  // ───────────────── Slider (PRO)
  await prisma.slider.deleteMany({});
  await prisma.slider.createMany({
    data: [
      {
        titulo: 'Cursos Online Profesionales',
        subtitulo: 'Aprendé a tu ritmo',
        descripcion: 'Técnicas profesionales, clases claras y material descargable.',
        etiqueta: '+500 alumnas',
        ctaPrimarioTexto: 'Ver cursos',
        ctaPrimarioHref: '/cursos',
        ctaSecundarioTexto: 'Consultar',
        ctaSecundarioHref: '/#contacto',
        alt: 'Aprende técnicas profesionales con nuestros cursos online',
        archivo: 'hero-cursos-online.svg',
        activa: true,
        orden: 1,
        creadoEn: new Date(),
      },
      {
        titulo: 'Productos Profesionales de Pestañas',
        subtitulo: 'Nagaraku & Exel',
        descripcion: 'La mejor calidad para tus servicios de extensiones y cuidado facial.',
        etiqueta: 'Envío a todo el país',
        ctaPrimarioTexto: 'Ver tienda',
        ctaPrimarioHref: '/tienda',
        ctaSecundarioTexto: 'Novedades',
        ctaSecundarioHref: '/tienda?sort=newest',
        alt: 'Productos profesionales para pestañas y cosmética',
        archivo: 'hero-productos.svg',
        activa: true,
        orden: 2,
        creadoEn: new Date(),
      },
    ],
  });

  console.log('✅ Seed finalizado correctamente con datos REALES de Nagaraku y Exel.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
