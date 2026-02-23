
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Función simple para slug
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

async function main() {
  console.log('🌱 Iniciando seed de productos reales ampliado...');

  // 1. Crear Marcas
  const nagaraku = await prisma.marca.upsert({
    where: { slug: 'nagaraku' },
    update: {},
    create: {
      nombre: 'Nagaraku',
      slug: 'nagaraku',
      activa: true,
    },
  });

  const exel = await prisma.marca.upsert({
    where: { slug: 'exel' },
    update: {},
    create: {
      nombre: 'Exel',
      slug: 'exel',
      activa: true,
    },
  });

  console.log('✅ Marcas creadas/verificadas: Nagaraku, Exel');

  // 2. Crear Categorías
  
  // Categorías Pestañas
  const catPestanas = await prisma.categoria.upsert({
    where: { slug: 'pestanas' },
    update: {},
    create: {
      nombre: 'Pestañas',
      slug: 'pestanas',
      activa: true,
    },
  });

  const catTecnologicas = await prisma.categoria.upsert({
    where: { slug: 'pestanas-tecnologicas' },
    update: {},
    create: {
      nombre: 'Pestañas Tecnológicas',
      slug: 'pestanas-tecnologicas',
      activa: true,
    },
  });

  const catAdhesivos = await prisma.categoria.upsert({
    where: { slug: 'adhesivos' },
    update: {},
    create: {
      nombre: 'Adhesivos y Preparadores',
      slug: 'adhesivos',
      activa: true,
    },
  });

  const catHerramientas = await prisma.categoria.upsert({
    where: { slug: 'herramientas-pestanas' },
    update: {},
    create: {
      nombre: 'Herramientas y Accesorios',
      slug: 'herramientas-pestanas',
      activa: true,
    },
  });

  // Categorías Cosmética (Exel)
  const catCosmetica = await prisma.categoria.upsert({
    where: { slug: 'cosmetica' },
    update: {},
    create: {
      nombre: 'Cosmética Profesional',
      slug: 'cosmetica',
      activa: true,
    },
  });

  const catFacial = await prisma.categoria.upsert({
    where: { slug: 'cuidado-facial' },
    update: {},
    create: {
      nombre: 'Cuidado Facial',
      slug: 'cuidado-facial',
      activa: true,
    },
  });

  const catCorporal = await prisma.categoria.upsert({
    where: { slug: 'cuidado-corporal' },
    update: {},
    create: {
      nombre: 'Cuidado Corporal',
      slug: 'cuidado-corporal',
      activa: true,
    },
  });

  const catSolar = await prisma.categoria.upsert({
    where: { slug: 'proteccion-solar' },
    update: {},
    create: {
      nombre: 'Protección Solar',
      slug: 'proteccion-solar',
      activa: true,
    },
  });

  console.log('✅ Categorías creadas/verificadas');

  // 3. Definir Productos
  const productos = [
    // NAGARAKU - Pestañas
    {
      titulo: 'Nagaraku 4D -U- 0.07 «D» MIX 8-15mm',
      precio: 9890,
      stock: 45,
      marcaId: nagaraku.id,
      categoriaId: catTecnologicas.id,
      descripcion: 'Extensiones de pestañas Nagaraku, fabricadas en fibra especial para un acabado natural y ligero. Curva D, grosor 0.07 mm, y mix de longitudes (8 a 15 mm). Incluye 12 líneas por bandeja.',
    },
    {
      titulo: 'Nagaraku 3D -U- 0.07 «D» MIX 8-15mm',
      precio: 14600,
      stock: 30,
      marcaId: nagaraku.id,
      categoriaId: catTecnologicas.id,
      descripcion: 'Extensiones de pestañas volumen 3D pre-armado. Ideales para lograr volumen y definición profesional en cada aplicación de manera rápida.',
    },
    {
      titulo: 'Nagaraku YY – 0.05 Curva D – Mix',
      precio: 6300,
      stock: 60,
      marcaId: nagaraku.id,
      categoriaId: catTecnologicas.id,
      descripcion: 'Pestañas tecnológicas formato YY (Y Shape). Acabado trenzado suave que otorga volumen con un look texturizado único. Grosor 0.05 para máxima ligereza.',
    },
    {
      titulo: 'Nagaraku W Shape 3D – 0.07 Mix',
      precio: 10500,
      stock: 25,
      marcaId: nagaraku.id,
      categoriaId: catTecnologicas.id,
      descripcion: 'Pestañas tecnológicas formato W (Trébol). Tres puntas por base para un volumen rápido y eficaz. Fibra suave y ligera.',
    },
    {
      titulo: 'Nagaraku Ellipse Flat - Mate 0.15 Mix',
      precio: 9000,
      stock: 40,
      marcaId: nagaraku.id,
      categoriaId: catTecnologicas.id,
      descripcion: 'Pestañas planas (Ellipse) con acabado mate. Base aplanada para mejor adherencia y menor peso. Apariencia de mayor grosor sin dañar la pestaña natural.',
    },

    // NAGARAKU - Adhesivos y Herramientas
    {
      titulo: 'Adhesivo Nagaraku Premium 5ml',
      precio: 18500,
      stock: 15,
      marcaId: nagaraku.id,
      categoriaId: catAdhesivos.id,
      descripcion: 'Pegamento profesional para extensiones de pestañas. Secado rápido (1-2 seg) y retención prolongada de hasta 6 semanas. Baja emisión de vapores.',
    },
    {
      titulo: 'Removedor en Crema Nagaraku (Green) 5g',
      precio: 10200,
      stock: 20,
      marcaId: nagaraku.id,
      categoriaId: catAdhesivos.id,
      descripcion: 'Removedor de adhesivo en crema, fórmula suave. No irrita, ideal para pieles sensibles. Color verde para fácil visualización. Acción en 3-5 minutos.',
    },
    {
      titulo: 'Pinza Nagaraku N-01 Recta (Aislar)',
      precio: 5500,
      stock: 50,
      marcaId: nagaraku.id,
      categoriaId: catHerramientas.id,
      descripcion: 'Pinza de acero inoxidable de alta precisión serie N. Punta recta fina ideal para aislar pestañas naturales con comodidad.',
    },
    {
      titulo: 'Pinza Nagaraku N-02 Curva (Volumen)',
      precio: 5800,
      stock: 45,
      marcaId: nagaraku.id,
      categoriaId: catHerramientas.id,
      descripcion: 'Pinza curva de precisión para técnica de volumen y clásica. Agarre perfecto (sweet spot) para abanicos.',
    },

    // EXEL - Facial
    {
      titulo: 'Gel Hidratante Reparador con Liposomas de Vitamina C',
      precio: 23760,
      stock: 12,
      marcaId: exel.id,
      categoriaId: catFacial.id,
      descripcion: 'Gel liviano antioxidante y reparador. Sus liposomas de Vitamina C penetran en profundidad mejorando la luminosidad y elasticidad de la piel.',
    },
    {
      titulo: 'Máscara Facial Hidratante y Reparadora con ADN',
      precio: 23200,
      stock: 10,
      marcaId: exel.id,
      categoriaId: catFacial.id,
      descripcion: 'Máscara cremosa reparadora. Contiene ADN vegetal y Ácido Hialurónico para una hidratación profunda y efecto anti-age visible.',
    },
    {
      titulo: 'Loción Herbácea Tonificante con Aloe Vera',
      precio: 15400,
      stock: 25,
      marcaId: exel.id,
      categoriaId: catFacial.id,
      descripcion: 'Tónico descongestivo y humectante. Ideal para finalizar la limpieza facial y equilibrar el pH de la piel. Para todo tipo de pieles.',
    },
    {
      titulo: 'Emulsión de Limpieza con Vitamina E',
      precio: 12500,
      stock: 30,
      marcaId: exel.id,
      categoriaId: catFacial.id,
      descripcion: 'Leche de limpieza suave que elimina maquillaje e impurezas sin resecar. Enriquecida con Vitamina E antioxidante.',
    },

    // EXEL - Corporal y Solar
    {
      titulo: 'Crema Corporal Reafirmante con Q10',
      precio: 28900,
      stock: 8,
      marcaId: exel.id,
      categoriaId: catCorporal.id,
      descripcion: 'Emulsión corporal formulada para mejorar la firmeza y elasticidad de la piel. Coenzima Q10 y Centella Asiática.',
    },
    {
      titulo: 'Gel Neutro Conductior 1kg',
      precio: 8500,
      stock: 50,
      marcaId: exel.id,
      categoriaId: catCorporal.id,
      descripcion: 'Gel base neutro de alta viscosidad para aparatología estética (ultrasonido, radiofrecuencia). Hipoalergénico y soluble en agua.',
    },
    {
      titulo: 'Protector Solar Pantalla FPS 60',
      precio: 19800,
      stock: 18,
      marcaId: exel.id,
      categoriaId: catSolar.id,
      descripcion: 'Pantalla solar de muy alta protección. Filtros UVA/UVB de amplio espectro. Textura no grasa, toque seco. Resistente al agua.',
    },
  ];

  for (const p of productos) {
    const slug = simpleSlug(p.titulo);
    await prisma.producto.upsert({
      where: { slug },
      update: {
        precio: p.precio,
        categoriaId: p.categoriaId,
        marcaId: p.marcaId,
        descripcionMD: p.descripcion,
        stock: p.stock,
      },
      create: {
        titulo: p.titulo,
        slug,
        precio: p.precio,
        stock: p.stock,
        publicado: true,
        destacado: Math.random() > 0.7, // Aleatoriamente destacados
        descripcionMD: p.descripcion,
        marcaId: p.marcaId,
        categoriaId: p.categoriaId,
      },
    });
  }

  console.log(`✨ Seed completado! Se procesaron ${productos.length} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
