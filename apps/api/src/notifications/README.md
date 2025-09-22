# Módulo de Notificaciones

Este módulo es responsable de gestionar y entregar notificaciones a los usuarios en tiempo real.

## Arquitectura

El sistema de notificaciones se compone de varios servicios que trabajan en conjunto:

-   `notifications.service.ts`: Proporciona la lógica de negocio principal para gestionar las notificaciones (crear, leer, eliminar, etc.).
-   `notifications.controller.ts`: Expone los endpoints de la API REST para que el frontend interactúe con el servicio de notificaciones.
-   `notification-listener.service.ts`: Escucha eventos del sistema (como la creación de un nuevo recurso) y crea notificaciones para los administradores.
-   `notifications-task.service.ts`: Contiene tareas programadas (cron jobs) relacionadas con las notificaciones, como la limpieza de notificaciones antiguas.
-   `preferences.controller.ts`: Gestiona las preferencias de notificación de los usuarios.
-   `websocket.gateway.ts`: Emite eventos de notificación en tiempo real a los clientes conectados a través de WebSockets.

## Flujo de Notificaciones del Sistema

1.  **Disparo del Evento**: Cualquier parte del sistema puede emitir un evento utilizando `EventEmitter2`. Por ejemplo, cuando se crea un nuevo producto, se emite un evento `resource.created`.
2.  **Escucha del Evento**: `NotificationListenerService` está suscrito a estos eventos (`@OnEvent`).
3.  **Creación de Notificación**: Cuando el listener recibe un evento, procesa la información y utiliza `createNotificationForAdmins` para:
    a.  Encontrar todos los usuarios con el rol de 'admin'.
    b.  Crear un registro de `Notificacion` en la base de datos para cada administrador.
4.  **Emisión por WebSocket**: Por cada notificación creada, se emite un evento `nueva-notificacion` a través del `WebsocketGateway` al usuario correspondiente.
5.  **Recepción en el Frontend**: El cliente frontend, que está escuchando este evento de WebSocket, recibe la nueva notificación y actualiza la interfaz de usuario en tiempo real.

## Tipos de Notificación

El `enum TipoNotificacion` en `schema.prisma` define los tipos de notificaciones que se pueden enviar. Actualmente, se utiliza `SISTEMA` para todas las notificaciones generadas por eventos de recursos.

## Refactorización Reciente

El `notification-listener.service.ts` ha sido refactorizado para mejorar su mantenibilidad y eficiencia:

-   **Lógica Unificada**: Los manejadores de eventos para `created`, `updated` y `deleted` se han consolidado en un único método `handleResourceEvent`.
-   **Creación Individual**: Las notificaciones se crean una por una en lugar de usar `createMany`. Esto permite obtener el objeto de notificación completo y emitirlo inmediatamente a través de WebSockets sin necesidad de una consulta adicional a la base de datos.
-   **Código Limpio**: Se eliminaron importaciones y código duplicado.