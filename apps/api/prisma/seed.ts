
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
  slug: string; titulo: string; precio: number | string; stock: number;
  publicado?: boolean; destacado?: boolean; imagen?: string | null;
  descripcionMD?: string | null; descuento?: number | string | null;
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
      precio: new Prisma.Decimal(p.precio) as any,
      stock: p.stock,
      publicado: p.publicado ?? true,
      destacado: p.destacado ?? false,
      imagen: p.imagen ?? null,
      descripcionMD: p.descripcionMD ?? null,
      descuento: new Prisma.Decimal(p.descuento ?? 0) as any,
      marcaId: marca?.id ?? null,
      categoriaId: categoria?.id ?? null,
    },
    create: {
      slug: p.slug,
      titulo: p.titulo,
      precio: new Prisma.Decimal(p.precio) as any,
      stock: p.stock,
      publicado: p.publicado ?? true,
      destacado: p.destacado ?? false,
      imagen: p.imagen ?? null,
      descripcionMD: p.descripcionMD ?? null,
      descuento: new Prisma.Decimal(p.descuento ?? 0) as any,
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
  precio: number | string;
  nivel: NivelCurso | string; // aceptamos string para que no te mate el bug
  portada: string;
  destacado?: boolean;
  descuento?: number | string;
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
      precio: new Prisma.Decimal(c.precio),
      publicado: true,
      nivel: nivelKey,
      portada: c.portada,
      destacado: c.destacado ?? false,
      descuento: new Prisma.Decimal(c.descuento ?? 0),
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
      precio: new Prisma.Decimal(c.precio),
      publicado: true,
      nivel: nivelKey,
      portada: c.portada,
      destacado: c.destacado ?? false,
      descuento: new Prisma.Decimal(c.descuento ?? 0),
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

  // ───────────────── Módulos + Lecciones
  async function resetCurso(cursoId: number) {
    const modulos = await prisma.modulo.findMany({
      where: { cursoId },
      select: { id: true },
    });
    const moduloIds = modulos.map((m) => m.id);

    if (moduloIds.length > 0) {
      await prisma.leccion.deleteMany({ where: { moduloId: { in: moduloIds } } });
    }
    await prisma.modulo.deleteMany({ where: { cursoId } });
  }

  // ───────────────── Cursos (únicamente Lifting de Pestañas)
  const cursoLiftingId = await upsertCursoGetId({
    idSlug: 'lifting-de-pestanas',
    titulo: 'Lifting de pestañas',
    resumen: 'Aprende la técnica de lifting para realzar la mirada.',
    descripcionMD: 'Curso profesional sobre lifting de pestañas paso a paso.',
    precio: 35000,
    nivel: NivelCurso.BASICO,
    portada: 'curso-lifting.jpg',
    destacado: true,
    tags: ['lifting', 'pestañas', 'mirada'],
    queAprenderas: ['Técnica de lifting', 'Materiales necesarios', 'Cuidados post-tratamiento'],
    videoPreview: 'https://cdn.coverr.co/videos/coverr-shaping-eyebrows-5266/1080p.mp4',
    requisitos: ['Sin conocimientos previos.', 'Kit de lifting (opcional para práctica).'],
  });

  await resetCurso(cursoLiftingId);
  const modL1 = await prisma.modulo.create({
    data: { cursoId: cursoLiftingId, titulo: 'Módulo 1: Técnica de Lifting', orden: 1 } as any,
  });

  await prisma.leccion.create({
    data: {
      moduloId: modL1.id,
      titulo: 'Lección 1: Procedimiento paso a paso',
      descripcion: 'Video tutorial detallado del procedimiento de lifting.',
      duracion: 20,
      orden: 1,
      rutaSrc: 'lifting-tutorial.mp4',
      tipo: E.tipoLeccion(TipoLeccion.VIDEO),
    } as any,
  });

  // ───────────────── Inscripción DEMO
  await prisma.inscripcion.upsert({
    where: { usuarioId_cursoId: { usuarioId: clienteId, cursoId: cursoLiftingId } },
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
      cursoId: cursoLiftingId,
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
            total: new Prisma.Decimal(70000),
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
      precioUnitario: new Prisma.Decimal(demoProductPrice),
    });
  }
  
  itemsOrdenData.push({
      ordenId,
      tipo: E.tipoItemOrden(TipoItemOrden.CURSO),
      refId: cursoLiftingId,
      titulo: 'Lifting de pestañas',
      cantidad: 1,
      precioUnitario: new Prisma.Decimal(35000),
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
