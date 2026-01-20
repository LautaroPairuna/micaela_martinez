// apps/api/src/media/video-progress.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'video-progress',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class VideoProgressGateway {
  @WebSocketServer()
  public server!: Server; // 👈 definite assignment

  private readonly logger = new Logger(VideoProgressGateway.name);

  emitProgress(clientId: string | undefined, percent: number) {
    const payload = { clientId, percent };
    this.logger.debug(
      `Emit video-progress clientId=${clientId} percent=${percent.toFixed(1)}`,
    );
    this.server.emit('video-progress', payload);
  }

  emitStage(clientId: string | undefined, stage: string) {
    const payload = { clientId, stage };
    this.logger.debug(`Emit video-stage clientId=${clientId} stage=${stage}`);
    this.server.emit('video-stage', payload);
  }

  emitDone(clientId: string | undefined) {
    const payload = { clientId };
    this.logger.debug(`Emit video-done clientId=${clientId}`);
    this.server.emit('video-done', payload);
  }

  emitError(clientId: string | undefined, error?: string) {
    const payload = { clientId, error };
    this.logger.warn(
      `Emit video-error clientId=${clientId} error=${error ?? ''}`,
    );
    this.server.emit('video-error', payload);
  }
}
