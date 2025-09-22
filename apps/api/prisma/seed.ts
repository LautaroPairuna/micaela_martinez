// apps/api/prisma/seed.ts
/// <reference types="node" />
import {
  Prisma,
  PrismaClient,
  NivelCurso,
  EstadoInscripcion,
  EstadoOrden,
  TipoItemOrden,
} from '@prisma/client';

const prisma = new PrismaClient();
const json = (v: unknown) => v as Prisma.InputJsonValue;

async function main() {
  // ── IDs legibles
  const ids = {
    roles: {
      admin: 'role_admin_01',
      instructor: 'role_instructor_01',
      customer: 'role_customer_01',
      staff: 'role_staff_01',
    },
    users: {
      admin: 'usr_admin_01',
      instructor: 'usr_instr_01',
      cliente: 'usr_cliente_01',
    },
    dirs: { envio: 'dir_env_01', factura: 'dir_fac_01' },
    // categorías (árbol)
    cats: {
      maqu: 'cat_maquillaje',
      labios: 'cat_labios',
      skin: 'cat_skincare',
      ojos: 'cat_ojos',
      cejas: 'cat_cejas',
      herramientas: 'cat_herramientas',
      limpieza: 'cat_limpieza',
      tratamiento: 'cat_tratamiento',
      proteccion: 'cat_proteccion',
    },
    // marcas
    brands: {
      loreal: 'brand_loreal',
      cerave: 'brand_cerave',
      natura: 'brand_natura',
      maybelline: 'brand_maybelline',
      neutrogena: 'brand_neutrogena',
      revlon: 'brand_revlon',
      elf: 'brand_elf',
      realtech: 'brand_realtech',
    },
    // productos
    prods: {
      labial: 'prd_labial_01',
      crema: 'prd_crema_01',
      eyeliner: 'prd_eyeliner_01',
      mascara: 'prd_mascara_01',
      gloss: 'prd_gloss_01',
      cleanser: 'prd_cleanser_01',
      serum: 'prd_serum_01',
      sunscreen: 'prd_sunscreen_01',
      toner: 'prd_toner_01',
      brochas: 'prd_brochas_01',
    },
    // imágenes de producto
    imgs: {
      p1a: 'img_p1_01',
      p1b: 'img_p1_02',
      p2a: 'img_p2_01',
      eyeliner: 'img_eyeliner_01',
      mascara: 'img_mascara_01',
      gloss: 'img_gloss_01',
      cleanser: 'img_cleanser_01',
      serum: 'img_serum_01',
      sunscreen: 'img_sunscreen_01',
      toner: 'img_toner_01',
      brochas: 'img_brochas_01',
    },
    fav: { f1: 'fav_ucli_p1' },
    // cursos
    cursos: {
      maqu: 'curso_maqu_01',
      skin: 'curso_skin_01',
      ojosAvz: 'curso_ojos_avz_01',
      cejas: 'curso_cejas_01',
      dermo: 'curso_dermo_01',
      skinSens: 'curso_skin_sens_01',
    },
    mods: {
      m1: 'mod1_cmaqu',
      m2: 'mod2_cmaqu',
      m3: 'mod3_cmaqu',
      m4: 'mod4_cmaqu',
      m5: 'mod5_cmaqu',
      oj1: 'mod_ojos_01',
      oj2: 'mod_ojos_02',
      cj1: 'mod_cejas_01',
      cj2: 'mod_cejas_02',
      de1: 'mod_dermo_01',
      de2: 'mod_dermo_02',
      ss1: 'mod_skin_sens_01',
      ss2: 'mod_skin_sens_02',
    },
    lecs: {
      l1: 'lec1_mod1',
      l2: 'lec2_mod1',
      l3: 'lec3_mod1',
      l4: 'lec4_mod2',
      l5: 'lec5_mod2',
      l6: 'lec6_mod2',
      l7: 'lec7_mod3',
      l8: 'lec8_mod3',
      l9: 'lec9_mod3',
      l10: 'lec10_mod4',
      l11: 'lec11_mod4',
      l12: 'lec12_mod4',
      l13: 'lec13_mod5',
      l14: 'lec14_mod5',
      l15: 'lec15_mod5',
      // ojos avanzados
      oj1a: 'lec_oj1_a',
      oj1b: 'lec_oj1_b',
      oj2a: 'lec_oj2_a',
      oj2b: 'lec_oj2_b',
      // cejas
      cj1a: 'lec_cj1_a',
      cj1b: 'lec_cj1_b',
      cj2a: 'lec_cj2_a',
      cj2b: 'lec_cj2_b',
      // dermo
      de1a: 'lec_de1_a',
      de1b: 'lec_de1_b',
      de2a: 'lec_de2_a',
      de2b: 'lec_de2_b',
      // skin sensible
      ss1a: 'lec_ss1_a',
      ss1b: 'lec_ss1_b',
      ss2a: 'lec_ss2_a',
      ss2b: 'lec_ss2_b',
    },
    insc: { i1: 'insc_ucli_cmaqu' },
    revs: { prod1: 'rev_prod1_ucli', curso1: 'rev_curso1_ucli' },
    orden: { o1: 'ord_0001', itm1: 'itm_ord1_p1', itm2: 'itm_ord1_c1' },
  };

  // ───────────────── Roles
  await prisma.role.upsert({
    where: { id: ids.roles.admin },
    update: { name: 'Administrador', slug: 'ADMIN' },
    create: { id: ids.roles.admin, name: 'Administrador', slug: 'ADMIN', createdAt: new Date() },
  });
  await prisma.role.upsert({
    where: { id: ids.roles.instructor },
    update: { name: 'Instructor', slug: 'INSTRUCTOR' },
    create: { id: ids.roles.instructor, name: 'Instructor', slug: 'INSTRUCTOR', createdAt: new Date() },
  });
  await prisma.role.upsert({
    where: { id: ids.roles.customer },
    update: { name: 'Cliente', slug: 'CUSTOMER' },
    create: { id: ids.roles.customer, name: 'Cliente', slug: 'CUSTOMER', createdAt: new Date() },
  });
  await prisma.role.upsert({
    where: { id: ids.roles.staff },
    update: { name: 'Staff', slug: 'STAFF' },
    create: { id: ids.roles.staff, name: 'Staff', slug: 'STAFF', createdAt: new Date() },
  });

  // ───────────────── Usuarios
  await prisma.usuario.upsert({
    where: { id: ids.users.admin },
    update: { nombre: 'Admin Demo' },
    create: {
      id: ids.users.admin,
      email: 'admin@demo.com',
      nombre: 'Admin Demo',
      passwordHash: '$2b$10$oc6bQbe6F67xUabv2r1.mecBi8Emco5qNTH3NUBFzUyJQRIyJDXym',
      creadoEn: new Date(),
      emailVerificadoEn: new Date(),
    },
  });
  await prisma.usuario.upsert({
    where: { id: ids.users.instructor },
    update: { nombre: 'Instructora Demo' },
    create: {
      id: ids.users.instructor,
      email: 'instructor@demo.com',
      nombre: 'Instructora Demo',
      passwordHash: '$2b$10$ck3bjxlcYx/ir8YYe6rv2OrF4LVVcFI/iQI4s0FyTSkzSMBqEh/oC',
      creadoEn: new Date(),
      emailVerificadoEn: new Date(),
    },
  });
  await prisma.usuario.upsert({
    where: { id: ids.users.cliente },
    update: { nombre: 'Cliente Demo' },
    create: {
      id: ids.users.cliente,
      email: 'cliente@demo.com',
      nombre: 'Cliente Demo',
      passwordHash: '$2b$10$lY1J9JyencWSaSqJjLnr0.n82C5pVF65rNME63FdicIskJ4LRSevi',
      creadoEn: new Date(),
      emailVerificadoEn: null,
    },
  });

  // ───────────────── Usuario ↔ Rol
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: ids.users.admin, roleId: ids.roles.admin } },
    update: {},
    create: { usuarioId: ids.users.admin, roleId: ids.roles.admin },
  });
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: ids.users.admin, roleId: ids.roles.staff } },
    update: {},
    create: { usuarioId: ids.users.admin, roleId: ids.roles.staff },
  });
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: ids.users.instructor, roleId: ids.roles.instructor } },
    update: {},
    create: { usuarioId: ids.users.instructor, roleId: ids.roles.instructor },
  });
  await prisma.usuarioRol.upsert({
    where: { usuarioId_roleId: { usuarioId: ids.users.cliente, roleId: ids.roles.customer } },
    update: {},
    create: { usuarioId: ids.users.cliente, roleId: ids.roles.customer },
  });

  // ───────────────── Direcciones
  await prisma.direccion.upsert({
    where: { id: ids.dirs.envio },
    update: {
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
    },
    create: {
      id: ids.dirs.envio,
      usuarioId: ids.users.cliente,
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
    },
  });
  await prisma.direccion.upsert({
    where: { id: ids.dirs.factura },
    update: {
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
    },
    create: {
      id: ids.dirs.factura,
      usuarioId: ids.users.cliente,
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
    },
  });

  // ───────────────── Categorías (padre → hijo)
  await prisma.categoria.upsert({
    where: { id: ids.cats.maqu },
    update: { nombre: 'Maquillaje', slug: 'maquillaje', activa: true, orden: 1 },
    create: {
      id: ids.cats.maqu,
      nombre: 'Maquillaje',
      slug: 'maquillaje',
      activa: true,
      orden: 1,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.labios },
    update: { nombre: 'Labios', slug: 'labios', activa: true, orden: 10, parentId: ids.cats.maqu },
    create: {
      id: ids.cats.labios,
      nombre: 'Labios',
      slug: 'labios',
      activa: true,
      orden: 10,
      parentId: ids.cats.maqu,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.ojos },
    update: { nombre: 'Ojos', slug: 'ojos', activa: true, orden: 11, parentId: ids.cats.maqu },
    create: {
      id: ids.cats.ojos,
      nombre: 'Ojos',
      slug: 'ojos',
      activa: true,
      orden: 11,
      parentId: ids.cats.maqu,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.cejas },
    update: { nombre: 'Cejas', slug: 'cejas', activa: true, orden: 12, parentId: ids.cats.maqu },
    create: {
      id: ids.cats.cejas,
      nombre: 'Cejas',
      slug: 'cejas',
      activa: true,
      orden: 12,
      parentId: ids.cats.maqu,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.herramientas },
    update: { nombre: 'Herramientas', slug: 'herramientas', activa: true, orden: 50, parentId: ids.cats.maqu },
    create: {
      id: ids.cats.herramientas,
      nombre: 'Herramientas',
      slug: 'herramientas',
      activa: true,
      orden: 50,
      parentId: ids.cats.maqu,
      creadoEn: new Date(),
    },
  });

  await prisma.categoria.upsert({
    where: { id: ids.cats.skin },
    update: { nombre: 'Skincare', slug: 'skincare', activa: true, orden: 2 },
    create: {
      id: ids.cats.skin,
      nombre: 'Skincare',
      slug: 'skincare',
      activa: true,
      orden: 2,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.limpieza },
    update: { nombre: 'Limpieza', slug: 'limpieza', activa: true, orden: 21, parentId: ids.cats.skin },
    create: {
      id: ids.cats.limpieza,
      nombre: 'Limpieza',
      slug: 'limpieza',
      activa: true,
      orden: 21,
      parentId: ids.cats.skin,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.tratamiento },
    update: { nombre: 'Tratamiento', slug: 'tratamiento', activa: true, orden: 22, parentId: ids.cats.skin },
    create: {
      id: ids.cats.tratamiento,
      nombre: 'Tratamiento',
      slug: 'tratamiento',
      activa: true,
      orden: 22,
      parentId: ids.cats.skin,
      creadoEn: new Date(),
    },
  });
  await prisma.categoria.upsert({
    where: { id: ids.cats.proteccion },
    update: { nombre: 'Protección Solar', slug: 'proteccion', activa: true, orden: 23, parentId: ids.cats.skin },
    create: {
      id: ids.cats.proteccion,
      nombre: 'Protección Solar',
      slug: 'proteccion',
      activa: true,
      orden: 23,
      parentId: ids.cats.skin,
      creadoEn: new Date(),
    },
  });

  // ───────────────── Marcas
  const mk = prisma.marca;
  await mk.upsert({ where: { id: ids.brands.loreal }, update: { nombre: "L'Oréal", slug: 'loreal', activa: true, orden: 10 }, create: { id: ids.brands.loreal, nombre: "L'Oréal", slug: 'loreal', activa: true, orden: 10, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.cerave }, update: { nombre: 'CeraVe', slug: 'cerave', activa: true, orden: 20 }, create: { id: ids.brands.cerave, nombre: 'CeraVe', slug: 'cerave', activa: true, orden: 20, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.natura }, update: { nombre: 'Natura', slug: 'natura', activa: true, orden: 30 }, create: { id: ids.brands.natura, nombre: 'Natura', slug: 'natura', activa: true, orden: 30, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.maybelline }, update: { nombre: 'Maybelline', slug: 'maybelline', activa: true, orden: 15 }, create: { id: ids.brands.maybelline, nombre: 'Maybelline', slug: 'maybelline', activa: true, orden: 15, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.neutrogena }, update: { nombre: 'Neutrogena', slug: 'neutrogena', activa: true, orden: 25 }, create: { id: ids.brands.neutrogena, nombre: 'Neutrogena', slug: 'neutrogena', activa: true, orden: 25, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.revlon }, update: { nombre: 'Revlon', slug: 'revlon', activa: true, orden: 16 }, create: { id: ids.brands.revlon, nombre: 'Revlon', slug: 'revlon', activa: true, orden: 16, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.elf }, update: { nombre: 'e.l.f.', slug: 'elf', activa: true, orden: 17 }, create: { id: ids.brands.elf, nombre: 'e.l.f.', slug: 'elf', activa: true, orden: 17, creadoEn: new Date() }});
  await mk.upsert({ where: { id: ids.brands.realtech }, update: { nombre: 'Real Techniques', slug: 'real-techniques', activa: true, orden: 55 }, create: { id: ids.brands.realtech, nombre: 'Real Techniques', slug: 'real-techniques', activa: true, orden: 55, creadoEn: new Date() }});

  // ───────────────── Productos (10 en total)
  const pd = prisma.producto;
  await pd.upsert({
    where: { id: ids.prods.labial },
    update: {
      titulo: 'Labial Mate Rojo',
      slug: 'labial-mate-rojo',
      sku: 'LIP-MATE-ROJO',
      precio: 15000,
      stock: 120,
      publicado: true,
      destacado: true,
      imagen: 'labial1.jpg',
      descripcionMD: 'Labial mate de larga duración con acabado profesional.',
      precioLista: 18000,

      marcaId: ids.brands.loreal,
      categoriaId: ids.cats.labios,
    },
    create: {
      id: ids.prods.labial,
      titulo: 'Labial Mate Rojo',
      slug: 'labial-mate-rojo',
      sku: 'LIP-MATE-ROJO',
      precio: 15000,
      stock: 120,
      publicado: true,
      destacado: true,
      imagen: 'labial1.jpg',
      descripcionMD: 'Labial mate de larga duración con acabado profesional.',
      precioLista: 18000,

      creadoEn: new Date(),
      marcaId: ids.brands.loreal,
      categoriaId: ids.cats.labios,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.crema },
    update: {
      titulo: 'Crema Hidratante Diario',
      slug: 'crema-hidratante',
      sku: 'CRM-HID-200',
      precio: 22000,
      stock: 80,
      publicado: true,
      destacado: false,
      imagen: 'crema1.jpg',
      descripcionMD: 'Hidratación 24h con ceramidas.',

      marcaId: ids.brands.cerave,
      categoriaId: ids.cats.tratamiento, // más específico
    },
    create: {
      id: ids.prods.crema,
      titulo: 'Crema Hidratante Diario',
      slug: 'crema-hidratante',
      sku: 'CRM-HID-200',
      precio: 22000,
      stock: 80,
      publicado: true,
      destacado: false,
      imagen: 'crema1.jpg',
      descripcionMD: 'Hidratación 24h con ceramidas.',

      creadoEn: new Date(),
      marcaId: ids.brands.cerave,
      categoriaId: ids.cats.tratamiento,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.eyeliner },
    update: {
      titulo: 'Delineador Líquido Precisión',
      slug: 'delineador-liquido-precision',
      sku: 'EYE-LINQ-001',
      precio: 12500,
      stock: 150,
      publicado: true,
      destacado: true,
      imagen: 'eyeliner1.jpg',
      descripcionMD: 'Trazo ultra negro y resistente al agua.',

      marcaId: ids.brands.maybelline,
      categoriaId: ids.cats.ojos,
    },
    create: {
      id: ids.prods.eyeliner,
      titulo: 'Delineador Líquido Precisión',
      slug: 'delineador-liquido-precision',
      sku: 'EYE-LINQ-001',
      precio: 12500,
      stock: 150,
      publicado: true,
      destacado: true,
      imagen: 'eyeliner1.jpg',
      descripcionMD: 'Trazo ultra negro y resistente al agua.',

      creadoEn: new Date(),
      marcaId: ids.brands.maybelline,
      categoriaId: ids.cats.ojos,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.mascara },
    update: {
      titulo: 'Máscara Volumen Extremo',
      slug: 'mascara-volumen-extremo',
      sku: 'MSC-VOL-002',
      precio: 18000,
      stock: 95,
      publicado: true,
      destacado: true,
      imagen: 'mascara1.jpg',
      descripcionMD: 'Pestañas más largas y definidas en una pasada.',

      marcaId: ids.brands.revlon,
      categoriaId: ids.cats.ojos,
    },
    create: {
      id: ids.prods.mascara,
      titulo: 'Máscara Volumen Extremo',
      slug: 'mascara-volumen-extremo',
      sku: 'MSC-VOL-002',
      precio: 18000,
      stock: 95,
      publicado: true,
      destacado: true,
      imagen: 'mascara1.jpg',
      descripcionMD: 'Pestañas más largas y definidas en una pasada.',

      creadoEn: new Date(),
      marcaId: ids.brands.revlon,
      categoriaId: ids.cats.ojos,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.gloss },
    update: {
      titulo: 'Gloss Hidratante Brillo Natural',
      slug: 'gloss-hidratante-brillo-natural',
      sku: 'GLO-HID-003',
      precio: 11000,
      stock: 140,
      publicado: true,
      destacado: false,
      imagen: 'gloss1.jpg',
      descripcionMD: 'Acabado jugoso sin sensación pegajosa.',

      marcaId: ids.brands.elf,
      categoriaId: ids.cats.labios,
    },
    create: {
      id: ids.prods.gloss,
      titulo: 'Gloss Hidratante Brillo Natural',
      slug: 'gloss-hidratante-brillo-natural',
      sku: 'GLO-HID-003',
      precio: 11000,
      stock: 140,
      publicado: true,
      destacado: false,
      imagen: 'gloss1.jpg',
      descripcionMD: 'Acabado jugoso sin sensación pegajosa.',

      creadoEn: new Date(),
      marcaId: ids.brands.elf,
      categoriaId: ids.cats.labios,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.cleanser },
    update: {
      titulo: 'Gel de Limpieza Suave',
      slug: 'gel-limpieza-suave',
      sku: 'CLN-SOFT-004',
      precio: 16000,
      stock: 200,
      publicado: true,
      destacado: false,
      imagen: 'cleanser1.jpg',
      descripcionMD: 'Limpia sin resecar. Ideal uso diario.',

      marcaId: ids.brands.neutrogena,
      categoriaId: ids.cats.limpieza,
    },
    create: {
      id: ids.prods.cleanser,
      titulo: 'Gel de Limpieza Suave',
      slug: 'gel-limpieza-suave',
      sku: 'CLN-SOFT-004',
      precio: 16000,
      stock: 200,
      publicado: true,
      destacado: false,
      imagen: 'cleanser1.jpg',
      descripcionMD: 'Limpia sin resecar. Ideal uso diario.',

      creadoEn: new Date(),
      marcaId: ids.brands.neutrogena,
      categoriaId: ids.cats.limpieza,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.serum },
    update: {
      titulo: 'Sérum Vitamina C 10%',
      slug: 'serum-vitamina-c-10',
      sku: 'SER-VC10-005',
      precio: 32000,
      stock: 60,
      publicado: true,
      destacado: true,
      imagen: 'serum1.jpg',
      descripcionMD: 'Ilumina y unifica el tono. Antioxidante diario.',

      marcaId: ids.brands.natura,
      categoriaId: ids.cats.tratamiento,
    },
    create: {
      id: ids.prods.serum,
      titulo: 'Sérum Vitamina C 10%',
      slug: 'serum-vitamina-c-10',
      sku: 'SER-VC10-005',
      precio: 32000,
      stock: 60,
      publicado: true,
      destacado: true,
      imagen: 'serum1.jpg',
      descripcionMD: 'Ilumina y unifica el tono. Antioxidante diario.',

      creadoEn: new Date(),
      marcaId: ids.brands.natura,
      categoriaId: ids.cats.tratamiento,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.sunscreen },
    update: {
      titulo: 'Protector Solar FPS 50',
      slug: 'protector-solar-fps-50',
      sku: 'SUN-F50-006',
      precio: 28000,
      stock: 110,
      publicado: true,
      destacado: true,
      imagen: 'sunscreen1.jpg',
      descripcionMD: 'Amplio espectro, textura ligera, sin rastro blanco.',

      marcaId: ids.brands.neutrogena,
      categoriaId: ids.cats.proteccion,
    },
    create: {
      id: ids.prods.sunscreen,
      titulo: 'Protector Solar FPS 50',
      slug: 'protector-solar-fps-50',
      sku: 'SUN-F50-006',
      precio: 28000,
      stock: 110,
      publicado: true,
      destacado: true,
      imagen: 'sunscreen1.jpg',
      descripcionMD: 'Amplio espectro, textura ligera, sin rastro blanco.',

      creadoEn: new Date(),
      marcaId: ids.brands.neutrogena,
      categoriaId: ids.cats.proteccion,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.toner },
    update: {
      titulo: 'Tónico Hidratante',
      slug: 'tonico-hidratante',
      sku: 'TON-HYD-007',
      precio: 14000,
      stock: 130,
      publicado: true,
      destacado: false,
      imagen: 'toner1.jpg',
      descripcionMD: 'Equilibra el pH y prepara la piel para el tratamiento.',

      marcaId: ids.brands.cerave,
      categoriaId: ids.cats.limpieza,
    },
    create: {
      id: ids.prods.toner,
      titulo: 'Tónico Hidratante',
      slug: 'tonico-hidratante',
      sku: 'TON-HYD-007',
      precio: 14000,
      stock: 130,
      publicado: true,
      destacado: false,
      imagen: 'toner1.jpg',
      descripcionMD: 'Equilibra el pH y prepara la piel para el tratamiento.',

      creadoEn: new Date(),
      marcaId: ids.brands.cerave,
      categoriaId: ids.cats.limpieza,
    },
  });
  await pd.upsert({
    where: { id: ids.prods.brochas },
    update: {
      titulo: 'Set de Brochas Profesional x8',
      slug: 'set-brochas-profesional-8',
      sku: 'BRC-SET8-008',
      precio: 26000,
      stock: 70,
      publicado: true,
      destacado: false,
      imagen: 'brochas1.jpg',
      descripcionMD: 'Cerdas sintéticas, mango ergonómico. Incluye estuche.',

      marcaId: ids.brands.realtech,
      categoriaId: ids.cats.herramientas,
    },
    create: {
      id: ids.prods.brochas,
      titulo: 'Set de Brochas Profesional x8',
      slug: 'set-brochas-profesional-8',
      sku: 'BRC-SET8-008',
      precio: 26000,
      stock: 70,
      publicado: true,
      destacado: false,
      imagen: 'brochas1.jpg',
      descripcionMD: 'Cerdas sintéticas, mango ergonómico. Incluye estuche.',

      creadoEn: new Date(),
      marcaId: ids.brands.realtech,
      categoriaId: ids.cats.herramientas,
    },
  });

  // ───────────────── Imágenes de producto (mínimo 1 por producto nuevo)
  const pi = prisma.productoImagen;
  await pi.upsert({ where: { id: ids.imgs.p1a }, update: { archivo: 'labial1.jpg', alt: 'Labial Mate - foto 1', orden: 0, productoId: ids.prods.labial }, create: { id: ids.imgs.p1a, archivo: 'labial1.jpg', alt: 'Labial Mate - foto 1', orden: 0, productoId: ids.prods.labial }});
  await pi.upsert({ where: { id: ids.imgs.p1b }, update: { archivo: 'labial1-b.jpg', alt: 'Labial Mate - foto 2', orden: 1, productoId: ids.prods.labial }, create: { id: ids.imgs.p1b, archivo: 'labial1-b.jpg', alt: 'Labial Mate - foto 2', orden: 1, productoId: ids.prods.labial }});
  await pi.upsert({ where: { id: ids.imgs.p2a }, update: { archivo: 'crema1.jpg', alt: 'Crema Hidratante - foto 1', orden: 0, productoId: ids.prods.crema }, create: { id: ids.imgs.p2a, archivo: 'crema1.jpg', alt: 'Crema Hidratante - foto 1', orden: 0, productoId: ids.prods.crema }});
  await pi.upsert({ where: { id: ids.imgs.eyeliner }, update: { archivo: 'eyeliner1.jpg', alt: 'Delineador - foto 1', orden: 0, productoId: ids.prods.eyeliner }, create: { id: ids.imgs.eyeliner, archivo: 'eyeliner1.jpg', alt: 'Delineador - foto 1', orden: 0, productoId: ids.prods.eyeliner }});
  await pi.upsert({ where: { id: ids.imgs.mascara }, update: { archivo: 'mascara1.jpg', alt: 'Máscara - foto 1', orden: 0, productoId: ids.prods.mascara }, create: { id: ids.imgs.mascara, archivo: 'mascara1.jpg', alt: 'Máscara - foto 1', orden: 0, productoId: ids.prods.mascara }});
  await pi.upsert({ where: { id: ids.imgs.gloss }, update: { archivo: 'gloss1.jpg', alt: 'Gloss - foto 1', orden: 0, productoId: ids.prods.gloss }, create: { id: ids.imgs.gloss, archivo: 'gloss1.jpg', alt: 'Gloss - foto 1', orden: 0, productoId: ids.prods.gloss }});
  await pi.upsert({ where: { id: ids.imgs.cleanser }, update: { archivo: 'cleanser1.jpg', alt: 'Gel de limpieza - foto 1', orden: 0, productoId: ids.prods.cleanser }, create: { id: ids.imgs.cleanser, archivo: 'cleanser1.jpg', alt: 'Gel de limpieza - foto 1', orden: 0, productoId: ids.prods.cleanser }});
  await pi.upsert({ where: { id: ids.imgs.serum }, update: { archivo: 'serum1.jpg', alt: 'Sérum - foto 1', orden: 0, productoId: ids.prods.serum }, create: { id: ids.imgs.serum, archivo: 'serum1.jpg', alt: 'Sérum - foto 1', orden: 0, productoId: ids.prods.serum }});
  await pi.upsert({ where: { id: ids.imgs.sunscreen }, update: { archivo: 'sunscreen1.jpg', alt: 'Protector solar - foto 1', orden: 0, productoId: ids.prods.sunscreen }, create: { id: ids.imgs.sunscreen, archivo: 'sunscreen1.jpg', alt: 'Protector solar - foto 1', orden: 0, productoId: ids.prods.sunscreen }});
  await pi.upsert({ where: { id: ids.imgs.toner }, update: { archivo: 'toner1.jpg', alt: 'Tónico - foto 1', orden: 0, productoId: ids.prods.toner }, create: { id: ids.imgs.toner, archivo: 'toner1.jpg', alt: 'Tónico - foto 1', orden: 0, productoId: ids.prods.toner }});
  await pi.upsert({ where: { id: ids.imgs.brochas }, update: { archivo: 'brochas1.jpg', alt: 'Set de brochas - foto 1', orden: 0, productoId: ids.prods.brochas }, create: { id: ids.imgs.brochas, archivo: 'brochas1.jpg', alt: 'Set de brochas - foto 1', orden: 0, productoId: ids.prods.brochas }});

  // ───────────────── Favorito
  await prisma.favorito.upsert({
    where: { usuarioId_productoId: { usuarioId: ids.users.cliente, productoId: ids.prods.labial } },
    update: {},
    create: { id: ids.fav.f1, usuarioId: ids.users.cliente, productoId: ids.prods.labial, creadoEn: new Date() },
  });

  // ───────────────── Cursos (6 en total)
  const cs = prisma.curso;
  // existentes
  await cs.upsert({
    where: { id: ids.cursos.maqu },
    update: {
      titulo: 'Maquillaje Profesional',
      slug: 'maquillaje-profesional',
      resumen: 'Domina técnicas de maquillaje profesional.',
      descripcionMD: 'Contenido completo con prácticas y feedback.',
      precio: 40000,
      publicado: true,
      nivel: NivelCurso.INTERMEDIO,
      portada: 'curso-maqu.jpg',
      destacado: true,
      tags: json(['maquillaje', 'ojos', 'mate']),
      instructorId: ids.users.instructor,
    },
    create: {
      id: ids.cursos.maqu,
      titulo: 'Maquillaje Profesional',
      slug: 'maquillaje-profesional',
      resumen: 'Domina técnicas de maquillaje profesional.',
      descripcionMD: 'Contenido completo con prácticas y feedback.',
      precio: 40000,
      publicado: true,
      nivel: NivelCurso.INTERMEDIO,
      portada: 'curso-maqu.jpg',
      destacado: true,
      tags: json(['maquillaje', 'ojos', 'mate']),
      creadoEn: new Date(),
      instructorId: ids.users.instructor,
    },
  });
  await cs.upsert({
    where: { id: ids.cursos.skin },
    update: {
      titulo: 'Skincare Básico',
      slug: 'skincare-basico',
      resumen: 'Rutinas diarias para tu piel.',
      descripcionMD: 'Aprende a construir rutinas efectivas por tipo de piel.',
      precio: 28000,
      publicado: true,
      nivel: NivelCurso.BASICO,
      portada: 'curso-skin.jpg',
      destacado: false,
      tags: json(['skincare', 'hidratacion', 'rutinas']),

      instructorId: ids.users.instructor,
    },
    create: {
      id: ids.cursos.skin,
      titulo: 'Skincare Básico',
      slug: 'skincare-basico',
      resumen: 'Rutinas diarias para tu piel.',
      descripcionMD: 'Aprende a construir rutinas efectivas por tipo de piel.',
      precio: 28000,
      publicado: true,
      nivel: NivelCurso.BASICO,
      portada: 'curso-skin.jpg',
      destacado: false,
      tags: json(['skincare', 'hidratacion', 'rutinas']),

      creadoEn: new Date(),
      instructorId: ids.users.instructor,
    },
  });
  // nuevos
  await cs.upsert({
    where: { id: ids.cursos.ojosAvz },
    update: {
      titulo: 'Maquillaje de Ojos Avanzado',
      slug: 'maquillaje-ojos-avanzado',
      resumen: 'Domina smokey, cut crease y delineados gráficos.',
      descripcionMD: 'Técnicas pro para fotografía y eventos.',
      precio: 45000,
      publicado: true,
      nivel: NivelCurso.AVANZADO,
      portada: 'curso-ojos.jpg',
      destacado: true,
      tags: json(['ojos', 'smokey', 'cut-crease']),

      instructorId: ids.users.instructor,
    },
    create: {
      id: ids.cursos.ojosAvz,
      titulo: 'Maquillaje de Ojos Avanzado',
      slug: 'maquillaje-ojos-avanzado',
      resumen: 'Domina smokey, cut crease y delineados gráficos.',
      descripcionMD: 'Técnicas pro para fotografía y eventos.',
      precio: 45000,
      publicado: true,
      nivel: NivelCurso.AVANZADO,
      portada: 'curso-ojos.jpg',
      destacado: true,
      tags: json(['ojos', 'smokey', 'cut-crease']),

      creadoEn: new Date(),
      instructorId: ids.users.instructor,
    },
  });
  await cs.upsert({
    where: { id: ids.cursos.cejas },
    update: {
      titulo: 'Cejas Perfectas: Diseño y Perfilado',
      slug: 'cejas-perfectas-diseno-perfilado',
      resumen: 'Medición, simetría, técnicas de perfilado y relleno.',
      descripcionMD: 'Curso integral con práctica guiada.',
      precio: 32000,
      publicado: true,
      nivel: NivelCurso.INTERMEDIO,
      portada: 'curso-cejas.jpg',
      destacado: false,
      tags: json(['cejas', 'diseño', 'perfilado']),

      instructorId: ids.users.instructor,
    },
    create: {
      id: ids.cursos.cejas,
      titulo: 'Cejas Perfectas: Diseño y Perfilado',
      slug: 'cejas-perfectas-diseno-perfilado',
      resumen: 'Medición, simetría, técnicas de perfilado y relleno.',
      descripcionMD: 'Curso integral con práctica guiada.',
      precio: 32000,
      publicado: true,
      nivel: NivelCurso.INTERMEDIO,
      portada: 'curso-cejas.jpg',
      destacado: false,
      tags: json(['cejas', 'diseño', 'perfilado']),

      creadoEn: new Date(),
      instructorId: ids.users.instructor,
    },
  });
  await cs.upsert({
    where: { id: ids.cursos.dermo },
    update: {
      titulo: 'Dermocosmética y Rutinas Pro',
      slug: 'dermocosmetica-y-rutinas-pro',
      resumen: 'Activos, formulaciones y armado de rutinas avanzadas.',
      descripcionMD: 'De la teoría a la práctica con estudios de caso.',
      precio: 52000,
      publicado: true,
      nivel: NivelCurso.AVANZADO,
      portada: 'curso-dermo.jpg',
      destacado: true,
      tags: json(['dermocosmetica', 'rutinas', 'activos']),
      instructorId: ids.users.instructor,
    },
    create: {
      id: ids.cursos.dermo,
      titulo: 'Dermocosmética y Rutinas Pro',
      slug: 'dermocosmetica-y-rutinas-pro',
      resumen: 'Activos, formulaciones y armado de rutinas avanzadas.',
      descripcionMD: 'De la teoría a la práctica con estudios de caso.',
      precio: 52000,
      publicado: true,
      nivel: NivelCurso.AVANZADO,
      portada: 'curso-dermo.jpg',
      destacado: true,
      tags: json(['dermocosmetica', 'rutinas', 'activos']),
      creadoEn: new Date(),
      instructorId: ids.users.instructor,
    },
  });
  await cs.upsert({
    where: { id: ids.cursos.skinSens },
    update: {
      titulo: 'Skincare para Piel Sensible',
      slug: 'skincare-piel-sensible',
      resumen: 'Rutinas suaves y efectivas sin irritación.',
      descripcionMD: 'Selección de activos, tolerancia y protocolos.',
      precio: 30000,
      publicado: true,
      nivel: NivelCurso.BASICO,
      portada: 'curso-skin-sensible.jpg',
      destacado: false,
      tags: json(['piel sensible', 'rutinas', 'tolerancia']),

      instructorId: ids.users.instructor,
    },
    create: {
      id: ids.cursos.skinSens,
      titulo: 'Skincare para Piel Sensible',
      slug: 'skincare-piel-sensible',
      resumen: 'Rutinas suaves y efectivas sin irritación.',
      descripcionMD: 'Selección de activos, tolerancia y protocolos.',
      precio: 30000,
      publicado: true,
      nivel: NivelCurso.BASICO,
      portada: 'curso-skin-sensible.jpg',
      destacado: false,
      tags: json(['piel sensible', 'rutinas', 'tolerancia']),

      creadoEn: new Date(),
      instructorId: ids.users.instructor,
    },
  });

  // ───────────────── Módulos + Lecciones para nuevos cursos
  const md = prisma.modulo;
  const lc = prisma.leccion;

  // (existentes) maqu
  await md.upsert({ 
    where: { id: ids.mods.m1 }, 
    update: { titulo: 'Fundamentos y kit inicial', orden: 1, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.m1, titulo: 'Fundamentos y kit inicial', orden: 1, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.m2 }, 
    update: { titulo: 'Técnicas y acabados', orden: 2, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.m2, titulo: 'Técnicas y acabados', orden: 2, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.m3 }, 
    update: { titulo: 'Base y corrección', orden: 3, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.m3, titulo: 'Base y corrección', orden: 3, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.m4 }, 
    update: { titulo: 'Contouring y highlighting', orden: 4, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.m4, titulo: 'Contouring y highlighting', orden: 4, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.m5 }, 
    update: { titulo: 'Looks completos y portfolio', orden: 5, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.m5, titulo: 'Looks completos y portfolio', orden: 5, cursoId: ids.cursos.maqu, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  
  // Lecciones Módulo 1 - Fundamentos
  await lc.upsert({ where: { id: ids.lecs.l1 }, update: { titulo: 'Herramientas esenciales', orden: 1, duracionS: 480, rutaSrc: 'video-1.mp4', tipo: 'VIDEO', descripcion: 'Conoce todas las herramientas básicas que necesitas para comenzar en el maquillaje profesional.', moduloId: ids.mods.m1 }, create: { id: ids.lecs.l1, titulo: 'Herramientas esenciales', orden: 1, duracionS: 480, rutaSrc: 'video-1.mp4', tipo: 'VIDEO', descripcion: 'Conoce todas las herramientas básicas que necesitas para comenzar en el maquillaje profesional.', moduloId: ids.mods.m1 }});
  await lc.upsert({ where: { id: ids.lecs.l2 }, update: { titulo: 'Higiene y preparación de piel', orden: 2, duracionS: 540, rutaSrc: null, tipo: 'TEXTO', descripcion: 'Aprende los protocolos de higiene y preparación de la piel antes del maquillaje.', contenido: json({ tipo: 'TEXTO', data: { contenido: 'La higiene es fundamental en el maquillaje profesional. Antes de comenzar cualquier aplicación, es esencial:\n\n1. **Limpieza de manos**: Lávate las manos con jabón antibacterial y sécalas con toallas desechables.\n\n2. **Desinfección de herramientas**: Limpia todos los pinceles y esponjas con alcohol isopropílico al 70%.\n\n3. **Preparación de la piel del cliente**:\n   - Desmaquilla completamente\n   - Limpia con agua micelar\n   - Aplica tónico si es necesario\n   - Hidrata según tipo de piel\n\n4. **Análisis de la piel**: Observa el tipo de piel, imperfecciones y necesidades específicas.\n\n5. **Primer**: Aplica una base preparadora adecuada para el tipo de piel y el resultado deseado.\n\nRecuerda siempre preguntar sobre alergias o sensibilidades antes de aplicar cualquier producto.' } }), moduloId: ids.mods.m1 }, create: { id: ids.lecs.l2, titulo: 'Higiene y preparación de piel', orden: 2, duracionS: 540, rutaSrc: null, tipo: 'TEXTO', descripcion: 'Aprende los protocolos de higiene y preparación de la piel antes del maquillaje.', contenido: json({ tipo: 'TEXTO', data: { contenido: 'La higiene es fundamental en el maquillaje profesional. Antes de comenzar cualquier aplicación, es esencial:\n\n1. **Limpieza de manos**: Lávate las manos con jabón antibacterial y sécalas con toallas desechables.\n\n2. **Desinfección de herramientas**: Limpia todos los pinceles y esponjas con alcohol isopropílico al 70%.\n\n3. **Preparación de la piel del cliente**:\n   - Desmaquilla completamente\n   - Limpia con agua micelar\n   - Aplica tónico si es necesario\n   - Hidrata según tipo de piel\n\n4. **Análisis de la piel**: Observa el tipo de piel, imperfecciones y necesidades específicas.\n\n5. **Primer**: Aplica una base preparadora adecuada para el tipo de piel y el resultado deseado.\n\nRecuerda siempre preguntar sobre alergias o sensibilidades antes de aplicar cualquier producto.' } }), moduloId: ids.mods.m1 }});
  await lc.upsert({ where: { id: ids.lecs.l3 }, update: { titulo: 'Teoría del color en maquillaje', orden: 3, duracionS: 420, rutaSrc: 'teoria-color-maquillaje.pdf', tipo: 'DOCUMENTO', descripcion: 'Guía completa sobre la teoría del color aplicada al maquillaje profesional.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/teoria-color-maquillaje.pdf', nombre: 'Teoría del Color en Maquillaje - Guía Completa.pdf', tipoArchivo: 'PDF' } }), moduloId: ids.mods.m1 }, create: { id: ids.lecs.l3, titulo: 'Teoría del color en maquillaje', orden: 3, duracionS: 420, rutaSrc: 'teoria-color-maquillaje.pdf', tipo: 'DOCUMENTO', descripcion: 'Guía completa sobre la teoría del color aplicada al maquillaje profesional.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/teoria-color-maquillaje.pdf', nombre: 'Teoría del Color en Maquillaje - Guía Completa.pdf', tipoArchivo: 'PDF' } }), moduloId: ids.mods.m1 }});
  
  // Lecciones Módulo 2 - Técnicas y acabados
  await lc.upsert({ where: { id: ids.lecs.l4 }, update: { titulo: 'Smokey eye clásico', orden: 1, duracionS: 600, rutaSrc: 'video-2.mp4', tipo: 'VIDEO', descripcion: 'Aprende a crear el icónico smokey eye paso a paso con técnicas profesionales.', moduloId: ids.mods.m2 }, create: { id: ids.lecs.l4, titulo: 'Smokey eye clásico', orden: 1, duracionS: 600, rutaSrc: 'video-2.mp4', tipo: 'VIDEO', descripcion: 'Aprende a crear el icónico smokey eye paso a paso con técnicas profesionales.', moduloId: ids.mods.m2 }});
  await lc.upsert({ where: { id: ids.lecs.l5 }, update: { titulo: 'Acabado mate de larga duración', orden: 2, duracionS: 660, rutaSrc: 'acabado-mate-duracion.mp4', tipo: 'VIDEO', descripcion: 'Técnicas avanzadas para lograr un acabado mate perfecto que dure todo el día.', moduloId: ids.mods.m2 }, create: { id: ids.lecs.l5, titulo: 'Acabado mate de larga duración', orden: 2, duracionS: 660, rutaSrc: 'acabado-mate-duracion.mp4', tipo: 'VIDEO', descripcion: 'Técnicas avanzadas para lograr un acabado mate perfecto que dure todo el día.', moduloId: ids.mods.m2 }});
  await lc.upsert({ where: { id: ids.lecs.l6 }, update: { titulo: 'Quiz: Técnicas básicas', orden: 3, duracionS: 300, rutaSrc: null, tipo: 'QUIZ', descripcion: 'Evalúa tus conocimientos sobre las técnicas básicas de maquillaje.', contenido: json({ tipo: 'QUIZ', data: { configuracion: { mostrarResultados: true, permitirReintentos: true, puntajeMinimo: 70 }, preguntas: [{ pregunta: '¿Cuál es el primer paso para crear un smokey eye perfecto?', opciones: ['Aplicar sombra oscura en todo el párpado', 'Preparar el párpado con primer', 'Delinear el ojo con lápiz negro', 'Aplicar máscara de pestañas'], respuestaCorrecta: 1, explicacion: 'El primer paso siempre debe ser preparar el párpado con primer para que las sombras se adhieran mejor y duren más tiempo.' }] } }), moduloId: ids.mods.m2 }, create: { id: ids.lecs.l6, titulo: 'Quiz: Técnicas básicas', orden: 3, duracionS: 300, rutaSrc: null, tipo: 'QUIZ', descripcion: 'Evalúa tus conocimientos sobre las técnicas básicas de maquillaje.', contenido: json({ tipo: 'QUIZ', data: { configuracion: { mostrarResultados: true, permitirReintentos: true, puntajeMinimo: 70 }, preguntas: [{ pregunta: '¿Cuál es el primer paso para crear un smokey eye perfecto?', opciones: ['Aplicar sombra oscura en todo el párpado', 'Preparar el párpado con primer', 'Delinear el ojo con lápiz negro', 'Aplicar máscara de pestañas'], respuestaCorrecta: 1, explicacion: 'El primer paso siempre debe ser preparar el párpado con primer para que las sombras se adhieran mejor y duren más tiempo.' }] } }), moduloId: ids.mods.m2 }});
  
  // Lecciones Módulo 3 - Base y corrección
  await lc.upsert({ where: { id: ids.lecs.l7 }, update: { titulo: 'Elección del tono de base perfecto', orden: 1, duracionS: 480, rutaSrc: 'tono-base-perfecto.mp4', tipo: 'VIDEO', descripcion: 'Aprende a identificar el tono de base ideal para cada tipo de piel y subtono.', moduloId: ids.mods.m3 }, create: { id: ids.lecs.l7, titulo: 'Elección del tono de base perfecto', orden: 1, duracionS: 480, rutaSrc: 'tono-base-perfecto.mp4', tipo: 'VIDEO', descripcion: 'Aprende a identificar el tono de base ideal para cada tipo de piel y subtono.', moduloId: ids.mods.m3 }});
  await lc.upsert({ where: { id: ids.lecs.l8 }, update: { titulo: 'Corrección de ojeras y manchas', orden: 2, duracionS: 540, rutaSrc: null, tipo: 'TEXTO', descripcion: 'Técnicas profesionales para corregir imperfecciones de manera natural.', contenido: json({ tipo: 'TEXTO', data: { contenido: '# Corrección de Ojeras y Manchas\n\n## Tipos de Ojeras\n\n### 1. Ojeras Azules/Moradas\n- **Causa**: Circulación deficiente\n- **Corrector**: Tonos naranjas o melocotón\n- **Técnica**: Aplicar en triángulo invertido\n\n### 2. Ojeras Marrones\n- **Causa**: Hiperpigmentación\n- **Corrector**: Tonos rosados o salmón\n- **Técnica**: Difuminar hacia afuera\n\n### 3. Ojeras Grises\n- **Causa**: Genética o edad\n- **Corrector**: Tonos amarillos o dorados\n- **Técnica**: Capas finas y graduales\n\n## Corrección de Manchas\n\n### Manchas Rojas (Acné, Rosácea)\n- Usar corrector verde\n- Aplicar solo en la mancha\n- Sellar con base del tono exacto\n\n### Manchas Oscuras\n- Corrector un tono más claro que la piel\n- Técnica de "punteo"\n- Difuminar solo los bordes\n\n## Herramientas Recomendadas\n- Pinceles sintéticos pequeños\n- Esponjas húmedas para difuminar\n- Corrector en crema y líquido\n\n## Tips Profesionales\n1. Siempre hidratar antes de corregir\n2. Usar poca cantidad y construir cobertura\n3. Sellar con polvo translúcido\n4. Trabajar con luz natural cuando sea posible' } }), moduloId: ids.mods.m3 }, create: { id: ids.lecs.l8, titulo: 'Corrección de ojeras y manchas', orden: 2, duracionS: 540, rutaSrc: null, tipo: 'TEXTO', descripcion: 'Técnicas profesionales para corregir imperfecciones de manera natural.', contenido: json({ tipo: 'TEXTO', data: { contenido: '# Corrección de Ojeras y Manchas\n\n## Tipos de Ojeras\n\n### 1. Ojeras Azules/Moradas\n- **Causa**: Circulación deficiente\n- **Corrector**: Tonos naranjas o melocotón\n- **Técnica**: Aplicar en triángulo invertido\n\n### 2. Ojeras Marrones\n- **Causa**: Hiperpigmentación\n- **Corrector**: Tonos rosados o salmón\n- **Técnica**: Difuminar hacia afuera\n\n### 3. Ojeras Grises\n- **Causa**: Genética o edad\n- **Corrector**: Tonos amarillos o dorados\n- **Técnica**: Capas finas y graduales\n\n## Corrección de Manchas\n\n### Manchas Rojas (Acné, Rosácea)\n- Usar corrector verde\n- Aplicar solo en la mancha\n- Sellar con base del tono exacto\n\n### Manchas Oscuras\n- Corrector un tono más claro que la piel\n- Técnica de "punteo"\n- Difuminar solo los bordes\n\n## Herramientas Recomendadas\n- Pinceles sintéticos pequeños\n- Esponjas húmedas para difuminar\n- Corrector en crema y líquido\n\n## Tips Profesionales\n1. Siempre hidratar antes de corregir\n2. Usar poca cantidad y construir cobertura\n3. Sellar con polvo translúcido\n4. Trabajar con luz natural cuando sea posible' } }), moduloId: ids.mods.m3 }});
  await lc.upsert({ where: { id: ids.lecs.l9 }, update: { titulo: 'Guía de productos correctores', orden: 3, duracionS: 360, rutaSrc: 'guia-productos-correctores.pdf', tipo: 'DOCUMENTO', descripcion: 'Guía completa de productos correctores y sus aplicaciones.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/guia-productos-correctores.pdf', nombre: 'Guía de Productos Correctores - Mica Pestañas.pdf', tipoArchivo: 'PDF' } }), moduloId: ids.mods.m3 }, create: { id: ids.lecs.l9, titulo: 'Guía de productos correctores', orden: 3, duracionS: 360, rutaSrc: 'guia-productos-correctores.pdf', tipo: 'DOCUMENTO', descripcion: 'Guía completa de productos correctores y sus aplicaciones.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/guia-productos-correctores.pdf', nombre: 'Guía de Productos Correctores - Mica Pestañas.pdf', tipoArchivo: 'PDF' } }), moduloId: ids.mods.m3 }});
  
  // Lecciones Módulo 4 - Contouring y highlighting
  await lc.upsert({ where: { id: ids.lecs.l10 }, update: { titulo: 'Contouring según forma de rostro', orden: 1, duracionS: 720, rutaSrc: 'contouring-rostros.mp4', tipo: 'VIDEO', descripcion: 'Aprende a adaptar las técnicas de contouring según la forma específica de cada rostro.', moduloId: ids.mods.m4 }, create: { id: ids.lecs.l10, titulo: 'Contouring según forma de rostro', orden: 1, duracionS: 720, rutaSrc: 'contouring-rostros.mp4', tipo: 'VIDEO', descripcion: 'Aprende a adaptar las técnicas de contouring según la forma específica de cada rostro.', moduloId: ids.mods.m4 }});
  await lc.upsert({ where: { id: ids.lecs.l11 }, update: { titulo: 'Técnicas de iluminación natural', orden: 2, duracionS: 600, rutaSrc: null, tipo: 'TEXTO', descripcion: 'Domina las técnicas de iluminación para crear efectos naturales y profesionales.', contenido: json({ tipo: 'TEXTO', data: { contenido: '# Técnicas de Iluminación Natural\n\n## Fundamentos de la Iluminación\n\n### ¿Qué es el Highlighting?\nEl highlighting es la técnica que consiste en aplicar productos más claros que el tono natural de la piel para **resaltar y dar volumen** a ciertas áreas del rostro.\n\n### Objetivos del Highlighting:\n- Crear puntos de luz natural\n- Dar volumen a áreas que queremos destacar\n- Equilibrar el contouring\n- Aportar luminosidad al rostro\n\n## Zonas de Aplicación\n\n### Zonas Principales:\n1. **Puente nasal** - Afina y alarga la nariz\n2. **Pómulos** - Eleva y define la estructura ósea\n3. **Arco de cupido** - Define y da volumen a los labios\n4. **Centro de la frente** - Amplía y eleva la frente\n5. **Mentón** - Alarga y define la mandíbula\n6. **Esquinas internas de los ojos** - Abre y agranda la mirada\n\n### Zonas Secundarias:\n- Debajo de las cejas (arco superciliar)\n- Centro del párpado móvil\n- Escote (para looks especiales)\n\n## Productos y Herramientas\n\n### Tipos de Iluminadores:\n- **Polvo**: Acabado mate o satinado, ideal para pieles grasas\n- **Crema**: Acabado natural, perfecto para pieles secas\n- **Líquido**: Muy natural, se mezcla fácilmente con la base\n- **Stick**: Práctico y preciso para aplicación directa\n\n### Herramientas Recomendadas:\n- Pincel abanico para aplicación suave\n- Pincel pequeño y denso para precisión\n- Esponja húmeda para difuminar\n- Dedos para productos cremosos\n\n## Técnicas Profesionales\n\n### Técnica del Triángulo Invertido\n1. Aplicar iluminador formando un triángulo invertido bajo el ojo\n2. La base del triángulo en el pómulo\n3. El vértice hacia la sien\n4. Difuminar hacia arriba y hacia afuera\n\n### Técnica de Capas\n1. Primera capa: Iluminador líquido mezclado con la base\n2. Segunda capa: Iluminador en polvo para fijar\n3. Tercera capa: Toque final con iluminador intenso (opcional)\n\n## Errores Comunes a Evitar\n\n❌ **Aplicar demasiado producto** - Menos es más\n❌ **Usar tonos muy fríos** - Elegir tonos acordes al subtono de piel\n❌ **No difuminar correctamente** - Las transiciones deben ser imperceptibles\n❌ **Iluminar zonas incorrectas** - Cada forma de rostro tiene sus zonas específicas\n❌ **Usar glitter en maquillaje de día** - Reservar brillos intensos para la noche\n\n## Iluminación según Forma de Rostro\n\n### Rostro Redondo\n- Iluminar: Centro de frente, puente nasal, mentón\n- Evitar: Mejillas completas (solo la parte alta del pómulo)\n\n### Rostro Cuadrado\n- Iluminar: Centro de frente, puente nasal, mentón (centro)\n- Evitar: Esquinas de la frente y mandíbula\n\n### Rostro Alargado\n- Iluminar: Pómulos, centro de frente (horizontal)\n- Evitar: Puente nasal completo, mentón\n\n### Rostro Corazón\n- Iluminar: Mentón, pómulos\n- Evitar: Centro de frente (ya es naturalmente ancho)\n\n## Tips de Profesional\n\n💡 **Iluminación de día vs noche:**\n- Día: Iluminadores sutiles, acabado natural\n- Noche: Puedes intensificar y usar acabados más brillantes\n\n💡 **Prueba de intensidad:**\n- El iluminador debe verse desde 1 metro de distancia\n- Si no se ve, necesitas más producto\n- Si se ve desde 3 metros, es demasiado\n\n💡 **Combinación con otros productos:**\n- Aplicar después del contouring\n- Antes del rubor\n- Fijar con polvo translúcido si es necesario' } }), moduloId: ids.mods.m4 }, create: { id: ids.lecs.l11, titulo: 'Técnicas de iluminación natural', orden: 2, duracionS: 600, rutaSrc: null, tipo: 'TEXTO', descripcion: 'Domina las técnicas de iluminación para crear efectos naturales y profesionales.', contenido: json({ tipo: 'TEXTO', data: { contenido: '# Técnicas de Iluminación Natural\n\n## Fundamentos de la Iluminación\n\n### ¿Qué es el Highlighting?\nEl highlighting es la técnica que consiste en aplicar productos más claros que el tono natural de la piel para **resaltar y dar volumen** a ciertas áreas del rostro.\n\n### Objetivos del Highlighting:\n- Crear puntos de luz natural\n- Dar volumen a áreas que queremos destacar\n- Equilibrar el contouring\n- Aportar luminosidad al rostro\n\n## Zonas de Aplicación\n\n### Zonas Principales:\n1. **Puente nasal** - Afina y alarga la nariz\n2. **Pómulos** - Eleva y define la estructura ósea\n3. **Arco de cupido** - Define y da volumen a los labios\n4. **Centro de la frente** - Amplía y eleva la frente\n5. **Mentón** - Alarga y define la mandíbula\n6. **Esquinas internas de los ojos** - Abre y agranda la mirada\n\n### Zonas Secundarias:\n- Debajo de las cejas (arco superciliar)\n- Centro del párpado móvil\n- Escote (para looks especiales)\n\n## Productos y Herramientas\n\n### Tipos de Iluminadores:\n- **Polvo**: Acabado mate o satinado, ideal para pieles grasas\n- **Crema**: Acabado natural, perfecto para pieles secas\n- **Líquido**: Muy natural, se mezcla fácilmente con la base\n- **Stick**: Práctico y preciso para aplicación directa\n\n### Herramientas Recomendadas:\n- Pincel abanico para aplicación suave\n- Pincel pequeño y denso para precisión\n- Esponja húmeda para difuminar\n- Dedos para productos cremosos\n\n## Técnicas Profesionales\n\n### Técnica del Triángulo Invertido\n1. Aplicar iluminador formando un triángulo invertido bajo el ojo\n2. La base del triángulo en el pómulo\n3. El vértice hacia la sien\n4. Difuminar hacia arriba y hacia afuera\n\n### Técnica de Capas\n1. Primera capa: Iluminador líquido mezclado con la base\n2. Segunda capa: Iluminador en polvo para fijar\n3. Tercera capa: Toque final con iluminador intenso (opcional)\n\n## Errores Comunes a Evitar\n\n❌ **Aplicar demasiado producto** - Menos es más\n❌ **Usar tonos muy fríos** - Elegir tonos acordes al subtono de piel\n❌ **No difuminar correctamente** - Las transiciones deben ser imperceptibles\n❌ **Iluminar zonas incorrectas** - Cada forma de rostro tiene sus zonas específicas\n❌ **Usar glitter en maquillaje de día** - Reservar brillos intensos para la noche\n\n## Iluminación según Forma de Rostro\n\n### Rostro Redondo\n- Iluminar: Centro de frente, puente nasal, mentón\n- Evitar: Mejillas completas (solo la parte alta del pómulo)\n\n### Rostro Cuadrado\n- Iluminar: Centro de frente, puente nasal, mentón (centro)\n- Evitar: Esquinas de la frente y mandíbula\n\n### Rostro Alargado\n- Iluminar: Pómulos, centro de frente (horizontal)\n- Evitar: Puente nasal completo, mentón\n\n### Rostro Corazón\n- Iluminar: Mentón, pómulos\n- Evitar: Centro de frente (ya es naturalmente ancho)\n\n## Tips de Profesional\n\n💡 **Iluminación de día vs noche:**\n- Día: Iluminadores sutiles, acabado natural\n- Noche: Puedes intensificar y usar acabados más brillantes\n\n💡 **Prueba de intensidad:**\n- El iluminador debe verse desde 1 metro de distancia\n- Si no se ve, necesitas más producto\n- Si se ve desde 3 metros, es demasiado\n\n💡 **Combinación con otros productos:**\n- Aplicar después del contouring\n- Antes del rubor\n- Fijar con polvo translúcido si es necesario' } }), moduloId: ids.mods.m4 }});
  await lc.upsert({ where: { id: ids.lecs.l12 }, update: { titulo: 'Quiz: Contouring avanzado', orden: 3, duracionS: 420, rutaSrc: null, tipo: 'QUIZ', descripcion: 'Evalúa tus conocimientos sobre técnicas avanzadas de contouring y highlighting.', contenido: json({ tipo: 'QUIZ', data: { configuracion: { mostrarResultados: true, permitirReintentos: true, puntajeMinimo: 70 }, preguntas: [{ pregunta: '¿Cuál es la regla principal para aplicar contorno en rostros redondos?', opciones: ['Aplicar en toda la mejilla', 'Crear líneas verticales para alargar', 'Usar tonos muy oscuros', 'Evitar el contorno completamente'], respuestaCorrecta: 1, explicacion: 'En rostros redondos, el objetivo es crear líneas verticales que alarguen visualmente el rostro, aplicando contorno en las sienes y a los lados de la cara.' }] } }), moduloId: ids.mods.m4 }, create: { id: ids.lecs.l12, titulo: 'Quiz: Contouring avanzado', orden: 3, duracionS: 420, rutaSrc: null, tipo: 'QUIZ', descripcion: 'Evalúa tus conocimientos sobre técnicas avanzadas de contouring y highlighting.', contenido: json({ tipo: 'QUIZ', data: { configuracion: { mostrarResultados: true, permitirReintentos: true, puntajeMinimo: 70 }, preguntas: [{ pregunta: '¿Cuál es la regla principal para aplicar contorno en rostros redondos?', opciones: ['Aplicar en toda la mejilla', 'Crear líneas verticales para alargar', 'Usar tonos muy oscuros', 'Evitar el contorno completamente'], respuestaCorrecta: 1, explicacion: 'En rostros redondos, el objetivo es crear líneas verticales que alarguen visualmente el rostro, aplicando contorno en las sienes y a los lados de la cara.' }] } }), moduloId: ids.mods.m4 }});
  
  // Lecciones Módulo 5 - Looks completos
  await lc.upsert({ where: { id: ids.lecs.l13 }, update: { titulo: 'Look natural de día', orden: 1, duracionS: 900, rutaSrc: 'look-natural-dia.mp4', tipo: 'VIDEO', descripcion: 'Aprende a crear un look natural perfecto para el día a día, fresco y luminoso.', moduloId: ids.mods.m5 }, create: { id: ids.lecs.l13, titulo: 'Look natural de día', orden: 1, duracionS: 900, rutaSrc: 'look-natural-dia.mp4', tipo: 'VIDEO', descripcion: 'Aprende a crear un look natural perfecto para el día a día, fresco y luminoso.', moduloId: ids.mods.m5 }});
  await lc.upsert({ where: { id: ids.lecs.l14 }, update: { titulo: 'Look glamoroso de noche', orden: 2, duracionS: 1080, rutaSrc: 'look-glamoroso-noche.mp4', tipo: 'VIDEO', descripcion: 'Domina las técnicas para crear looks sofisticados y glamorosos para eventos nocturnos.', moduloId: ids.mods.m5 }, create: { id: ids.lecs.l14, titulo: 'Look glamoroso de noche', orden: 2, duracionS: 1080, rutaSrc: 'look-glamoroso-noche.mp4', tipo: 'VIDEO', descripcion: 'Domina las técnicas para crear looks sofisticados y glamorosos para eventos nocturnos.', moduloId: ids.mods.m5 }});
  await lc.upsert({ where: { id: ids.lecs.l15 }, update: { titulo: 'Creando tu portfolio profesional', orden: 3, duracionS: 720, rutaSrc: 'guia-portfolio-profesional.pdf', tipo: 'DOCUMENTO', descripcion: 'Guía completa para crear un portfolio profesional que destaque tu trabajo como maquilladora.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/guia-portfolio-profesional.pdf', nombre: 'Guía Portfolio Profesional - Mica Pestañas.pdf', tipoArchivo: 'PDF' } }), moduloId: ids.mods.m5 }, create: { id: ids.lecs.l15, titulo: 'Creando tu portfolio profesional', orden: 3, duracionS: 720, rutaSrc: 'guia-portfolio-profesional.pdf', tipo: 'DOCUMENTO', descripcion: 'Guía completa para crear un portfolio profesional que destaque tu trabajo como maquilladora.', contenido: json({ tipo: 'DOCUMENTO', data: { url: '/docs/guia-portfolio-profesional.pdf', nombre: 'Guía Portfolio Profesional - Mica Pestañas.pdf', tipoArchivo: 'PDF' } }), moduloId: ids.mods.m5 }});

  // ojos avanzados
  await md.upsert({ 
    where: { id: ids.mods.oj1 }, 
    update: { titulo: 'Smokey & degradados', orden: 1, cursoId: ids.cursos.ojosAvz, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.oj1, titulo: 'Smokey & degradados', orden: 1, cursoId: ids.cursos.ojosAvz, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.oj2 }, 
    update: { titulo: 'Cut crease y gráficos', orden: 2, cursoId: ids.cursos.ojosAvz, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.oj2, titulo: 'Cut crease y gráficos', orden: 2, cursoId: ids.cursos.ojosAvz, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await lc.upsert({ where: { id: ids.lecs.oj1a }, update: { titulo: 'Smokey clásico', orden: 1, duracionS: 720, rutaSrc: 'smokey-classic.mp4', moduloId: ids.mods.oj1 }, create: { id: ids.lecs.oj1a, titulo: 'Smokey clásico', orden: 1, duracionS: 720, rutaSrc: 'smokey-classic.mp4', moduloId: ids.mods.oj1 }});
  await lc.upsert({ where: { id: ids.lecs.oj1b }, update: { titulo: 'Degradado a color', orden: 2, duracionS: 660, rutaSrc: 'degradado-color.mp4', moduloId: ids.mods.oj1 }, create: { id: ids.lecs.oj1b, titulo: 'Degradado a color', orden: 2, duracionS: 660, rutaSrc: 'degradado-color.mp4', moduloId: ids.mods.oj1 }});
  await lc.upsert({ where: { id: ids.lecs.oj2a }, update: { titulo: 'Cut crease definido', orden: 1, duracionS: 780, rutaSrc: 'cut-crease.mp4', moduloId: ids.mods.oj2 }, create: { id: ids.lecs.oj2a, titulo: 'Cut crease definido', orden: 1, duracionS: 780, rutaSrc: 'cut-crease.mp4', moduloId: ids.mods.oj2 }});
  await lc.upsert({ where: { id: ids.lecs.oj2b }, update: { titulo: 'Delineados gráficos', orden: 2, duracionS: 600, rutaSrc: 'delineados-graficos.mp4', moduloId: ids.mods.oj2 }, create: { id: ids.lecs.oj2b, titulo: 'Delineados gráficos', orden: 2, duracionS: 600, rutaSrc: 'delineados-graficos.mp4', moduloId: ids.mods.oj2 }});

  // cejas
  await md.upsert({ 
    where: { id: ids.mods.cj1 }, 
    update: { titulo: 'Diseño y medición', orden: 1, cursoId: ids.cursos.cejas, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.cj1, titulo: 'Diseño y medición', orden: 1, cursoId: ids.cursos.cejas, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.cj2 }, 
    update: { titulo: 'Perfilado y relleno', orden: 2, cursoId: ids.cursos.cejas, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.cj2, titulo: 'Perfilado y relleno', orden: 2, cursoId: ids.cursos.cejas, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await lc.upsert({ where: { id: ids.lecs.cj1a }, update: { titulo: 'Proporciones y simetría', orden: 1, duracionS: 540, rutaSrc: 'cejas-proporciones.mp4', moduloId: ids.mods.cj1 }, create: { id: ids.lecs.cj1a, titulo: 'Proporciones y simetría', orden: 1, duracionS: 540, rutaSrc: 'cejas-proporciones.mp4', moduloId: ids.mods.cj1 }});
  await lc.upsert({ where: { id: ids.lecs.cj1b }, update: { titulo: 'Diseño según rostro', orden: 2, duracionS: 600, rutaSrc: 'cejas-rostro.mp4', moduloId: ids.mods.cj1 }, create: { id: ids.lecs.cj1b, titulo: 'Diseño según rostro', orden: 2, duracionS: 600, rutaSrc: 'cejas-rostro.mp4', moduloId: ids.mods.cj1 }});
  await lc.upsert({ where: { id: ids.lecs.cj2a }, update: { titulo: 'Perfilado con pinza y tijera', orden: 1, duracionS: 480, rutaSrc: 'cejas-perfilado.mp4', moduloId: ids.mods.cj2 }, create: { id: ids.lecs.cj2a, titulo: 'Perfilado con pinza y tijera', orden: 1, duracionS: 480, rutaSrc: 'cejas-perfilado.mp4', moduloId: ids.mods.cj2 }});
  await lc.upsert({ where: { id: ids.lecs.cj2b }, update: { titulo: 'Relleno natural y marcado', orden: 2, duracionS: 540, rutaSrc: 'cejas-relleno.mp4', moduloId: ids.mods.cj2 }, create: { id: ids.lecs.cj2b, titulo: 'Relleno natural y marcado', orden: 2, duracionS: 540, rutaSrc: 'cejas-relleno.mp4', moduloId: ids.mods.cj2 }});

  // dermo
  await md.upsert({ 
    where: { id: ids.mods.de1 }, 
    update: { titulo: 'Activos clave', orden: 1, cursoId: ids.cursos.dermo, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.de1, titulo: 'Activos clave', orden: 1, cursoId: ids.cursos.dermo, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.de2 }, 
    update: { titulo: 'Rutinas avanzadas', orden: 2, cursoId: ids.cursos.dermo, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.de2, titulo: 'Rutinas avanzadas', orden: 2, cursoId: ids.cursos.dermo, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await lc.upsert({ where: { id: ids.lecs.de1a }, update: { titulo: 'Vitamina C, Retinoides, AHAs', orden: 1, duracionS: 780, rutaSrc: 'activos-vcr.mp4', moduloId: ids.mods.de1 }, create: { id: ids.lecs.de1a, titulo: 'Vitamina C, Retinoides, AHAs', orden: 1, duracionS: 780, rutaSrc: 'activos-vcr.mp4', moduloId: ids.mods.de1 }});
  await lc.upsert({ where: { id: ids.lecs.de1b }, update: { titulo: 'Niacinamida, Ceramidas, PHA', orden: 2, duracionS: 720, rutaSrc: 'activos-ncp.mp4', moduloId: ids.mods.de1 }, create: { id: ids.lecs.de1b, titulo: 'Niacinamida, Ceramidas, PHA', orden: 2, duracionS: 720, rutaSrc: 'activos-ncp.mp4', moduloId: ids.mods.de1 }});
  await lc.upsert({ where: { id: ids.lecs.de2a }, update: { titulo: 'Rutinas AM/PM por tipo de piel', orden: 1, duracionS: 840, rutaSrc: 'rutinas-am-pm.mp4', moduloId: ids.mods.de2 }, create: { id: ids.lecs.de2a, titulo: 'Rutinas AM/PM por tipo de piel', orden: 1, duracionS: 840, rutaSrc: 'rutinas-am-pm.mp4', moduloId: ids.mods.de2 }});
  await lc.upsert({ where: { id: ids.lecs.de2b }, update: { titulo: 'Protocolos de sensibilización', orden: 2, duracionS: 660, rutaSrc: 'protocolos-sensi.mp4', moduloId: ids.mods.de2 }, create: { id: ids.lecs.de2b, titulo: 'Protocolos de sensibilización', orden: 2, duracionS: 660, rutaSrc: 'protocolos-sensi.mp4', moduloId: ids.mods.de2 }});

  // skin sensible
  await md.upsert({ 
    where: { id: ids.mods.ss1 }, 
    update: { titulo: 'Fundamentos piel sensible', orden: 1, cursoId: ids.cursos.skinSens, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.ss1, titulo: 'Fundamentos piel sensible', orden: 1, cursoId: ids.cursos.skinSens, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await md.upsert({ 
    where: { id: ids.mods.ss2 }, 
    update: { titulo: 'Armado de rutina', orden: 2, cursoId: ids.cursos.skinSens, parentId: null } as Prisma.ModuloUncheckedUpdateInput, 
    create: { id: ids.mods.ss2, titulo: 'Armado de rutina', orden: 2, cursoId: ids.cursos.skinSens, parentId: null } as Prisma.ModuloUncheckedCreateInput
  });
  await lc.upsert({ where: { id: ids.lecs.ss1a }, update: { titulo: 'Barreras cutáneas y triggers', orden: 1, duracionS: 540, rutaSrc: 'barrera-triggers.mp4', moduloId: ids.mods.ss1 }, create: { id: ids.lecs.ss1a, titulo: 'Barreras cutáneas y triggers', orden: 1, duracionS: 540, rutaSrc: 'barrera-triggers.mp4', moduloId: ids.mods.ss1 }});
  await lc.upsert({ where: { id: ids.lecs.ss1b }, update: { titulo: 'Activos tolerables', orden: 2, duracionS: 600, rutaSrc: 'activos-tolerables.mp4', moduloId: ids.mods.ss1 }, create: { id: ids.lecs.ss1b, titulo: 'Activos tolerables', orden: 2, duracionS: 600, rutaSrc: 'activos-tolerables.mp4', moduloId: ids.mods.ss1 }});
  await lc.upsert({ where: { id: ids.lecs.ss2a }, update: { titulo: 'Rutina minimalista AM/PM', orden: 1, duracionS: 660, rutaSrc: 'rutina-minimal.mp4', moduloId: ids.mods.ss2 }, create: { id: ids.lecs.ss2a, titulo: 'Rutina minimalista AM/PM', orden: 1, duracionS: 660, rutaSrc: 'rutina-minimal.mp4', moduloId: ids.mods.ss2 }});
  await lc.upsert({ where: { id: ids.lecs.ss2b }, update: { titulo: 'Estrategias de tolerancia', orden: 2, duracionS: 600, rutaSrc: 'estrategias-tolerancia.mp4', moduloId: ids.mods.ss2 }, create: { id: ids.lecs.ss2b, titulo: 'Estrategias de tolerancia', orden: 2, duracionS: 600, rutaSrc: 'estrategias-tolerancia.mp4', moduloId: ids.mods.ss2 }});

  // ───────────────── Inscripción / Reseñas (demo)
  await prisma.inscripcion.upsert({
    where: { id: ids.insc.i1 },
    update: {
      usuarioId: ids.users.cliente,
      cursoId: ids.cursos.maqu,
      estado: EstadoInscripcion.ACTIVADA,
      progreso: json({ 
        completado: [ids.lecs.l1],
        subscription: {
          duration: "1",
          durationType: "meses",
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
        }
      }),
    },
    create: {
      id: ids.insc.i1,
      usuarioId: ids.users.cliente,
      cursoId: ids.cursos.maqu,
      estado: EstadoInscripcion.ACTIVADA,
      progreso: json({ 
        completado: [ids.lecs.l1],
        subscription: {
          duration: "3",
          durationType: "meses",
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString()
        }
      }),
      creadoEn: new Date(),
    },
  });

  await prisma.resena.upsert({
    where: { id: ids.revs.prod1 },
    update: { productoId: ids.prods.labial, usuarioId: ids.users.cliente, puntaje: 5, comentario: 'Excelente pigmentación y duración.' },
    create: { id: ids.revs.prod1, productoId: ids.prods.labial, usuarioId: ids.users.cliente, puntaje: 5, comentario: 'Excelente pigmentación y duración.', creadoEn: new Date() },
  });
  await prisma.resena.upsert({
    where: { id: ids.revs.curso1 },
    update: { cursoId: ids.cursos.maqu, usuarioId: ids.users.cliente, puntaje: 4, comentario: 'Muy completo, me gustó la práctica.' },
    create: { id: ids.revs.curso1, cursoId: ids.cursos.maqu, usuarioId: ids.users.cliente, puntaje: 4, comentario: 'Muy completo, me gustó la práctica.', creadoEn: new Date() },
  });

  // ───────────────── Orden + Ítems (demo)
  await prisma.orden.upsert({
    where: { id: ids.orden.o1 },
    update: {
      usuarioId: ids.users.cliente,
      estado: EstadoOrden.PAGADO,
      total: 70000,
      moneda: 'ARS',
      referenciaPago: 'MP-REF-0001',
      direccionEnvioId: ids.dirs.envio,
      direccionFacturacionId: ids.dirs.factura,
    },
    create: {
      id: ids.orden.o1,
      usuarioId: ids.users.cliente,
      estado: EstadoOrden.PAGADO,
      total: 70000,
      moneda: 'ARS',
      referenciaPago: 'MP-REF-0001',
      creadoEn: new Date(),
      direccionEnvioId: ids.dirs.envio,
      direccionFacturacionId: ids.dirs.factura,
    },
  });
  await prisma.itemOrden.upsert({
    where: { id: ids.orden.itm1 },
    update: {
      ordenId: ids.orden.o1,
      tipo: TipoItemOrden.PRODUCTO,
      refId: ids.prods.labial,
      titulo: 'Labial Mate Rojo',
      cantidad: 2,
      precioUnitario: 15000,
    },
    create: {
      id: ids.orden.itm1,
      ordenId: ids.orden.o1,
      tipo: TipoItemOrden.PRODUCTO,
      refId: ids.prods.labial,
      titulo: 'Labial Mate Rojo',
      cantidad: 2,
      precioUnitario: 15000,
    },
  });
  await prisma.itemOrden.upsert({
    where: { id: ids.orden.itm2 },
    update: {
      ordenId: ids.orden.o1,
      tipo: TipoItemOrden.CURSO,
      refId: ids.cursos.maqu,
      titulo: 'Maquillaje Profesional',
      cantidad: 1,
      precioUnitario: 40000,
    },
    create: {
      id: ids.orden.itm2,
      ordenId: ids.orden.o1,
      tipo: TipoItemOrden.CURSO,
      refId: ids.cursos.maqu,
      titulo: 'Maquillaje Profesional',
      cantidad: 1,
      precioUnitario: 40000,
    },
  });

  // ───────────────── Slider Images
  await prisma.slider.upsert({
    where: { id: 'hero_img_001' },
    update: {
      titulo: 'Cursos Online Profesionales',
      alt: 'Aprende técnicas profesionales con nuestros cursos online',
      archivo: 'hero-cursos-online.svg',
      activa: true,
      orden: 1,
    },
    create: {
      id: 'hero_img_001',
      titulo: 'Cursos Online Profesionales',
      alt: 'Aprende técnicas profesionales con nuestros cursos online',
      archivo: 'hero-cursos-online.svg',
      activa: true,
      orden: 1,
    },
  });

  await prisma.slider.upsert({
    where: { id: 'hero_img_002' },
    update: {
      titulo: 'Productos de Calidad Premium',
      alt: 'Los mejores productos para profesionales del sector',
      archivo: 'hero-productos-calidad.svg',
      activa: true,
      orden: 2,
    },
    create: {
      id: 'hero_img_002',
      titulo: 'Productos de Calidad Premium',
      alt: 'Los mejores productos para profesionales del sector',
      archivo: 'hero-productos-calidad.svg',
      activa: true,
      orden: 2,
    },
  });

  await prisma.slider.upsert({
    where: { id: 'hero_img_003' },
    update: {
      titulo: 'Instructores Expertos',
      alt: 'Aprende de los mejores profesionales del sector',
      archivo: 'hero-instructores-expertos.svg',
      activa: true,
      orden: 3,
    },
    create: {
      id: 'hero_img_003',
      titulo: 'Instructores Expertos',
      alt: 'Aprende de los mejores profesionales del sector',
      archivo: 'hero-instructores-expertos.svg',
      activa: true,
      orden: 3,
    },
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
