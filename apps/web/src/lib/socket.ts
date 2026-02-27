import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function computeWsBase(): string {
  const api = (process.env.NEXT_PUBLIC_BACKEND_WS_URL?.trim()
    || process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()) || 'http://localhost:3001';
  const base = api.replace(/\/+$/, '');
  return base.replace(/\/api$/i, '');
}

export const initializeSocket = (userId: string): Socket => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const serverUrl = computeWsBase();

  socket = io(serverUrl, {
    query: { userId },
    autoConnect: true,
    forceNew: true,
    timeout: 10000,
    transports: ['websocket', 'polling'],
    withCredentials: false,
  });

  socket.on('connect', () => {
    socket?.emit('ping', { message: 'test ping', userId, timestamp: Date.now() });
  });

  socket.on('connect_error', (error: Error & { type?: string; description?: string }) => {
    void error;
  });

  socket.on('disconnect', () => {
    /* noop */
  });

  socket.on('connection-confirmed', () => {
    /* noop */
  });

  socket.on('pong', () => {
    /* noop */
  });

  socket.on('joined', () => {
    /* noop */
  });

  socket.onAny(() => {
    /* noop */
  });

  socket.on('error', () => {
    /* noop */
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export type { Socket } from 'socket.io-client';