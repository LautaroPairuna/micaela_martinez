/// <reference types="node" />
import 'dotenv/config';
import {
  Prisma,
  EstadoInscripcion,
  EstadoOrden,
  NivelCurso,
  TipoItemOrden,
  TipoLeccion,
} from '../src/generated/prisma/client';
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

const upsertCategoriaBySlug = (slug: string, nombre: string, orden = 0, parentId?: number) =>
  prisma.categoria.upsert({
    where: { slug },
    update: { nombre, activa: true, orden, parentId: parentId ?? null },
    create: { slug, nombre, activa: true, orden, parentId: parentId ?? null, creadoEn: new Date() },
  });

const upsertMarcaBySlug = (slug: string, nombre: string, orden = 0) =>
  prisma.marca.upsert({
    where: { slug },
    update: { nombre, activa: true, orden },
    create: { slug, nombre, activa: true, orden, creadoEn: new Date() },
  });

/** Producto por slug → devuelve id Int */
const upsertProductoGetId = async (p: {
  slug: string; titulo: string; precio: number; stock: number;
  publicado?: boolean; destacado?: boolean; imagen?: string | null;
  descripcionMD?: string | null; precioLista?: number | null;
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
      precioLista: p.precioLista ?? null,
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
      precioLista: p.precioLista ?? null,
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
  tags?: string[];
  instructorId: number;
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
      tags: json(c.tags ?? []),
      instructorId: c.instructorId,
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
      tags: json(c.tags ?? []),
      creadoEn: new Date(),
      instructorId: c.instructorId,
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
  const [rAdmin, rInstr, rCust, rStaff] = await Promise.all([
    upsertRoleBySlug('ADMIN', 'Administrador'),
    upsertRoleBySlug('INSTRUCTOR', 'Instructor'),
    upsertRoleBySlug('CUSTOMER', 'Cliente'),
    upsertRoleBySlug('STAFF', 'Staff'),
  ]);

  // ───────────────── Usuarios
  const adminId = await upsertUserByEmail('admin@demo.com', {
    nombre: 'Admin Demo',
    passwordHash: '$2b$10$oc6bQbe6F67xUabv2r1.mecBi8Emco5qNTH3NUBFzUyJQRIyJDXym',
    emailVerificadoEn: new Date(),
  } as any);

  const instrId = await upsertUserByEmail('instructor@demo.com', {
    nombre: 'Instructora Demo',
    passwordHash: '$2b$10$ck3bjxlcYx/ir8YYe6rv2OrF4LVVcFI/iQI4s0FyTSkzSMBqEh/oC',
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
    where: { usuarioId_roleId: { usuarioId: instrId, roleId: rInstr.id } },
    update: {},
    create: { usuarioId: instrId, roleId: rInstr.id },
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

  // ───────────────── Categorías (árbol)
  const catMaqu = await upsertCategoriaBySlug('maquillaje', 'Maquillaje', 1);
  await upsertCategoriaBySlug('labios', 'Labios', 10, catMaqu.id);
  await upsertCategoriaBySlug('ojos', 'Ojos', 11, catMaqu.id);
  await upsertCategoriaBySlug('cejas', 'Cejas', 12, catMaqu.id);
  await upsertCategoriaBySlug('herramientas', 'Herramientas', 50, catMaqu.id);

  const catSkin = await upsertCategoriaBySlug('skincare', 'Skincare', 2);
  await upsertCategoriaBySlug('limpieza', 'Limpieza', 21, catSkin.id);
  await upsertCategoriaBySlug('tratamiento', 'Tratamiento', 22, catSkin.id);
  await upsertCategoriaBySlug('proteccion', 'Protección Solar', 23, catSkin.id);

  // ───────────────── Marcas
  await upsertMarcaBySlug('loreal', "L'Oréal", 10);
  await upsertMarcaBySlug('cerave', 'CeraVe', 20);
  await upsertMarcaBySlug('natura', 'Natura', 30);
  await upsertMarcaBySlug('maybelline', 'Maybelline', 15);
  await upsertMarcaBySlug('neutrogena', 'Neutrogena', 25);
  await upsertMarcaBySlug('revlon', 'Revlon', 16);
  await upsertMarcaBySlug('elf', 'e.l.f.', 17);
  await upsertMarcaBySlug('real-techniques', 'Real Techniques', 55);

  // ───────────────── Productos (11)
  const prodId_prueba = await upsertProductoGetId({
    slug: 'producto-de-prueba',
    titulo: 'Producto de Prueba',
    precio: 1000,
    stock: 100,
    publicado: true,
    destacado: true,
    imagen: 'producto_prueba.jpg',
    descripcionMD: 'Producto de prueba con precio 1000 para testing de pagos.',
    precioLista: 1200,
    marcaSlug: 'loreal',
    categoriaSlug: 'maquillaje',
  });

  const prodId_labial = await upsertProductoGetId({
    slug: 'labial-mate-rojo',
    titulo: 'Labial Mate Rojo',
    precio: 15000,
    stock: 120,
    publicado: true,
    destacado: true,
    imagen: 'labial1.jpg',
    descripcionMD: 'Labial mate de larga duración con acabado profesional.',
    precioLista: 18000,
    marcaSlug: 'loreal',
    categoriaSlug: 'labios',
  });

  const prodId_crema = await upsertProductoGetId({
    slug: 'crema-hidratante',
    titulo: 'Crema Hidratante Diario',
    precio: 22000,
    stock: 80,
    publicado: true,
    destacado: false,
    imagen: 'crema1.jpg',
    descripcionMD: 'Hidratación 24h con ceramidas.',
    marcaSlug: 'cerave',
    categoriaSlug: 'tratamiento',
  });

  const prodId_eyeliner = await upsertProductoGetId({
    slug: 'delineador-liquido-precision',
    titulo: 'Delineador Líquido Precisión',
    precio: 12500,
    stock: 150,
    publicado: true,
    destacado: true,
    imagen: 'eyeliner1.jpg',
    descripcionMD: 'Trazo ultra negro y resistente al agua.',
    marcaSlug: 'maybelline',
    categoriaSlug: 'ojos',
  });

  const prodId_mascara = await upsertProductoGetId({
    slug: 'mascara-volumen-extremo',
    titulo: 'Máscara Volumen Extremo',
    precio: 18000,
    stock: 95,
    publicado: true,
    destacado: true,
    imagen: 'mascara1.jpg',
    descripcionMD: 'Pestañas más largas y definidas en una pasada.',
    marcaSlug: 'revlon',
    categoriaSlug: 'ojos',
  });

  const prodId_gloss = await upsertProductoGetId({
    slug: 'gloss-hidratante-brillo-natural',
    titulo: 'Gloss Hidratante Brillo Natural',
    precio: 11000,
    stock: 140,
    publicado: true,
    destacado: false,
    imagen: 'gloss1.jpg',
    descripcionMD: 'Acabado jugoso sin sensación pegajosa.',
    marcaSlug: 'elf',
    categoriaSlug: 'labios',
  });

  const prodId_cleanser = await upsertProductoGetId({
    slug: 'gel-limpieza-suave',
    titulo: 'Gel de Limpieza Suave',
    precio: 16000,
    stock: 200,
    publicado: true,
    destacado: false,
    imagen: 'cleanser1.jpg',
    descripcionMD: 'Limpia sin resecar. Ideal uso diario.',
    marcaSlug: 'neutrogena',
    categoriaSlug: 'limpieza',
  });

  const prodId_serum = await upsertProductoGetId({
    slug: 'serum-vitamina-c-10',
    titulo: 'Sérum Vitamina C 10%',
    precio: 32000,
    stock: 60,
    publicado: true,
    destacado: true,
    imagen: 'serum1.jpg',
    descripcionMD: 'Ilumina y unifica el tono. Antioxidante diario.',
    marcaSlug: 'natura',
    categoriaSlug: 'tratamiento',
  });

  const prodId_sunscreen = await upsertProductoGetId({
    slug: 'protector-solar-fps-50',
    titulo: 'Protector Solar FPS 50',
    precio: 28000,
    stock: 110,
    publicado: true,
    destacado: true,
    imagen: 'sunscreen1.jpg',
    descripcionMD: 'Amplio espectro, textura ligera, sin rastro blanco.',
    marcaSlug: 'neutrogena',
    categoriaSlug: 'proteccion',
  });

  const prodId_toner = await upsertProductoGetId({
    slug: 'tonico-hidratante',
    titulo: 'Tónico Hidratante',
    precio: 14000,
    stock: 130,
    publicado: true,
    destacado: false,
    imagen: 'toner1.jpg',
    descripcionMD: 'Equilibra el pH y prepara la piel para el tratamiento.',
    marcaSlug: 'cerave',
    categoriaSlug: 'limpieza',
  });

  const prodId_brochas = await upsertProductoGetId({
    slug: 'set-brochas-profesional-8',
    titulo: 'Set de Brochas Profesional x8',
    precio: 26000,
    stock: 70,
    publicado: true,
    destacado: false,
    imagen: 'brochas1.jpg',
    descripcionMD: 'Cerdas sintéticas, mango ergonómico. Incluye estuche.',
    marcaSlug: 'real-techniques',
    categoriaSlug: 'herramientas',
  });

  // ───────────────── Imágenes (idempotente simple: borramos y recreamos por producto)
  const resetImgs = async (productoId: number, data: { archivo: string; alt: string; orden: number }[]) => {
    await prisma.productoImagen.deleteMany({ where: { productoId } });
    if (!data.length) return;
    await prisma.productoImagen.createMany({
      data: data.map((d) => ({ productoId, ...d })),
      skipDuplicates: true,
    });
  };

  await resetImgs(prodId_labial, [
    { archivo: 'labial1.jpg', alt: 'Labial Mate - foto 1', orden: 0 },
    { archivo: 'labial1-b.jpg', alt: 'Labial Mate - foto 2', orden: 1 },
  ]);
  await resetImgs(prodId_crema, [{ archivo: 'crema1.jpg', alt: 'Crema Hidratante - foto 1', orden: 0 }]);
  await resetImgs(prodId_eyeliner, [{ archivo: 'eyeliner1.jpg', alt: 'Delineador - foto 1', orden: 0 }]);
  await resetImgs(prodId_mascara, [{ archivo: 'mascara1.jpg', alt: 'Máscara - foto 1', orden: 0 }]);
  await resetImgs(prodId_gloss, [{ archivo: 'gloss1.jpg', alt: 'Gloss - foto 1', orden: 0 }]);
  await resetImgs(prodId_cleanser, [{ archivo: 'cleanser1.jpg', alt: 'Gel de limpieza - foto 1', orden: 0 }]);
  await resetImgs(prodId_serum, [{ archivo: 'serum1.jpg', alt: 'Sérum - foto 1', orden: 0 }]);
  await resetImgs(prodId_sunscreen, [{ archivo: 'sunscreen1.jpg', alt: 'Protector solar - foto 1', orden: 0 }]);
  await resetImgs(prodId_toner, [{ archivo: 'toner1.jpg', alt: 'Tónico - foto 1', orden: 0 }]);
  await resetImgs(prodId_brochas, [{ archivo: 'brochas1.jpg', alt: 'Set de brochas - foto 1', orden: 0 }]);

  // ───────────────── Favorito
  await prisma.favorito.upsert({
    where: { usuarioId_productoId: { usuarioId: clienteId, productoId: prodId_labial } },
    update: {},
    create: { usuarioId: clienteId, productoId: prodId_labial, creadoEn: new Date() } as any,
  });

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
    instructorId: instrId,
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
    instructorId: instrId,
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
    instructorId: instrId,
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
    instructorId: instrId,
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
    instructorId: instrId,
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
    instructorId: instrId,
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
    instructorId: instrId,
  });

  // ───────────────── Módulos + Lecciones
  const resetCurso = async (cursoId: number) => {
    await prisma.leccion.deleteMany({ where: { modulo: { cursoId } } });
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
        duracionS: 300,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modP2.id,
        titulo: 'Lección 2: Contenido Principal',
        descripcion: 'Contenido principal',
        contenido: '# Contenido Principal\n\nDetalle del curso de prueba.',
        duracionS: 600,
        orden: 1,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
      },
      {
        moduloId: modP2.id,
        titulo: 'Lección 3: Conclusión',
        descripcion: 'Cierre del curso',
        contenido: '# Conclusión\n\n¡Gracias por completar el curso!',
        duracionS: 300,
        orden: 2,
        rutaSrc: null,
        tipo: E.tipoLeccion(TipoLeccion.TEXTO),
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
          duracionS: 300,
          rutaSrc: 'intro.mp4',
          tipo: E.tipoLeccion(TipoLeccion.VIDEO),
          descripcion: 'Introducción al módulo.',
        },
        {
          moduloId: b.id,
          titulo: 'Contenido principal',
          orden: 1,
          duracionS: 600,
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
  await prisma.resena.upsert({
    where: { productoId_usuarioId: { productoId: prodId_labial, usuarioId: clienteId } },
    update: { puntaje: 5, comentario: 'Excelente pigmentación y duración.' },
    create: { productoId: prodId_labial, usuarioId: clienteId, puntaje: 5, comentario: 'Excelente pigmentación y duración.', creadoEn: new Date() } as any,
  });

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
  await prisma.itemOrden.createMany({
    data: [
      {
        ordenId,
        tipo: E.tipoItemOrden(TipoItemOrden.PRODUCTO),
        refId: prodId_labial,
        titulo: 'Labial Mate Rojo',
        cantidad: 2,
        precioUnitario: 15000,
      },
      {
        ordenId,
        tipo: E.tipoItemOrden(TipoItemOrden.CURSO),
        refId: cursoMaquId,
        titulo: 'Maquillaje Profesional',
        cantidad: 1,
        precioUnitario: 40000,
      },
    ] as any,
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
        titulo: 'Productos de Calidad Premium',
        subtitulo: 'Selección curada',
        descripcion: 'Productos probados y recomendados para resultados pro.',
        etiqueta: 'Envío a todo el país',
        ctaPrimarioTexto: 'Ver tienda',
        ctaPrimarioHref: '/tienda',
        ctaSecundarioTexto: 'Ver ofertas',
        ctaSecundarioHref: '/tienda?sort=novedades',
        alt: 'Los mejores productos para profesionales del sector',
        archivo: 'hero-productos-calidad.svg',
        activa: true,
        orden: 2,
        creadoEn: new Date(),
      },
      {
        titulo: 'Instructores Expertos',
        subtitulo: 'Aprendé de verdad',
        descripcion: 'Profesionales con experiencia real, guías paso a paso y feedback.',
        etiqueta: 'Soporte incluido',
        ctaPrimarioTexto: 'Conocer instructoras',
        ctaPrimarioHref: '/instructoras',
        ctaSecundarioTexto: 'Preguntas frecuentes',
        ctaSecundarioHref: '/faq',
        alt: 'Aprende de los mejores profesionales del sector',
        archivo: 'hero-instructores-expertos.svg',
        activa: true,
        orden: 3,
        creadoEn: new Date(),
      },
    ] as any,
    skipDuplicates: true,
  });

  // ───────────────── Resumen
  const [usuarios, productos, cursos, ordenes] = await Promise.all([
    prisma.usuario.count(),
    prisma.producto.count(),
    prisma.curso.count(),
    prisma.orden.count(),
  ]);

  console.log({ usuarios, productos, cursos, ordenes, prodId_prueba });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
