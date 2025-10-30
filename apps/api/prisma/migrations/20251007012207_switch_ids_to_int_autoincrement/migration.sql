/*
  Warnings:

  - The primary key for the `audit_log` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `audit_log` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `categoria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `categoria` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `parent_id` on the `categoria` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `curso` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `curso` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `direccion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `direccion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `favorito` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `favorito` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `inscripcion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inscripcion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `curso_id` on the `inscripcion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `item_orden` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `item_orden` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `orden_id` on the `item_orden` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `ref_id` on the `item_orden` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `leccion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `leccion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `modulo_id` on the `leccion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `marca` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `marca` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `modulo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `modulo` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `curso_id` on the `modulo` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `parent_id` on the `modulo` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `notificacion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notificacion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `orden` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `orden` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `direccion_envio_id` on the `orden` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `direccion_facturacion_id` on the `orden` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `pagos_suscripciones` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `pagos_suscripciones` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `orden_id` on the `pagos_suscripciones` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `preferencias_notificacion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `preferencias_notificacion` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `marca_id` on the `producto` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `categoria_id` on the `producto` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `producto_imagen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `producto_imagen` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `resena` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `resena` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `curso_id` on the `resena` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `resena_borrador` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `resena_borrador` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `curso_id` on the `resena_borrador` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `resena_like` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `resena_like` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `resena_id` on the `resena_like` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `resena_respuesta` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `resena_respuesta` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `resena_id` on the `resena_respuesta` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - You are about to alter the column `parent_id` on the `resena_respuesta` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `role` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `role` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `slider` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `slider` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.
  - The primary key for the `usuario_rol` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `role_id` on the `usuario_rol` table. The data in that column could be lost. The data in that column will be cast from `Char(25)` to `Int`.

*/
-- DropIndex
DROP INDEX `curso_instructor_id_fkey` ON `curso`;

-- DropIndex
DROP INDEX `favorito_producto_id_fkey` ON `favorito`;

-- DropIndex
DROP INDEX `inscripcion_curso_id_fkey` ON `inscripcion`;

-- DropIndex
DROP INDEX `orden_direccion_envio_id_fkey` ON `orden`;

-- DropIndex
DROP INDEX `orden_direccion_facturacion_id_fkey` ON `orden`;

-- DropIndex
DROP INDEX `resena_usuario_id_fkey` ON `resena`;

-- AlterTable
ALTER TABLE `audit_log` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `categoria` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `parent_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `curso` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `direccion` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `favorito` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `inscripcion` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `curso_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `item_orden` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `orden_id` INTEGER NOT NULL,
    MODIFY `ref_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leccion` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `modulo_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `marca` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `modulo` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `curso_id` INTEGER NOT NULL,
    MODIFY `parent_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `notificacion` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `orden` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `direccion_envio_id` INTEGER NULL,
    MODIFY `direccion_facturacion_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `pagos_suscripciones` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `orden_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `preferencias_notificacion` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `producto` MODIFY `marca_id` INTEGER NULL,
    MODIFY `categoria_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `producto_imagen` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `resena` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `curso_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `resena_borrador` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `curso_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `resena_like` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `resena_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `resena_respuesta` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `resena_id` INTEGER NOT NULL,
    MODIFY `parent_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `role` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `slider` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `usuario_rol` DROP PRIMARY KEY,
    MODIFY `role_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`usuario_id`, `role_id`);

-- AddForeignKey
ALTER TABLE `usuario_rol` ADD CONSTRAINT `usuario_rol_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_rol` ADD CONSTRAINT `usuario_rol_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `curso` ADD CONSTRAINT `curso_instructor_id_fkey` FOREIGN KEY (`instructor_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripcion` ADD CONSTRAINT `inscripcion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripcion` ADD CONSTRAINT `inscripcion_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modulo` ADD CONSTRAINT `modulo_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modulo` ADD CONSTRAINT `modulo_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `modulo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leccion` ADD CONSTRAINT `leccion_modulo_id_fkey` FOREIGN KEY (`modulo_id`) REFERENCES `modulo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_marca_id_fkey` FOREIGN KEY (`marca_id`) REFERENCES `marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_imagen` ADD CONSTRAINT `producto_imagen_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categoria` ADD CONSTRAINT `categoria_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_direccion_envio_id_fkey` FOREIGN KEY (`direccion_envio_id`) REFERENCES `direccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_direccion_facturacion_id_fkey` FOREIGN KEY (`direccion_facturacion_id`) REFERENCES `direccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_orden` ADD CONSTRAINT `item_orden_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_suscripciones` ADD CONSTRAINT `pagos_suscripciones_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_suscripciones` ADD CONSTRAINT `pagos_suscripciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direccion` ADD CONSTRAINT `direccion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_like` ADD CONSTRAINT `resena_like_resena_id_fkey` FOREIGN KEY (`resena_id`) REFERENCES `resena`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_like` ADD CONSTRAINT `resena_like_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_respuesta` ADD CONSTRAINT `resena_respuesta_resena_id_fkey` FOREIGN KEY (`resena_id`) REFERENCES `resena`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_respuesta` ADD CONSTRAINT `resena_respuesta_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_respuesta` ADD CONSTRAINT `resena_respuesta_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `resena_respuesta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion` ADD CONSTRAINT `notificacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preferencias_notificacion` ADD CONSTRAINT `preferencias_notificacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_borrador` ADD CONSTRAINT `resena_borrador_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_borrador` ADD CONSTRAINT `resena_borrador_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_borrador` ADD CONSTRAINT `resena_borrador_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
