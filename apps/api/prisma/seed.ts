/// <reference types="node" />
import {
  Prisma,
  PrismaClient,
  EstadoInscripcion,
  EstadoOrden,
  NivelCurso,
  TipoItemOrden,
  TipoLeccion,
} from '@prisma/client';

const prisma = new PrismaClient();
const json = (v: unknown) => v as Prisma.InputJsonValue;

/* ───────── Helpers ───────── */

const upsertRoleBySlug = (slug: string, name: string) =>
  prisma.role.upsert({
    where: { slug },
    update: { name },
    create: { slug, name, createdAt: new Date() },
  });

const upsertUserByEmail = async (email: string, data: Omit<Prisma.UsuarioCreateInput, 'email'>) => {
  await prisma.usuario.upsert({
    where: { email },
    update: { nombre: data.nombre, passwordHash: (data as any).passwordHash, emailVerificadoEn: data.emailVerificadoEn ?? undefined },
    create: { ...data, email },
  });
  const u = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
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
  const marca = p.marcaSlug ? await prisma.marca.findUnique({ where: { slug: p.marcaSlug }, select: { id: true } }) : null;
  const categoria = p.categoriaSlug ? await prisma.categoria.findUnique({ where: { slug: p.categoriaSlug }, select: { id: true } }) : null;

  await prisma.producto.upsert({
    where: { slug: p.slug },
    update: {
      titulo: p.titulo, precio: p.precio, stock: p.stock,
      publicado: p.publicado ?? true, destacado: p.destacado ?? false,
      imagen: p.imagen ?? null, descripcionMD: p.descripcionMD ?? null,
      precioLista: p.precioLista ?? null,
      marcaId: marca?.id ?? null, categoriaId: categoria?.id ?? null,
    },
    create: {
      slug: p.slug, titulo: p.titulo, precio: p.precio, stock: p.stock,
      publicado: p.publicado ?? true, destacado: p.destacado ?? false,
      imagen: p.imagen ?? null, descripcionMD: p.descripcionMD ?? null,
      precioLista: p.precioLista ?? null,
      marcaId: marca?.id ?? null, categoriaId: categoria?.id ?? null,
      creadoEn: new Date(),
    },
  });

  const prod = await prisma.producto.findUnique({ where: { slug: p.slug }, select: { id: true } });
  if (!prod) throw new Error(`No se pudo obtener producto ${p.slug}`);
  return prod.id;
};

/** Curso por slug → devuelve id Int */
const upsertCursoGetId = async (c: {
  idSlug: string; titulo: string; resumen: string; descripcionMD: string;
  precio: number; nivel: NivelCurso; portada: string; destacado?: boolean; tags?: string[];
  instructorId: number;
}) => {
  await prisma.curso.upsert({
    where: { slug: c.idSlug },
    update: {
      titulo: c.titulo, resumen: c.resumen, descripcionMD: c.descripcionMD,
      precio: c.precio, publicado: true, nivel: c.nivel,
      portada: c.portada, destacado: c.destacado ?? false, tags: json(c.tags ?? []),
      instructorId: c.instructorId,
    },
    create: {
      slug: c.idSlug, titulo: c.titulo, resumen: c.resumen, descripcionMD: c.descripcionMD,
      precio: c.precio, publicado: true, nivel: c.nivel,
      portada: c.portada, destacado: c.destacado ?? false, tags: json(c.tags ?? []),
      creadoEn: new Date(), instructorId: c.instructorId,
    },
  });
  const curso = await prisma.curso.findUnique({ where: { slug: c.idSlug }, select: { id: true } });
  if (!curso) throw new Error(`No se pudo obtener curso ${c.idSlug}`);
  return curso.id;
};

