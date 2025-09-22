import type { NextConfig } from 'next';
import { IMAGE_PUBLIC_URL, MEDIA_PUBLIC_URL, DOC_PUBLIC_URL } from './src/lib/adminConstants';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Para <Image /> de Next y optimización remota
  images: {
    unoptimized: true, // Desactivamos la optimización para evitar problemas
    domains: ['localhost', new URL(BACKEND).hostname],
    remotePatterns: [
      {
        protocol: new URL(BACKEND).protocol.replace(':', '') as 'http' | 'https',
        hostname: new URL(BACKEND).hostname,
        port: new URL(BACKEND).port || undefined,
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
  },

  // Configuración para Sharp
  serverExternalPackages: ['sharp'],

  // Rewrites para proxear API y assets
  async rewrites() {
    return [
      // Proxy API
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
      // Rewrite para imágenes públicas
      {
        source: '/api/media/images/:path*',
        destination: `${BACKEND}/api/media/images/:path*`,
      },
      // Rewrite directo para imágenes
      {
        source: '/api/media/public/:path*',
        destination: `${BACKEND}/api/media/images/:path*`,
      },
      // Rewrite para imágenes del slider
      {
        source: '/api/media/images/:path*',
        destination: `${BACKEND}/api/media/images/:path*`,
      },
      // Rewrite para el componente Next.js Image
      {
        source: '/_next/image',
        destination: '/_next/image',
      },
      // ====== STATIC PROXIES HACIA EL BACKEND ======
      // Imágenes públicas (p.ej. /images/producto/...)
      { source: `${IMAGE_PUBLIC_URL}/:path*`, destination: `${BACKEND}${IMAGE_PUBLIC_URL}/:path*` },

      // Documentos públicos (si sirves PDFs estaticamente en /docs)
      { source: `${DOC_PUBLIC_URL}/:path*`, destination: `${BACKEND}${DOC_PUBLIC_URL}/:path*` },

      // Carpetas útiles si las usas (ajusta según tu estructura en el back)
      { source: `/uploads/:path*`,  destination: `${BACKEND}/uploads/:path*` },
      { source: `/static/:path*`,   destination: `${BACKEND}/static/:path*` },
      { source: `/files/:path*`,    destination: `${BACKEND}/files/:path*` },
      { source: `/videos/:path*`,   destination: `${BACKEND}/videos/:path*` },

      // Endpoints de administración para upload/borrado (AdminUploadsController)
      { source: `/api/admin/uploads`,        destination: `${BACKEND}/api/admin/uploads` },
      { source: `/api/admin/uploads/:path*`, destination: `${BACKEND}/api/admin/uploads/:path*` },
    ];
  },
};

export default nextConfig;
