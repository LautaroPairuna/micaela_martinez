/*
  Warnings:

  - You are about to alter the column `subscription_id` on the `inscripcion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(128)`.
  - You are about to alter the column `suscripcion_id` on the `orden` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(128)`.
  - You are about to alter the column `suscripcion_tipo_frecuencia` on the `orden` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(16)`.
  - You are about to drop the `pagos_suscripciones` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `inscripcion` MODIFY `subscription_id` VARCHAR(128) NULL;

-- AlterTable
ALTER TABLE `item_orden` ADD COLUMN `curso_id` INTEGER NULL,
    ADD COLUMN `producto_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `orden` ADD COLUMN `tipo` ENUM('one_off', 'subscription') NOT NULL DEFAULT 'one_off',
    MODIFY `suscripcion_id` VARCHAR(128) NULL,
    MODIFY `suscripcion_tipo_frecuencia` VARCHAR(16) NULL;

-- DropTable
DROP TABLE `pagos_suscripciones`;

-- CreateTable
CREATE TABLE `pago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` ENUM('mercadopago') NOT NULL DEFAULT 'mercadopago',
    `kind` ENUM('one_off', 'subscription_preapproval', 'subscription_payment', 'refund') NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'unknown') NOT NULL DEFAULT 'pending',
    `status_detail` VARCHAR(128) NULL,
    `orden_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `mp_id` VARCHAR(128) NOT NULL,
    `attempt_id` VARCHAR(64) NULL,
    `idempotency_key` VARCHAR(128) NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'ARS',
    `metadatos` JSON NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `pago_orden_id_idx`(`orden_id`),
    INDEX `pago_usuario_id_idx`(`usuario_id`),
    INDEX `pago_status_idx`(`status`),
    INDEX `pago_creado_en_idx`(`creado_en`),
    INDEX `pago_orden_id_attempt_id_idx`(`orden_id`, `attempt_id`),
    UNIQUE INDEX `uniq_pago_provider_kind_mpid`(`provider`, `kind`, `mp_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` ENUM('mercadopago') NOT NULL DEFAULT 'mercadopago',
    `event_type` VARCHAR(64) NOT NULL,
    `data_id` VARCHAR(128) NOT NULL,
    `request_id` VARCHAR(128) NULL,
    `signature` VARCHAR(512) NULL,
    `ts` VARCHAR(32) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `payload` JSON NULL,

    INDEX `webhook_event_received_at_idx`(`received_at`),
    INDEX `webhook_event_status_idx`(`status`),
    UNIQUE INDEX `uniq_webhook_provider_type_dataid`(`provider`, `event_type`, `data_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `item_orden_curso_id_fkey` ON `item_orden`(`curso_id`);

-- CreateIndex
CREATE INDEX `item_orden_producto_id_fkey` ON `item_orden`(`producto_id`);

-- CreateIndex
CREATE INDEX `orden_tipo_idx` ON `orden`(`tipo`);

-- AddForeignKey
ALTER TABLE `usuario_rol` ADD CONSTRAINT `usuario_rol_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_rol` ADD CONSTRAINT `usuario_rol_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripcion` ADD CONSTRAINT `inscripcion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripcion` ADD CONSTRAINT `inscripcion_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modulo` ADD CONSTRAINT `modulo_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leccion` ADD CONSTRAINT `leccion_modulo_id_fkey` FOREIGN KEY (`modulo_id`) REFERENCES `modulo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_marca_id_fkey` FOREIGN KEY (`marca_id`) REFERENCES `marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_imagen` ADD CONSTRAINT `producto_imagen_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_direccion_envio_id_fkey` FOREIGN KEY (`direccion_envio_id`) REFERENCES `direccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_direccion_facturacion_id_fkey` FOREIGN KEY (`direccion_facturacion_id`) REFERENCES `direccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_orden` ADD CONSTRAINT `item_orden_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_orden` ADD CONSTRAINT `item_orden_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_orden` ADD CONSTRAINT `item_orden_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direccion` ADD CONSTRAINT `direccion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_like` ADD CONSTRAINT `resena_like_resena_id_fkey` FOREIGN KEY (`resena_id`) REFERENCES `resena`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_like` ADD CONSTRAINT `resena_like_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_respuesta` ADD CONSTRAINT `resena_respuesta_resena_id_fkey` FOREIGN KEY (`resena_id`) REFERENCES `resena`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_respuesta` ADD CONSTRAINT `resena_respuesta_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_respuesta` ADD CONSTRAINT `resena_respuesta_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `resena_respuesta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion` ADD CONSTRAINT `notificacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preferencias_notificacion` ADD CONSTRAINT `preferencias_notificacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_borrador` ADD CONSTRAINT `resena_borrador_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_borrador` ADD CONSTRAINT `resena_borrador_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena_borrador` ADD CONSTRAINT `resena_borrador_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carrito` ADD CONSTRAINT `carrito_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_carrito` ADD CONSTRAINT `item_carrito_carrito_id_fkey` FOREIGN KEY (`carrito_id`) REFERENCES `carrito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_carrito` ADD CONSTRAINT `item_carrito_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_carrito` ADD CONSTRAINT `item_carrito_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificado` ADD CONSTRAINT `certificado_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificado` ADD CONSTRAINT `certificado_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
