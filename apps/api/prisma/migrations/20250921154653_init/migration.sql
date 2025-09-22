-- CreateTable
CREATE TABLE `usuario` (
    `id` CHAR(25) NOT NULL,
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
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_rol` (
    `usuario_id` CHAR(25) NOT NULL,
    `role_id` CHAR(25) NOT NULL,

    INDEX `usuario_rol_role_id_idx`(`role_id`),
    PRIMARY KEY (`usuario_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorito` (
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `producto_id` CHAR(25) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorito_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `favorito_usuario_id_producto_id_key`(`usuario_id`, `producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `curso` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `resumen` VARCHAR(191) NULL,
    `descripcion_md` VARCHAR(191) NULL,
    `requisitos` TEXT NULL,
    `precio` INTEGER NOT NULL,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `nivel` ENUM('basico', 'intermedio', 'avanzado') NOT NULL DEFAULT 'basico',
    `portada_archivo` VARCHAR(255) NULL,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `tags` JSON NULL,
    `rating_prom` DECIMAL(3, 2) NULL,
    `rating_conteo` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `instructor_id` CHAR(25) NULL,

    UNIQUE INDEX `curso_slug_key`(`slug`),
    INDEX `curso_publicado_destacado_creado_en_idx`(`publicado`, `destacado`, `creado_en`),
    FULLTEXT INDEX `curso_titulo_resumen_idx`(`titulo`, `resumen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripcion` (
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `curso_id` CHAR(25) NOT NULL,
    `estado` ENUM('activada', 'pausada', 'desactivada') NOT NULL DEFAULT 'activada',
    `progreso` JSON NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inscripcion_usuario_id_curso_id_key`(`usuario_id`, `curso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modulo` (
    `id` CHAR(25) NOT NULL,
    `curso_id` CHAR(25) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `parent_id` CHAR(25) NULL,

    INDEX `modulo_curso_id_orden_idx`(`curso_id`, `orden`),
    INDEX `modulo_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leccion` (
    `id` CHAR(25) NOT NULL,
    `modulo_id` CHAR(25) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `duracion_s` INTEGER NOT NULL DEFAULT 0,
    `ruta_src` VARCHAR(191) NULL,
    `orden` INTEGER NOT NULL,
    `tipo` ENUM('video', 'documento', 'quiz', 'texto') NOT NULL DEFAULT 'texto',
    `descripcion` TEXT NULL,
    `contenido` JSON NULL,

    INDEX `leccion_modulo_id_orden_idx`(`modulo_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `precio` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `imagen_archivo` VARCHAR(255) NULL,
    `descripcion_md` VARCHAR(191) NULL,
    `precio_lista` INTEGER NULL,
    `rating_prom` DECIMAL(3, 2) NULL,
    `rating_conteo` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `marca_id` CHAR(25) NULL,
    `categoria_id` CHAR(25) NULL,

    UNIQUE INDEX `producto_slug_key`(`slug`),
    UNIQUE INDEX `producto_sku_key`(`sku`),
    INDEX `producto_publicado_destacado_creado_en_idx`(`publicado`, `destacado`, `creado_en`),
    INDEX `producto_marca_id_idx`(`marca_id`),
    INDEX `producto_categoria_id_idx`(`categoria_id`),
    FULLTEXT INDEX `producto_titulo_idx`(`titulo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto_imagen` (
    `id` CHAR(25) NOT NULL,
    `producto_id` CHAR(25) NOT NULL,
    `archivo` VARCHAR(255) NOT NULL,
    `alt` VARCHAR(255) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `producto_imagen_producto_id_orden_idx`(`producto_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marca` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `imagen_archivo` VARCHAR(255) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `marca_slug_key`(`slug`),
    INDEX `marca_orden_idx`(`orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id` CHAR(25) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(512) NULL,
    `imagen_archivo` VARCHAR(255) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `parent_id` CHAR(25) NULL,

    UNIQUE INDEX `categoria_slug_key`(`slug`),
    INDEX `categoria_parent_id_orden_idx`(`parent_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orden` (
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `estado` ENUM('pendiente', 'pagado', 'cumplido', 'cancelado', 'reembolsado') NOT NULL DEFAULT 'pendiente',
    `total` INTEGER NOT NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'ARS',
    `referencia_pago` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `es_suscripcion` BOOLEAN NOT NULL DEFAULT false,
    `suscripcion_activa` BOOLEAN NULL,
    `suscripcion_id` VARCHAR(191) NULL,
    `suscripcion_frecuencia` INTEGER NULL,
    `suscripcion_tipo_frecuencia` VARCHAR(191) NULL,
    `metadatos` JSON NULL,
    `direccion_envio_id` CHAR(25) NULL,
    `direccion_facturacion_id` CHAR(25) NULL,

    INDEX `orden_usuario_id_estado_creado_en_idx`(`usuario_id`, `estado`, `creado_en`),
    INDEX `orden_es_suscripcion_idx`(`es_suscripcion`),
    INDEX `orden_suscripcion_id_idx`(`suscripcion_id`),
    INDEX `orden_suscripcion_activa_idx`(`suscripcion_activa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_orden` (
    `id` CHAR(25) NOT NULL,
    `orden_id` CHAR(25) NOT NULL,
    `tipo` ENUM('curso', 'producto') NOT NULL,
    `ref_id` CHAR(25) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precio_unitario` INTEGER NOT NULL,

    INDEX `item_orden_orden_id_idx`(`orden_id`),
    INDEX `item_orden_tipo_ref_id_idx`(`tipo`, `ref_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos_suscripciones` (
    `id` CHAR(25) NOT NULL,
    `orden_id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `referencia_pago` VARCHAR(255) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `estado` VARCHAR(50) NOT NULL,
    `metadatos` JSON NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `pagos_suscripciones_orden_id_idx`(`orden_id`),
    INDEX `pagos_suscripciones_usuario_id_idx`(`usuario_id`),
    INDEX `pagos_suscripciones_referencia_pago_idx`(`referencia_pago`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `direccion` (
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
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
    `id` CHAR(25) NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `alt` VARCHAR(255) NOT NULL,
    `archivo` VARCHAR(255) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `slider_activa_orden_idx`(`activa`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena` (
    `id` CHAR(25) NOT NULL,
    `curso_id` CHAR(25) NULL,
    `producto_id` CHAR(25) NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `puntaje` INTEGER NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resena_curso_id_idx`(`curso_id`),
    INDEX `resena_producto_id_idx`(`producto_id`),
    UNIQUE INDEX `unique_resena_curso_usuario`(`curso_id`, `usuario_id`),
    UNIQUE INDEX `unique_resena_producto_usuario`(`producto_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena_like` (
    `id` CHAR(25) NOT NULL,
    `resena_id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `tipo` ENUM('like', 'dislike') NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resena_like_resena_id_idx`(`resena_id`),
    INDEX `resena_like_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `resena_like_resena_id_usuario_id_key`(`resena_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena_respuesta` (
    `id` CHAR(25) NOT NULL,
    `resena_id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `parent_id` CHAR(25) NULL,
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
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `tipo` ENUM('respuesta_resena', 'like_resena', 'mencion') NOT NULL,
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
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `nueva_resena` BOOLEAN NOT NULL DEFAULT true,
    `respuesta_resena` BOOLEAN NOT NULL DEFAULT true,
    `actualizaciones_sistema` BOOLEAN NOT NULL DEFAULT true,
    `mantenimiento` BOOLEAN NOT NULL DEFAULT true,
    `reporte_contenido` BOOLEAN NOT NULL DEFAULT true,
    `contenido_pendiente` BOOLEAN NOT NULL DEFAULT true,
    `resumen_diario` BOOLEAN NOT NULL DEFAULT false,
    `notificaciones_instantaneas` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `preferencias_notificacion_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena_borrador` (
    `id` CHAR(25) NOT NULL,
    `usuario_id` CHAR(25) NOT NULL,
    `curso_id` CHAR(25) NULL,
    `producto_id` CHAR(25) NULL,
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
    `id` CHAR(25) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` VARCHAR(50) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `old_data` JSON NULL,
    `new_data` JSON NULL,
    `user_id` CHAR(25) NOT NULL,
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
ALTER TABLE `pagos_suscripciones` ADD CONSTRAINT `pagos_suscripciones_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `orden`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_suscripciones` ADD CONSTRAINT `pagos_suscripciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