async function main() {
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
  });
  const instrId = await upsertUserByEmail('instructor@demo.com', {
    nombre: 'Instructora Demo',
    passwordHash: '$2b$10$ck3bjxlcYx/ir8YYe6rv2OrF4LVVcFI/iQI4s0FyTSkzSMBqEh/oC',
    emailVerificadoEn: new Date(),
  });
  const clienteId = await upsertUserByEmail('cliente@demo.com', {
    nombre: 'Cliente Demo',
    passwordHash: '$2b$10$lY1J9JyencWSaSqJjLnr0.n82C5pVF65rNME63FdicIskJ4LRSevi',
  });

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
  const dirCasa = await prisma.direccion.findFirst({ where: { usuarioId: clienteId, calle: 'España', numero: '350' } });
  if (!dirCasa) {
    await prisma.direccion.create({
      data: {
        usuarioId: clienteId,
        etiqueta: 'Casa', nombre: 'Cliente Demo', telefono: '3875550001',
        calle: 'España', numero: '350', pisoDepto: '2° B',
        ciudad: 'Salta', provincia: 'Salta', cp: '4400', pais: 'AR',
        predeterminada: true, creadoEn: new Date(),
      },
    });
  }
  const dirTrabajo = await prisma.direccion.findFirst({ where: { usuarioId: clienteId, calle: 'Caseros', numero: '120' } });
  if (!dirTrabajo) {
    await prisma.direccion.create({
      data: {
        usuarioId: clienteId,
        etiqueta: 'Trabajo', nombre: 'Cliente Demo', telefono: '3875550002',
        calle: 'Caseros', numero: '120',
        ciudad: 'Salta', provincia: 'Salta', cp: '4400', pais: 'AR',
        predeterminada: false, creadoEn: new Date(),
      },
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

  // ───────────────── Imágenes (limpiar por producto y recrear)
  await prisma.productoImagen.deleteMany({ where: { productoId: prodId_labial } });
  await prisma.productoImagen.createMany({
    data: [
      { productoId: prodId_labial, archivo: 'labial1.jpg', alt: 'Labial Mate - foto 1', orden: 0 },
      { productoId: prodId_labial, archivo: 'labial1-b.jpg', alt: 'Labial Mate - foto 2', orden: 1 },
    ],
    skipDuplicates: true,
  });
  await prisma.productoImagen.upsert({
    where: { id: 0 }, update: {}, create: { productoId: prodId_crema, archivo: 'crema1.jpg', alt: 'Crema Hidratante - foto 1', orden: 0 },
  }).catch(async () => {
    const exists = await prisma.productoImagen.findFirst({ where: { productoId: prodId_crema, archivo: 'crema1.jpg' } });
    if (!exists) await prisma.productoImagen.create({ data: { productoId: prodId_crema, archivo: 'crema1.jpg', alt: 'Crema Hidratante - foto 1', orden: 0 } });
  });
  // (para el resto, crea una sola imagen base si no existe)
  const ensureImg = (productoId: number, archivo: string, alt: string) =>
    prisma.productoImagen.upsert({
      where: { id: 0 }, update: {}, create: { productoId, archivo, alt, orden: 0 },
    }).catch(async () => {
      const e = await prisma.productoImagen.findFirst({ where: { productoId, archivo } });
      if (!e) await prisma.productoImagen.create({ data: { productoId, archivo, alt, orden: 0 } });
    });
  await ensureImg(prodId_eyeliner, 'eyeliner1.jpg', 'Delineador - foto 1');
  await ensureImg(prodId_mascara, 'mascara1.jpg', 'Máscara - foto 1');
  await ensureImg(prodId_gloss, 'gloss1.jpg', 'Gloss - foto 1');
  await ensureImg(prodId_cleanser, 'cleanser1.jpg', 'Gel de limpieza - foto 1');
  await ensureImg(prodId_serum, 'serum1.jpg', 'Sérum - foto 1');
  await ensureImg(prodId_sunscreen, 'sunscreen1.jpg', 'Protector solar - foto 1');
  await ensureImg(prodId_toner, 'toner1.jpg', 'Tónico - foto 1');
  await ensureImg(prodId_brochas, 'brochas1.jpg', 'Set de brochas - foto 1');

  // ───────────────── Favorito
  await prisma.favorito.upsert({
    where: { usuarioId_productoId: { usuarioId: clienteId, productoId: prodId_labial } },
    update: {},
    create: { usuarioId: clienteId, productoId: prodId_labial, creadoEn: new Date() },
  });

  // ───────────────── Cursos (incluye curso de prueba)
  const cursoPruebaId = await upsertCursoGetId({
    idSlug: 'curso-de-prueba',
    titulo: 'Curso de Prueba',
    resumen: 'Curso para testing de suscripciones mensuales.',
    descripcionMD: 'Este es un curso de prueba para verificar el funcionamiento de las suscripciones mensuales en MercadoPago.',
    precio: 1000,
    nivel: NivelCurso.BASICO,
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

  // ───────────────── Módulos + Lecciones (maquillaje completo + curso de prueba)
  // Limpieza previa de módulos/lecciones por curso (para idempotencia)
  const resetCurso = async (cursoId: number) => {
    await prisma.leccion.deleteMany({ where: { modulo: { cursoId } } });
    await prisma.modulo.deleteMany({ where: { cursoId } });
  };

  // Curso de Prueba
  await resetCurso(cursoPruebaId);
  const modP1 = await prisma.modulo.create({ data: { cursoId: cursoPruebaId, titulo: 'Módulo 1: Introducción', orden: 1 } });
  const modP2 = await prisma.modulo.create({ data: { cursoId: cursoPruebaId, titulo: 'Módulo 2: Contenido Principal', orden: 2 } });
  await prisma.leccion.createMany({
    data: [
      { moduloId: modP1.id, titulo: 'Lección 1: Bienvenida', descripcion: 'Bienvenida al curso de prueba', contenido: '# Bienvenida\n\nEste es un curso para probar suscripciones.', duracionS: 300, orden: 1, rutaSrc: null, tipo: TipoLeccion.TEXTO },
      { moduloId: modP2.id, titulo: 'Lección 2: Contenido Principal', descripcion: 'Contenido principal', contenido: '# Contenido Principal\n\nDetalle del curso de prueba.', duracionS: 600, orden: 1, rutaSrc: null, tipo: TipoLeccion.TEXTO },
      { moduloId: modP2.id, titulo: 'Lección 3: Conclusión', descripcion: 'Cierre del curso', contenido: '# Conclusión\n\n¡Gracias por completar el curso!', duracionS: 300, orden: 2, rutaSrc: null, tipo: TipoLeccion.TEXTO },
    ],
  });

  // Maquillaje Profesional (m1..m5 + 15 lecciones resumidas)
  await resetCurso(cursoMaquId);
  const [m1, m2, m3, m4, m5] = await Promise.all([
    prisma.modulo.create({ data: { cursoId: cursoMaquId, titulo: 'Fundamentos y kit inicial', orden: 1 } }),
    prisma.modulo.create({ data: { cursoId: cursoMaquId, titulo: 'Técnicas y acabados', orden: 2 } }),
    prisma.modulo.create({ data: { cursoId: cursoMaquId, titulo: 'Base y corrección', orden: 3 } }),
    prisma.modulo.create({ data: { cursoId: cursoMaquId, titulo: 'Contouring y highlighting', orden: 4 } }),
    prisma.modulo.create({ data: { cursoId: cursoMaquId, titulo: 'Looks completos y portfolio', orden: 5 } }),
  ]);

  await prisma.leccion.createMany({
    data: [
      // M1
      { moduloId: m1.id, titulo: 'Herramientas esenciales', orden: 1, duracionS: 480, rutaSrc: 'herramientas-esenciales-20251028-003311-c00531.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Herramientas básicas.' },
      { moduloId: m1.id, titulo: 'Higiene y preparación de piel', orden: 2, duracionS: 540, rutaSrc: null, tipo: TipoLeccion.TEXTO, descripcion: 'Protocolos de higiene.', contenido: json({ tipo: 'TEXTO', data: { contenido: '## Higiene y preparación de la piel\n\nAntes de maquillar, la piel debe estar limpia y preparada.\n\n1. **Limpieza suave:** elimina impurezas con un limpiador adecuado.\n2. **Tónico equilibrante:** ayuda a regular el pH y cerrar poros.\n3. **Hidratación:** crema o gel según tipo de piel.\n4. **Protección solar:** imprescindible durante el día.\n\n> Consejo: evita productos demasiado grasos antes del maquillaje para mejorar la fijación.' } }) },
      { moduloId: m1.id, titulo: 'Teoría del color en maquillaje', orden: 3, duracionS: 420, rutaSrc: 'teoria-color-maquillaje.pdf', tipo: TipoLeccion.DOCUMENTO, descripcion: 'Guía de color.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/teoria-color-maquillaje.pdf', nombre: 'Teoría del Color', tipoArchivo: 'PDF' } }) },
      // M2
      { moduloId: m2.id, titulo: 'Smokey eye clásico', orden: 1, duracionS: 600, rutaSrc: 'smokey-eye-cl-sico-20250917-120656-dda191.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Smokey paso a paso.' },
      { moduloId: m2.id, titulo: 'Acabado mate de larga duración', orden: 2, duracionS: 660, rutaSrc: 'acabado-mate-duracion.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Acabado mate perfecto.' },
      { moduloId: m2.id, titulo: 'Quiz: Técnicas básicas', orden: 3, duracionS: 300, rutaSrc: null, tipo: TipoLeccion.QUIZ, descripcion: 'Evalúa tus conocimientos.', contenido: json({ tipo: 'QUIZ', data: { configuracion: { mostrarResultados: true, permitirReintentos: true, puntajeMinimo: 70 }, preguntas: [
        { pregunta: '¿Primer paso del smokey?', opciones: ['Sombra oscura', 'Primer en párpado', 'Delineado', 'Máscara'], respuestaCorrecta: 1, explicacion: 'El primer ayuda a fijar las sombras y evita pliegues.' },
        { pregunta: '¿Cómo se logra un degradé suave?', opciones: ['Con un pincel rígido', 'Difuminando con movimiento circular', 'Aplicando mucha cantidad de sombra', 'Con delineador líquido'], respuestaCorrecta: 1, explicacion: 'Los movimientos circulares con pincel de difuminar generan transiciones suaves.' },
        { pregunta: '¿Cuál es el último paso antes de finalizar el ojo?', opciones: ['Máscara de pestañas', 'Base de maquillaje', 'Rubor', 'Corrector'], respuestaCorrecta: 0, explicacion: 'La máscara define y completa el look del ojo.' }
      ] } }) },
      // M3
      { moduloId: m3.id, titulo: 'Elección del tono de base perfecto', orden: 1, duracionS: 480, rutaSrc: 'tono-base-perfecto.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Identificar tono ideal.' },
      { moduloId: m3.id, titulo: 'Corrección de ojeras y manchas', orden: 2, duracionS: 540, rutaSrc: null, tipo: TipoLeccion.TEXTO, descripcion: 'Técnicas de corrección.', contenido: json({ tipo: 'TEXTO', data: { contenido: '## Corrección de ojeras y manchas\n\n- **Pre-corrección:** neutraliza tonos con correctores (salmones para ojeras, verdes para rojeces).\n- **Cobertura:** aplica una capa fina de corrector y difumina con esponja.\n- **Sellado:** fija con polvo traslúcido para evitar pliegues.' } }) },
      { moduloId: m3.id, titulo: 'Guía de productos correctores', orden: 3, duracionS: 360, rutaSrc: 'guia-correctores.pdf', tipo: TipoLeccion.DOCUMENTO, descripcion: 'Guía completa.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/guia-productos-correctores.pdf', nombre: 'Guía Correctores', tipoArchivo: 'PDF' } }) },
      // M4
      { moduloId: m4.id, titulo: 'Contouring según forma de rostro', orden: 1, duracionS: 720, rutaSrc: 'contouring-seg-n-forma-de-rostro-20250917-115233-6a2a28.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Adaptación por rostro.' },
      { moduloId: m4.id, titulo: 'Técnicas de iluminación natural', orden: 2, duracionS: 600, rutaSrc: null, tipo: TipoLeccion.TEXTO, descripcion: 'Highlight natural.', contenido: json({ tipo: 'TEXTO', data: { contenido: '## Iluminación natural\n\nUbica el iluminador en puntos altos del rostro: pómulos, puente de la nariz, arco de cupido y lagrimal.\n\n- **Textura:** líquida o crema para finish natural.\n- **Aplicación:** con brocha pequeña o dedos, a toques.\n- **Evita zonas con textura:** para no enfatizar imperfecciones.' } }) },
      { moduloId: m4.id, titulo: 'Quiz: Contouring avanzado', orden: 3, duracionS: 420, rutaSrc: null, tipo: TipoLeccion.QUIZ, descripcion: 'Evalúa contouring.', contenido: json({ tipo: 'QUIZ', data: { configuracion: { mostrarResultados: true, permitirReintentos: true, puntajeMinimo: 70 }, preguntas: [
        { pregunta: 'Regla para rostro redondo', opciones: ['Toda la mejilla', 'Líneas verticales', 'Muy oscuro', 'Sin contorno'], respuestaCorrecta: 1, explicacion: 'Las líneas verticales ayudan a estilizar y evitar ampliar el ancho del rostro.' },
        { pregunta: 'Para rostro cuadrado, ¿dónde suavizar?', opciones: ['Ángulo mandibular', 'Centro de la frente', 'Barbilla', 'Puente nasal'], respuestaCorrecta: 0, explicacion: 'El ángulo mandibular se suaviza para reducir la sensación de aristas marcadas.' },
        { pregunta: '¿Qué tono usar para contorno?', opciones: ['Más claro que la piel', 'Exactamente igual', '1-2 tonos más oscuro, subtono frío', 'Muy cálido'], respuestaCorrecta: 2, explicacion: 'Un tono 1-2 pasos más oscuro con subtono frío genera sombras más naturales.' }
      ] } }) },
      // M5
      { moduloId: m5.id, titulo: 'Look natural de día', orden: 1, duracionS: 900, rutaSrc: 'look-natural-dia.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Look fresco y luminoso.' },
      { moduloId: m5.id, titulo: 'Look glamoroso de noche', orden: 2, duracionS: 1080, rutaSrc: 'look-glamoroso-noche.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Looks sofisticados.' },
      { moduloId: m5.id, titulo: 'Creando tu portfolio profesional', orden: 3, duracionS: 720, rutaSrc: 'guia-portfolio.pdf', tipo: TipoLeccion.DOCUMENTO, descripcion: 'Guía portfolio.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/guia-portfolio-profesional.pdf', nombre: 'Guía Portfolio', tipoArchivo: 'PDF' } }) },
    ],
  });

  // Cursos restantes: dos módulos y 2 lecciones base para demo
  const bootstrapCurso = async (cursoId: number, titulo1: string, titulo2: string) => {
    await resetCurso(cursoId);
    const a = await prisma.modulo.create({ data: { cursoId, titulo: titulo1, orden: 1 } });
    const b = await prisma.modulo.create({ data: { cursoId, titulo: titulo2, orden: 2 } });
    await prisma.leccion.createMany({
      data: [
        { moduloId: a.id, titulo: 'Introducción', orden: 1, duracionS: 300, rutaSrc: 'intro.mp4', tipo: TipoLeccion.VIDEO, descripcion: 'Introducción al módulo.' },
        { moduloId: b.id, titulo: 'Contenido principal', orden: 1, duracionS: 600, rutaSrc: null, tipo: TipoLeccion.TEXTO, descripcion: 'Contenido base.', contenido: '# Contenido\n\nDetalles del módulo.' },
      ],
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
      estado: EstadoInscripcion.ACTIVADA,
      progreso: json({
        completado: [],
        subscription: {
          duration: '1',
          durationType: 'mes',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        },
      }),
    },
    create: {
      usuarioId: clienteId,
      cursoId: cursoMaquId,
      estado: EstadoInscripcion.ACTIVADA,
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
    },
  });

  // ───────────────── Reseña DEMO (producto)
  await prisma.resena.upsert({
    where: { productoId_usuarioId: { productoId: prodId_labial, usuarioId: clienteId } },
    update: { puntaje: 5, comentario: 'Excelente pigmentación y duración.' },
    create: { productoId: prodId_labial, usuarioId: clienteId, puntaje: 5, comentario: 'Excelente pigmentación y duración.', creadoEn: new Date() },
  });

  // ───────────────── Orden + Ítems (refId Int)
  const refPago = 'MP-REF-0001';
  const existingOrder = await prisma.orden.findFirst({ where: { referenciaPago: refPago }, select: { id: true } });
  const ordenId = existingOrder
    ? existingOrder.id
    : (await prisma.orden.create({
        data: {
          usuarioId: clienteId,
          estado: EstadoOrden.PAGADO,
          total: 70000,
          moneda: 'ARS',
          referenciaPago: refPago,
          creadoEn: new Date(),
        },
        select: { id: true },
      })).id;

  await prisma.itemOrden.deleteMany({ where: { ordenId } });
  await prisma.itemOrden.createMany({
    data: [
      {
        ordenId,
        tipo: TipoItemOrden.PRODUCTO,
        refId: prodId_labial,
        titulo: 'Labial Mate Rojo',
        cantidad: 2,
        precioUnitario: 15000,
      },
      {
        ordenId,
        tipo: TipoItemOrden.CURSO,
        refId: cursoMaquId,
        titulo: 'Maquillaje Profesional',
        cantidad: 1,
        precioUnitario: 40000,
      },
    ],
  });

  // ───────────────── Slider
  await prisma.slider.deleteMany({});
  await prisma.slider.createMany({
    data: [
      { titulo: 'Cursos Online Profesionales', alt: 'Aprende técnicas profesionales con nuestros cursos online', archivo: 'hero-cursos-online.svg', activa: true, orden: 1, creadoEn: new Date() },
      { titulo: 'Productos de Calidad Premium', alt: 'Los mejores productos para profesionales del sector', archivo: 'hero-productos-calidad.svg', activa: true, orden: 2, creadoEn: new Date() },
      { titulo: 'Instructores Expertos', alt: 'Aprende de los mejores profesionales del sector', archivo: 'hero-instructores-expertos.svg', activa: true, orden: 3, creadoEn: new Date() },
    ],
    skipDuplicates: true,
  });

  // ───────────────── Resumen
  const [usuarios, productos, cursos, ordenes] = await Promise.all([
    prisma.usuario.count(),
    prisma.producto.count(),
    prisma.curso.count(),
    prisma.orden.count(),
  ]);
  console.log({ usuarios, productos, cursos, ordenes });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
