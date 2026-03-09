-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(255) NULL,
    `password_hash` VARCHAR(72) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `email_verificado_en` DATETIME(3) NULL,

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_rol` (
    `usuario_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,

    INDEX `usuario_rol_role_id_idx`(`role_id`),
    PRIMARY KEY (`usuario_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorito_usuario_id_idx`(`usuario_id`),
    INDEX `favorito_producto_id_fkey`(`producto_id`),
    UNIQUE INDEX `favorito_usuario_id_producto_id_key`(`usuario_id`, `producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `curso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(128) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `resumen` VARCHAR(191) NULL,
    `descripcion_md` VARCHAR(191) NULL,
    `requisitos` JSON NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `descuento` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `nivel` ENUM('basico', 'intermedio', 'avanzado') NOT NULL DEFAULT 'basico',
    `portada_archivo` VARCHAR(255) NULL,
    `video_preview_url` VARCHAR(255) NULL,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `que_aprenderas` JSON NULL,
    `tags` JSON NULL,
    `rating_prom` DECIMAL(3, 2) NULL,
    `rating_conteo` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `curso_slug_key`(`slug`),
    INDEX `curso_publicado_destacado_creado_en_idx`(`publicado`, `destacado`, `creado_en`),
    FULLTEXT INDEX `curso_titulo_resumen_idx`(`titulo`, `resumen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripcion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `curso_id` INTEGER NOT NULL,
    `estado` ENUM('activada', 'pausada', 'desactivada') NOT NULL DEFAULT 'activada',
    `progreso` JSON NOT NULL,
    `subscription_order_id` INTEGER NULL,
    `subscription_id` VARCHAR(128) NULL,
    `subscription_end_date` DATETIME(3) NULL,
    `subscription_active` BOOLEAN NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `inscripcion_curso_id_fkey`(`curso_id`),
    INDEX `inscripcion_subscription_order_id_idx`(`subscription_order_id`),
    INDEX `inscripcion_subscription_id_idx`(`subscription_id`),
    INDEX `inscripcion_subscription_end_date_idx`(`subscription_end_date`),
    INDEX `inscripcion_subscription_active_idx`(`subscription_active`),
    UNIQUE INDEX `inscripcion_usuario_id_curso_id_key`(`usuario_id`, `curso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modulo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `curso_id` INTEGER NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `orden` INTEGER NOT NULL,

    INDEX `modulo_curso_id_orden_idx`(`curso_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modulo_id` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `ruta_src` VARCHAR(191) NULL,
    `orden` INTEGER NOT NULL,
    `tipo` ENUM('video', 'documento', 'quiz', 'texto') NOT NULL DEFAULT 'texto',
    `descripcion` TEXT NULL,
    `contenido` JSON NULL,
    `preview_url` VARCHAR(255) NULL,
    `duracion` DOUBLE NOT NULL DEFAULT 0,

    INDEX `leccion_modulo_id_orden_idx`(`modulo_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leccion_tipo_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('video', 'documento', 'quiz', 'texto') NOT NULL,
    `schema` JSON NOT NULL,
    `ui` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leccion_tipo_config_tipo_key`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(128) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `imagen_archivo` VARCHAR(255) NULL,
    `descripcion_md` VARCHAR(191) NULL,
    `especificaciones` JSON NULL,
    `descuento` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `rating_prom` DECIMAL(3, 2) NULL,
    `rating_conteo` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `marca_id` INTEGER NULL,
    `categoria_id` INTEGER NULL,

    UNIQUE INDEX `producto_slug_key`(`slug`),
    INDEX `producto_publicado_destacado_creado_en_idx`(`publicado`, `destacado`, `creado_en`),
    INDEX `producto_publicado_precio_idx`(`publicado`, `precio`),
    INDEX `producto_publicado_marca_id_precio_idx`(`publicado`, `marca_id`, `precio`),
    INDEX `producto_publicado_categoria_id_precio_idx`(`publicado`, `categoria_id`, `precio`),
    INDEX `producto_publicado_marca_id_categoria_id_idx`(`publicado`, `marca_id`, `categoria_id`),
    INDEX `producto_marca_id_idx`(`marca_id`),
    INDEX `producto_categoria_id_idx`(`categoria_id`),
    INDEX `producto_rating_prom_rating_conteo_idx`(`rating_prom`, `rating_conteo`),
    INDEX `producto_stock_idx`(`stock`),
    FULLTEXT INDEX `producto_titulo_idx`(`titulo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto_imagen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `archivo` VARCHAR(255) NOT NULL,
    `alt` VARCHAR(255) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `producto_imagen_producto_id_orden_idx`(`producto_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marca` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(128) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `imagen_archivo` VARCHAR(255) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `marca_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(128) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `imagen_archivo` VARCHAR(255) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categoria_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orden` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `estado` ENUM('pendiente', 'pagado', 'cumplido', 'cancelado', 'reembolsado') NOT NULL DEFAULT 'pendiente',
    `total` DECIMAL(10, 2) NOT NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'ARS',
    `referencia_pago` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `tipo` ENUM('one_off', 'subscription') NOT NULL DEFAULT 'one_off',
    `es_suscripcion` BOOLEAN NOT NULL DEFAULT false,
    `suscripcion_activa` BOOLEAN NULL,
    `suscripcion_id` VARCHAR(128) NULL,
    `suscripcion_frecuencia` INTEGER NULL,
    `suscripcion_tipo_frecuencia` VARCHAR(16) NULL,
    `suscripcion_proximo_pago` DATETIME(3) NULL,
    `metadatos` JSON NULL,
    `direccion_envio_id` INTEGER NULL,
    `direccion_facturacion_id` INTEGER NULL,

    UNIQUE INDEX `orden_suscripcion_id_key`(`suscripcion_id`),
    INDEX `orden_usuario_id_estado_creado_en_idx`(`usuario_id`, `estado`, `creado_en`),
    INDEX `orden_tipo_idx`(`tipo`),
    INDEX `orden_es_suscripcion_idx`(`es_suscripcion`),
    INDEX `orden_suscripcion_activa_idx`(`suscripcion_activa`),
    INDEX `orden_referencia_pago_idx`(`referencia_pago`),
    INDEX `orden_suscripcion_proximo_pago_idx`(`suscripcion_proximo_pago`),
    INDEX `orden_direccion_envio_id_fkey`(`direccion_envio_id`),
    INDEX `orden_direccion_facturacion_id_fkey`(`direccion_facturacion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_orden` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orden_id` INTEGER NOT NULL,
    `tipo` ENUM('curso', 'producto') NOT NULL,
    `ref_id` INTEGER NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precio_unitario` DECIMAL(10, 2) NOT NULL,
    `curso_id` INTEGER NULL,
    `producto_id` INTEGER NULL,

    INDEX `item_orden_orden_id_idx`(`orden_id`),
    INDEX `item_orden_tipo_ref_id_idx`(`tipo`, `ref_id`),
    INDEX `item_orden_curso_id_fkey`(`curso_id`),
    INDEX `item_orden_producto_id_fkey`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `direccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `etiqueta` VARCHAR(64) NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(32) NULL,
    `calle` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(32) NULL,
    `piso_depto` VARCHAR(64) NULL,
    `ciudad` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,
    `cp` VARCHAR(16) NOT NULL,
    `pais` CHAR(2) NOT NULL DEFAULT 'AR',
    `predeterminada` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `direccion_usuario_id_predeterminada_idx`(`usuario_id`, `predeterminada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(255) NOT NULL,
    `alt` VARCHAR(255) NOT NULL,
    `archivo` VARCHAR(255) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `cta_primario_href` VARCHAR(255) NULL,
    `cta_primario_texto` VARCHAR(80) NULL,
    `cta_secundario_href` VARCHAR(255) NULL,
    `cta_secundario_texto` VARCHAR(80) NULL,
    `descripcion` VARCHAR(600) NULL,
    `etiqueta` VARCHAR(80) NULL,
    `subtitulo` VARCHAR(255) NULL,

    INDEX `slider_activa_orden_idx`(`activa`, `orden`),
    INDEX `slider_orden_idx`(`orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `curso_id` INTEGER NULL,
    `producto_id` INTEGER NULL,
    `usuario_id` INTEGER NOT NULL,
    `puntaje` INTEGER NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resena_curso_id_idx`(`curso_id`),
    INDEX `resena_producto_id_idx`(`producto_id`),
    INDEX `resena_usuario_id_fkey`(`usuario_id`),
    UNIQUE INDEX `unique_resena_curso_usuario`(`curso_id`, `usuario_id`),
    UNIQUE INDEX `unique_resena_producto_usuario`(`producto_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena_like` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resena_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('like', 'dislike') NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resena_like_resena_id_idx`(`resena_id`),
    INDEX `resena_like_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `resena_like_resena_id_usuario_id_key`(`resena_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena_respuesta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resena_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `parent_id` INTEGER NULL,
    `contenido` TEXT NOT NULL,
    `eliminado` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `resena_respuesta_resena_id_idx`(`resena_id`),
    INDEX `resena_respuesta_usuario_id_idx`(`usuario_id`),
    INDEX `resena_respuesta_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('respuesta_resena', 'like_resena', 'mencion', 'sistema', 'promocion', 'recordatorio') NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `url` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_usuario_leida_fecha`(`usuario_id`, `leida`, `creado_en`),
    INDEX `idx_usuario_tipo_leida`(`usuario_id`, `tipo`, `leida`),
    INDEX `idx_fecha_leida_cleanup`(`creado_en`, `leida`),
    INDEX `idx_tipo_fecha`(`tipo`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preferencias_notificacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `respuesta_resena` BOOLEAN NOT NULL DEFAULT true,
    `likes_resena` BOOLEAN NOT NULL DEFAULT true,
    `descuentos_favoritos` BOOLEAN NOT NULL DEFAULT true,
    `actualizaciones_sistema` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `preferencias_notificacion_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena_borrador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `curso_id` INTEGER NULL,
    `producto_id` INTEGER NULL,
    `puntaje` INTEGER NULL,
    `comentario` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `resena_borrador_usuario_id_idx`(`usuario_id`),
    INDEX `resena_borrador_curso_id_idx`(`curso_id`),
    INDEX `resena_borrador_producto_id_idx`(`producto_id`),
    UNIQUE INDEX `resena_borrador_curso_id_usuario_id_key`(`curso_id`, `usuario_id`),
    UNIQUE INDEX `resena_borrador_producto_id_usuario_id_key`(`producto_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` VARCHAR(50) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `old_data` JSON NULL,
    `new_data` JSON NULL,
    `user_id` INTEGER NOT NULL,
    `user_agent` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `endpoint` VARCHAR(255) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_timestamp`(`user_id`, `timestamp`),
    INDEX `idx_table_action_timestamp`(`table_name`, `action`, `timestamp`),
    INDEX `idx_record_table`(`record_id`, `table_name`),
    INDEX `idx_timestamp`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carrito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carrito_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_carrito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carrito_id` INTEGER NOT NULL,
    `tipo` ENUM('curso', 'producto') NOT NULL,
    `producto_id` INTEGER NULL,
    `curso_id` INTEGER NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `item_carrito_carrito_id_idx`(`carrito_id`),
    INDEX `item_carrito_curso_id_fkey`(`curso_id`),
    INDEX `item_carrito_producto_id_fkey`(`producto_id`),
    UNIQUE INDEX `unique_item_carrito`(`carrito_id`, `tipo`, `producto_id`, `curso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
