-- CreateTable
CREATE TABLE `Usuario` (
    `id` CHAR(25) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(255) NULL,
    `passwordHash` VARCHAR(72) NOT NULL,
    `rol` ENUM('ADMIN', 'INSTRUCTOR', 'ESTUDIANTE') NOT NULL DEFAULT 'ESTUDIANTE',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Curso` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `resumen` VARCHAR(191) NULL,
    `descripcionMD` VARCHAR(191) NULL,
    `precio` INTEGER NOT NULL,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `nivel` ENUM('BASICO', 'INTERMEDIO', 'AVANZADO') NOT NULL DEFAULT 'BASICO',
    `portadaUrl` VARCHAR(512) NULL,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `tags` JSON NULL,
    `ratingProm` DECIMAL(3, 2) NULL,
    `ratingConteo` INTEGER NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `instructorId` CHAR(25) NULL,

    UNIQUE INDEX `Curso_slug_key`(`slug`),
    INDEX `Curso_publicado_destacado_creadoEn_idx`(`publicado`, `destacado`, `creadoEn`),
    FULLTEXT INDEX `Curso_titulo_resumen_idx`(`titulo`, `resumen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Modulo` (
    `id` CHAR(25) NOT NULL,
    `cursoId` CHAR(25) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,

    INDEX `Modulo_cursoId_orden_idx`(`cursoId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Leccion` (
    `id` CHAR(25) NOT NULL,
    `moduloId` CHAR(25) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `duracionS` INTEGER NOT NULL DEFAULT 0,
    `rutaSrc` VARCHAR(191) NULL,
    `orden` INTEGER NOT NULL,

    INDEX `Leccion_moduloId_orden_idx`(`moduloId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inscripcion` (
    `id` CHAR(25) NOT NULL,
    `usuarioId` CHAR(25) NOT NULL,
    `cursoId` CHAR(25) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'active',
    `progreso` JSON NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Inscripcion_usuarioId_cursoId_key`(`usuarioId`, `cursoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producto` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `precio` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `imagen` VARCHAR(512) NULL,
    `descripcionMD` VARCHAR(191) NULL,
    `precioLista` INTEGER NULL,
    `ratingProm` DECIMAL(3, 2) NULL,
    `ratingConteo` INTEGER NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `marcaId` CHAR(25) NULL,
    `categoriaId` CHAR(25) NULL,

    UNIQUE INDEX `Producto_slug_key`(`slug`),
    UNIQUE INDEX `Producto_sku_key`(`sku`),
    INDEX `Producto_publicado_destacado_creadoEn_idx`(`publicado`, `destacado`, `creadoEn`),
    INDEX `Producto_marcaId_idx`(`marcaId`),
    INDEX `Producto_categoriaId_idx`(`categoriaId`),
    FULLTEXT INDEX `Producto_titulo_idx`(`titulo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductoImagen` (
    `id` CHAR(25) NOT NULL,
    `productoId` CHAR(25) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `alt` VARCHAR(255) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProductoImagen_productoId_orden_idx`(`productoId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Marca` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `imagen` VARCHAR(512) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Marca_slug_key`(`slug`),
    INDEX `Marca_orden_idx`(`orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categoria` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(512) NULL,
    `imagen` VARCHAR(512) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `parentId` CHAR(25) NULL,

    UNIQUE INDEX `Categoria_slug_key`(`slug`),
    INDEX `Categoria_parentId_orden_idx`(`parentId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Orden` (
    `id` CHAR(25) NOT NULL,
    `usuarioId` CHAR(25) NOT NULL,
    `estado` ENUM('PENDIENTE', 'PAGADO', 'CUMPLIDO', 'CANCELADO', 'REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
    `total` INTEGER NOT NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'ARS',
    `referenciaPago` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Orden_usuarioId_estado_creadoEn_idx`(`usuarioId`, `estado`, `creadoEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemOrden` (
    `id` CHAR(25) NOT NULL,
    `ordenId` CHAR(25) NOT NULL,
    `tipo` ENUM('CURSO', 'PRODUCTO') NOT NULL,
    `refId` CHAR(25) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precioUnitario` INTEGER NOT NULL,

    INDEX `ItemOrden_ordenId_idx`(`ordenId`),
    INDEX `ItemOrden_tipo_refId_idx`(`tipo`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Resena` (
    `id` CHAR(25) NOT NULL,
    `cursoId` CHAR(25) NULL,
    `productoId` CHAR(25) NULL,
    `usuarioId` CHAR(25) NOT NULL,
    `puntaje` INTEGER NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Resena_cursoId_idx`(`cursoId`),
    INDEX `Resena_productoId_idx`(`productoId`),
    UNIQUE INDEX `unique_resena_curso_usuario`(`cursoId`, `usuarioId`),
    UNIQUE INDEX `unique_resena_producto_usuario`(`productoId`, `usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Modulo` ADD CONSTRAINT `Modulo_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Leccion` ADD CONSTRAINT `Leccion_moduloId_fkey` FOREIGN KEY (`moduloId`) REFERENCES `Modulo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_marcaId_fkey` FOREIGN KEY (`marcaId`) REFERENCES `Marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `Categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoImagen` ADD CONSTRAINT `ProductoImagen_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Categoria` ADD CONSTRAINT `Categoria_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Orden` ADD CONSTRAINT `Orden_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemOrden` ADD CONSTRAINT `ItemOrden_ordenId_fkey` FOREIGN KEY (`ordenId`) REFERENCES `Orden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resena` ADD CONSTRAINT `Resena_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resena` ADD CONSTRAINT `Resena_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resena` ADD CONSTRAINT `Resena_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
