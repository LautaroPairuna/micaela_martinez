-- CreateTable
CREATE TABLE `certificado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `curso_id` INTEGER NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `certificado_uuid_key`(`uuid`),
    INDEX `certificado_usuario_id_idx`(`usuario_id`),
    INDEX `certificado_curso_id_idx`(`curso_id`),
    UNIQUE INDEX `certificado_usuario_id_curso_id_key`(`usuario_id`, `curso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
ALTER TABLE `modulo` ADD CONSTRAINT `modulo_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `modulo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leccion` ADD CONSTRAINT `leccion_modulo_id_fkey` FOREIGN KEY (`modulo_id`) REFERENCES `modulo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_marca_id_fkey` FOREIGN KEY (`marca_id`) REFERENCES `marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_imagen` ADD CONSTRAINT `producto_imagen_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categoria` ADD CONSTRAINT `categoria_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_direccion_envio_id_fkey` FOREIGN KEY (`direccion_envio_id`) REFERENCES `direccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orden` ADD CONSTRAINT `orden_direccion_facturacion_id_fkey` FOREIGN KEY (`direccion_facturacion_id`) REFERENCES `direccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_orden` ADD CONSTRAINT `item_orden_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_suscripciones` ADD CONSTRAINT `pagos_suscripciones_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_suscripciones` ADD CONSTRAINT `pagos_suscripciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
