/*
  Warnings:

  - You are about to drop the column `atributos` on the `producto` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productoId,usuarioId]` on the table `Resena` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Inscripcion_cursoId_fkey` ON `inscripcion`;

-- DropIndex
DROP INDEX `Leccion_moduloId_fkey` ON `leccion`;

-- DropIndex
DROP INDEX `Modulo_cursoId_fkey` ON `modulo`;

-- DropIndex
DROP INDEX `Orden_usuarioId_fkey` ON `orden`;

-- DropIndex
DROP INDEX `Resena_usuarioId_fkey` ON `resena`;

-- AlterTable
ALTER TABLE `curso` ADD COLUMN `descripcionMD` VARCHAR(191) NULL,
    ADD COLUMN `destacado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `instructorId` CHAR(25) NULL,
    ADD COLUMN `nivel` ENUM('BASICO', 'INTERMEDIO', 'AVANZADO') NOT NULL DEFAULT 'BASICO',
    ADD COLUMN `portadaUrl` VARCHAR(512) NULL,
    ADD COLUMN `ratingConteo` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ratingProm` DECIMAL(3, 2) NULL,
    ADD COLUMN `tags` JSON NULL;

-- AlterTable
ALTER TABLE `producto` DROP COLUMN `atributos`,
    ADD COLUMN `categoriaId` CHAR(25) NULL,
    ADD COLUMN `descripcionMD` VARCHAR(191) NULL,
    ADD COLUMN `destacado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `imagen` VARCHAR(512) NULL,
    ADD COLUMN `marcaId` CHAR(25) NULL,
    ADD COLUMN `precioLista` INTEGER NULL,
    ADD COLUMN `publicado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ratingConteo` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ratingProm` DECIMAL(3, 2) NULL;

-- AlterTable
ALTER TABLE `resena` ADD COLUMN `productoId` CHAR(25) NULL,
    MODIFY `cursoId` CHAR(25) NULL;

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

-- CreateIndex
CREATE INDEX `Curso_publicado_destacado_creadoEn_idx` ON `Curso`(`publicado`, `destacado`, `creadoEn`);

-- CreateIndex
CREATE FULLTEXT INDEX `Curso_titulo_resumen_idx` ON `Curso`(`titulo`, `resumen`);

-- CreateIndex
CREATE INDEX `ItemOrden_tipo_refId_idx` ON `ItemOrden`(`tipo`, `refId`);

-- CreateIndex
CREATE INDEX `Leccion_moduloId_orden_idx` ON `Leccion`(`moduloId`, `orden`);

-- CreateIndex
CREATE INDEX `Modulo_cursoId_orden_idx` ON `Modulo`(`cursoId`, `orden`);

-- CreateIndex
CREATE INDEX `Orden_usuarioId_estado_creadoEn_idx` ON `Orden`(`usuarioId`, `estado`, `creadoEn`);

-- CreateIndex
CREATE INDEX `Producto_publicado_destacado_creadoEn_idx` ON `Producto`(`publicado`, `destacado`, `creadoEn`);

-- CreateIndex
CREATE INDEX `Producto_marcaId_idx` ON `Producto`(`marcaId`);

-- CreateIndex
CREATE INDEX `Producto_categoriaId_idx` ON `Producto`(`categoriaId`);

-- CreateIndex
CREATE FULLTEXT INDEX `Producto_titulo_idx` ON `Producto`(`titulo`);

-- CreateIndex
CREATE INDEX `Resena_cursoId_idx` ON `Resena`(`cursoId`);

-- CreateIndex
CREATE INDEX `Resena_productoId_idx` ON `Resena`(`productoId`);

-- CreateIndex
CREATE UNIQUE INDEX `unique_resena_producto_usuario` ON `Resena`(`productoId`, `usuarioId`);

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

-- RenameIndex
ALTER TABLE `itemorden` RENAME INDEX `ItemOrden_ordenId_fkey` TO `ItemOrden_ordenId_idx`;

-- RenameIndex
ALTER TABLE `resena` RENAME INDEX `Resena_cursoId_usuarioId_key` TO `unique_resena_curso_usuario`;
