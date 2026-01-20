import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  // Configuración explícita y compatible
  namespace: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Compatibilidad con versiones anteriores
})
@Injectable()
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway inicializado correctamente');
    this.logger.log(`📡 Servidor Socket.IO corriendo en namespace: /`);

    // Configurar el servidor para debugging - verificar que engine existe
    if (server.engine) {
      server.engine.on('connection_error', (err) => {
        this.logger.error('❌ Error en Socket.IO Engine:', err);
      });
      this.logger.log('✅ Event listeners del engine configurados');
    } else {
      this.logger.warn('⚠️ Server.engine no está disponible en afterInit');

      // Configurar listeners cuando el engine esté disponible
      server.on('connection', () => {
        this.logger.log(
          '🔌 Nueva conexión detectada en server.on("connection")',
        );
        if (server.engine) {
          server.engine.on('connection_error', (err) => {
            this.logger.error(
              '❌ Error en Socket.IO Engine (delayed setup):',
              err,
            );
          });
        }
      });
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Nueva conexión WebSocket:`);
    this.logger.log(`- Socket ID: ${client.id}`);
    this.logger.log(`- Namespace: ${client.nsp.name}`);
    this.logger.log(`- Transport: ${client.conn.transport.name}`);
    this.logger.log(`- Query params:`, client.handshake.query);
    this.logger.log(`- Headers:`, client.handshake.headers);
    this.logger.log(`- URL completa:`, client.handshake.url);

    const userId = client.handshake.query.userId as string;
    this.logger.log(`- UserId extraído: ${userId}`);

    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);
      this.logger.log(
        `✅ Usuario ${userId} conectado exitosamente con socket ${client.id}`,
      );

      // Confirmar conexión al cliente
      client.emit('connection-confirmed', {
        socketId: client.id,
        userId,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.logger.warn(`⚠️ Conexión sin userId válido - rechazando conexión`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Desconexión WebSocket:`);
    this.logger.log(`- Socket ID: ${client.id}`);

    // Eliminar el socket de todos los usuarios
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        this.logger.log(
          `✅ Socket ${client.id} eliminado del usuario ${userId}`,
        );
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.logger.log(`✅ Usuario ${userId} completamente desconectado`);
        }
        break;
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: string) {
    this.logger.log(
      `📥 Mensaje 'join' recibido de ${client.id} para usuario ${userId}`,
    );

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    client.emit('joined', { userId, socketId: client.id });
    this.logger.log(`✅ Usuario ${userId} unido exitosamente`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    this.logger.log(`🏓 Ping recibido de ${client.id}:`, data);
    client.emit('pong', { ...data, timestamp: new Date().toISOString() });
  }

  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
      this.logger.log(
        `📤 Evento '${event}' enviado a usuario ${userId} (${sockets.size} sockets)`,
      );
    } else {
      this.logger.warn(`⚠️ No se encontraron sockets para usuario ${userId}`);
    }
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(
      `📢 Evento '${event}' enviado a todos los clientes conectados`,
    );
  }

  // Método para emitir eventos a usuarios administradores
  emitToAdmins(event: string, data: any) {
    // Por ahora emitimos a todos los clientes conectados
    // En el futuro se puede filtrar por rol de administrador
    this.server.emit(event, data);
    this.logger.log(`👑 Evento '${event}' enviado a administradores`);
  }

  // Método para obtener estadísticas de conexiones
  getConnectionStats() {
    const totalUsers = this.userSockets.size;
    const totalSockets = Array.from(this.userSockets.values()).reduce(
      (sum, sockets) => sum + sockets.size,
      0,
    );

    return { totalUsers, totalSockets };
  }
}
