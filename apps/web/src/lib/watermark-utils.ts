/**
 * Utilidades para generar watermarks dinámicos en videos
 * Esto ayuda a identificar la fuente si el contenido es redistribuido
 */

export interface WatermarkConfig {
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  videoId: string;
}

/**
 * Genera un watermark invisible con información del usuario
 * Este watermark se puede insertar en el DOM del video player
 */
export function generateInvisibleWatermark(config: WatermarkConfig): string {
  const watermarkData = {
    u: config.userId,
    n: config.userName,
    e: config.userEmail,
    t: config.timestamp,
    v: config.videoId,
    h: generateHash(config)
  };
  
  // Codificar en base64 para ocultarlo
  return btoa(JSON.stringify(watermarkData));
}

/**
 * Genera un hash único basado en la configuración del usuario
 */
function generateHash(config: WatermarkConfig): string {
  const data = `${config.userId}-${config.videoId}-${config.timestamp}`;
  // Simulación de hash simple (en producción usar crypto)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Genera CSS para watermark visible (opcional)
 */
export function generateVisibleWatermarkCSS(config: WatermarkConfig): string {
  const watermarkText = `${config.userName} - ${new Date(config.timestamp).toLocaleDateString()}`;
  
  return `
    .video-watermark {
      position: absolute;
      bottom: 20px;
      right: 20px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 12px;
      font-family: Arial, sans-serif;
      pointer-events: none;
      z-index: 1000;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    
    .video-watermark::before {
      content: '${watermarkText}';
    }
  `;
}

/**
 * Genera atributos de datos para el elemento video
 * Estos se pueden usar para rastrear el uso del video
 */
export function generateVideoDataAttributes(config: WatermarkConfig): Record<string, string> {
  return {
    'data-user-id': config.userId,
    'data-video-id': config.videoId,
    'data-access-time': config.timestamp,
    'data-watermark': generateInvisibleWatermark(config)
  };
}

/**
 * Genera JavaScript para protección adicional del video
 */
export function generateVideoProtectionScript(config: WatermarkConfig): string {
  return `
    (function() {
      // Deshabilitar clic derecho en el video
      document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'VIDEO') {
          e.preventDefault();
          return false;
        }
      });
      
      // Deshabilitar teclas de descarga
      document.addEventListener('keydown', function(e) {
        // Ctrl+S, Ctrl+Shift+I, F12, etc.
        if ((e.ctrlKey && e.key === 's') || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            e.key === 'F12') {
          e.preventDefault();
          return false;
        }
      });
      
      // Detectar herramientas de desarrollo
      let devtools = {
        open: false,
        orientation: null
      };
      
      setInterval(function() {
        if (window.outerHeight - window.innerHeight > 200 || 
            window.outerWidth - window.innerWidth > 200) {
          if (!devtools.open) {
            devtools.open = true;
            console.clear();
            console.log('%cAcceso no autorizado detectado', 'color: red; font-size: 20px;');
            // Opcional: reportar al servidor
            fetch('/api/security/report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'devtools_detected',
                userId: '${config.userId}',
                videoId: '${config.videoId}',
                timestamp: new Date().toISOString()
              })
            }).catch(() => {});
          }
        } else {
          devtools.open = false;
        }
      }, 500);
      
      // Watermark invisible en consola
      console.log('%cVideo protegido - Usuario: ${config.userName} (${config.userId})', 
                  'color: #888; font-size: 10px;');
    })();
  `;
}