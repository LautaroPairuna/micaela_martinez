export type SliderItem = {
  id: number;
  titulo: string;
  alt: string;
  archivo: string;

  subtitulo?: string | null;
  descripcion?: string | null;
  etiqueta?: string | null;

  ctaPrimarioTexto?: string | null;
  ctaPrimarioHref?: string | null;
  ctaSecundarioTexto?: string | null;
  ctaSecundarioHref?: string | null;

  activa: boolean;
  orden: number;

  creadoEn?: string;        // si lo devolvés en admin
  actualizadoEn?: string;   // si lo devolvés en admin
};

export type HeroSlide = SliderItem & {
  // el backend lo devuelve armado
  src: string; // "/api/hero/image/<archivo>"
};
