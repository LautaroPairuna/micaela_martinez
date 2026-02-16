// apps/api/src/media/video-progress.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'video-progress',
  transports: ['websocket', 'polling'], // Permitir polling como fallback
  allowEIO3: true,
  cors: {
    origin: true, // Permitir cualquier origen
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
export class VideoProgressGateway implements OnGatewayConnection {
  @WebSocketServer()
  public server!: Server; // 👈 definite assignment

  private readonly logger = new Logger(VideoProgressGateway.name);
  private readonly progressByClient = new Map<
    string,
    { percent?: number; stage?: string; updatedAt: number }
  >();

  handleConnection(client: Socket) {
    const clientId = String(client.handshake?.query?.clientId ?? '');
    if (!clientId) return;
    this.emitSnapshotToSocket(client, clientId);
  }

  @SubscribeMessage('progress-sync')
  handleProgressSync(
    @MessageBody() body: { clientId?: string } | undefined,
    @ConnectedSocket() client: Socket,
  ) {
    const requested = typeof body?.clientId === 'string' ? body.clientId : '';
    const clientId =
      requested || String(client.handshake?.query?.clientId ?? '');
    if (!clientId) return;
    this.emitSnapshotToSocket(client, clientId);
  }

  private emitSnapshotToSocket(client: Socket, clientId: string) {
    const snapshot = this.progressByClient.get(clientId);
    if (!snapshot) return;
    if (snapshot.stage) {
      client.emit('video-stage', { clientId, stage: snapshot.stage });
    }
    if (typeof snapshot.percent === 'number') {
      client.emit('video-progress', { clientId, percent: snapshot.percent });
    }
  }

  emitProgress(clientId: string | undefined, percent: number) {
    const payload = { clientId, percent };
    if (clientId) {
      this.progressByClient.set(clientId, {
        ...this.progressByClient.get(clientId),
        percent,
        updatedAt: Date.now(),
      });
    }
    this.logger.debug(
      `Emit video-progress clientId=${clientId} percent=${percent.toFixed(1)}`,
    );
    this.server.emit('video-progress', payload);
  }

  emitStage(clientId: string | undefined, stage: string) {
    const payload = { clientId, stage };
    if (clientId) {
      this.progressByClient.set(clientId, {
        ...this.progressByClient.get(clientId),
        stage,
        updatedAt: Date.now(),
      });
    }
    this.logger.debug(`Emit video-stage clientId=${clientId} stage=${stage}`);
    this.server.emit('video-stage', payload);
  }

  emitDone(clientId: string | undefined) {
    const payload = { clientId };
    if (clientId) {
      this.progressByClient.delete(clientId);
    }
    this.logger.debug(`Emit video-done clientId=${clientId}`);
    this.server.emit('video-done', payload);
  }

  emitError(clientId: string | undefined, error?: string) {
    const payload = { clientId, error };
    if (clientId) {
      this.progressByClient.delete(clientId);
    }
    this.logger.warn(
      `Emit video-error clientId=${clientId} error=${error ?? ''}`,
    );
    this.server.emit('video-error', payload);
  }
}
