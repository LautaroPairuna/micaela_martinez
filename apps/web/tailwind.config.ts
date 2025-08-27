import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
        fontFamily: {
            sans: ['var(--font-montserrat)'],
            display: ['var(--font-cincel)'],   // 👈 esto habilita fontFamily.display
        },
        borderRadius: { xl2: '1rem' },
        boxShadow: { soft: '0 6px 24px rgba(0,0,0,.08)' },
        screens: {
          bp1200: '1200px',
        },
    }
  },
  plugins: [],
} satisfies Config;
