'use client';

import { useCart } from '@/store/cart';

type CourseForCartButton = {
  id: string | number;
  slug: string;
  titulo: string;
  precio: number; // precio directo
  portadaUrl?: string | null;
};

export function BuyCourseButton({ c, className }: { c: CourseForCartButton; className?: string }) {
  const addCourse = useCart((s) => s.addCourse);

  const handleAddCourse = async () => {
    try {
      await addCourse({
        id: String(c.id),
        slug: c.slug,
        title: c.titulo,
        price: c.precio,
        image: c.portadaUrl ?? null,
      });
    } catch (error) {
      console.error('Error al agregar curso al carrito:', error);
    }
  };

  return (
    <button
      onClick={handleAddCourse}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--gold)] via-[var(--gold)] to-[var(--gold)]/90 px-8 py-4 font-bold text-black shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${className || ''}`}
    >
      {/* Efecto de brillo animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      
      {/* Contenido del botón */}
      <div className="relative flex items-center justify-center gap-3">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6V5a2 2 0 114 0v1H8zm2 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span className="text-lg font-black tracking-wide">COMPRAR AHORA</span>
        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
      
      {/* Borde brillante */}
      <div className="absolute inset-0 rounded-2xl ring-2 ring-[var(--gold)]/50 group-hover:ring-[var(--gold)]/80 transition-all duration-300" />
    </button>
  );
}
