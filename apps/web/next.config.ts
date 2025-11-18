// next.config.ts
import type { NextConfig } from 'next';
import path from 'path';
import { IMAGE_PUBLIC_URL, DOC_PUBLIC_URL } from './src/lib/adminConstants';

// 1) Resolver BACKEND con fallbacks (runtime interno del cluster)
const BACKEND =
  process.env.BACKEND_INTERNAL_URL // ideal (runtime)
  ?? process.env.NEXT_PUBLIC_API_URL // opcional (si ya lo exponés)
  ?? 'http://api:3001';              // fallback cuando corre en la misma red de Docker (service "api")

function parseUrl(u: string) {
  try { return new URL(u); } catch { return new URL('http://api:3001'); }
}
const U = parseUrl(BACKEND);

const nextConfig: NextConfig = {
  // 2) Solo exponé lo público; lo interno que quede para el server en runtime
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? U.origin,
  },

  // 3) Images: evitar throw si la URL no es válida
  images: {
    unoptimized: true,
    domains: ['localhost', U.hostname],
    remotePatterns: [
      {
        protocol: U.protocol.replace(':', '') as 'http' | 'https',
        hostname: U.hostname,
        port: U.port || undefined,
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
  },

  // 4) Rewrites usando la URL ya parseada
  async rewrites() {
    return [
      { source: '/api/:path*',                  destination: `${U.origin}/api/:path*` },
      { source: '/api/media/images/:path*',     destination: `${U.origin}/api/media/images/:path*` },
      { source: '/api/media/public/:path*',     destination: `${U.origin}/api/media/images/:path*` },
      { source: `${IMAGE_PUBLIC_URL}/:path*`,   destination: `${U.origin}${IMAGE_PUBLIC_URL}/:path*` },
      { source: `${DOC_PUBLIC_URL}/:path*`,     destination: `${U.origin}${DOC_PUBLIC_URL}/:path*` },
      { source: '/uploads/:path*',              destination: `${U.origin}/uploads/:path*` },
      { source: '/static/:path*',               destination: `${U.origin}/static/:path*` },
      { source: '/files/:path*',                destination: `${U.origin}/files/:path*` },
      { source: '/videos/:path*',               destination: `${U.origin}/videos/:path*` },
      { source: '/api/admin/uploads',           destination: `${U.origin}/api/admin/uploads` },
      { source: '/api/admin/uploads/:path*',    destination: `${U.origin}/api/admin/uploads/:path*` },
      { source: '/_next/image',                 destination: '/_next/image' },
    ];
  },

  serverExternalPackages: ['sharp'],

  // Silenciar advertencia de root en workspaces monorepo
  outputFileTracingRoot: path.resolve(__dirname, '..', '..'),
};

export default nextConfig;
