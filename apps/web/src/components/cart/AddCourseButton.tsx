'use client';

import { useCart } from '@/store/cart';

type CourseForCartButton = {
  id?: string | number;
  slug: string;
  titulo: string;
  precio: number; // precio directo
  portadaUrl?: string | null;
};

export function AddCourseButton({ c, className }: { c: CourseForCartButton; className?: string }) {
  const addCourse = useCart((s) => s.addCourse);

  const image = c.portadaUrl ?? null;

  const handleAddToCart = async () => {
    try {
      await addCourse({
        id: String(c.id || c.slug),
        slug: c.slug,
        title: c.titulo,
        price: c.precio,
        image,
      });
    } catch (error) {
      console.error('Error al agregar curso al carrito:', error);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 px-4 py-2 text-center transition-all duration-300 hover:from-gray-700 hover:to-gray-600 hover:border-[var(--gold)]/50 hover:shadow-md ${className || ''}`}
    >
      <span className="text-sm font-medium text-gray-200 transition-colors hover:text-[var(--gold)]">Añadir al carrito</span>
    </button>
  )
}