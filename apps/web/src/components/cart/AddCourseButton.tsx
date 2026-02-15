'use client';

import { useCart } from '@/store/cart';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    // Backend ahora soporta slugs, así que usamos ID o Slug indistintamente
    const idToUse = c.id ? String(c.id) : c.slug;

    try {
      await addCourse({
        id: idToUse,
        slug: c.slug,
        title: c.titulo,
        price: c.precio,
        image,
      });
      toast.success('Curso agregado al carrito');
    } catch (error) {
      console.error('Error al agregar curso al carrito:', error);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      className={cn(
        "rounded-xl bg-[var(--pink)] px-4 py-2 text-center shadow-lg transition-all duration-300 hover:bg-[var(--pink-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pink)]/40",
        className
      )}
    >
      <span className="text-sm font-bold text-black">Suscribirse</span>
    </button>
  )
}