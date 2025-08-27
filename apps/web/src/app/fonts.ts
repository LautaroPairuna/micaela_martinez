// apps/web/src/app/fonts.ts
import localFont from 'next/font/local';

export const montserrat = localFont({
  src: [{ path: '../../public/fonts/montserrat.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-montserrat',
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
});

export const tanAegean = localFont({
  src: [{ path: '../../public/fonts/tanAegean.woff2', weight: '400 900', style: 'normal' }],
  variable: '--font-tanAegean',
  display: 'swap',
  preload: true,
  fallback: ['ui-serif', 'Georgia', 'Times New Roman', 'Times', 'serif'],
});
