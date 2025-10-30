import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (userId: string): Socket => {
  console.log('🔧 [Socket] Inicializando conexión Socket.IO...');
  console.log('🔧 [Socket] UserId:', userId);
  
  // Desconectar socket existente si existe
  if (socket) {
    console.log('🔧 [Socket] Desconectando socket existente...');
    socket.disconnect();
    socket = null;
  }

  // URL base sin namespace explícito (usa el namespace por defecto '/')
  const serverUrl = 'http://localhost:3001';
  
  console.log('🔧 [Socket] Conectando a:', serverUrl);
  console.log('🔧 [Socket] Query params:', { userId });

  // Configuración mínima - sin especificar namespace
  socket = io(serverUrl, {
    query: { userId },
    autoConnect: true,
    forceNew: true,
    timeout: 10000,
  });

  // Event listeners para debugging
  socket.on('connect', () => {
    console.log('✅ [Socket] Conectado exitosamente!');
    console.log('✅ [Socket] Socket ID:', socket?.id);
    console.log('✅ [Socket] Namespace actual:', (socket as any)?.nsp?.name || 'undefined');
    console.log('✅ [Socket] Transport:', (socket as any)?.io?.engine?.transport?.name);
    console.log('✅ [Socket] Estado conectado:', socket?.connected);
    
    // Enviar ping de prueba
    socket?.emit('ping', { message: 'test ping', userId, timestamp: Date.now() });
  });

  socket.on('connect_error', (error: any) => {
    console.error('❌ [Socket] Error de conexión:', error);
    console.error('❌ [Socket] Tipo de error:', error.type || 'N/A');
    console.error('❌ [Socket] Descripción:', error.description || 'N/A');
    console.error('❌ [Socket] Context:', error.context || 'N/A');
    console.error('❌ [Socket] Transport:', error.transport || 'N/A');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 [Socket] Desconectado. Razón:', reason);
  });

  socket.on('connection-confirmed', (data) => {
    console.log('🎉 [Socket] Conexión confirmada por el servidor:', data);
  });

  socket.on('pong', (data) => {
    console.log('🏓 [Socket] Pong recibido:', data);
  });

  socket.on('joined', (data) => {
    console.log('🎯 [Socket] Join confirmado:', data);
  });

  // Listener genérico para todos los eventos
  socket.onAny((eventName, ...args) => {
    console.log(`📨 [Socket] Evento recibido: ${eventName}`, args);
  });

  // Listener para errores generales
  socket.on('error', (error) => {
    console.error('❌ [Socket] Error general:', error);
  });

  console.log('🔧 [Socket] Socket creado, intentando conectar...');
  
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    console.log('🔌 [Socket] Desconectando socket...');
    socket.disconnect();
    socket = null;
  }
};

// Exportar el tipo Socket para uso en otros archivos
export type { Socket } from 'socket.io-client';