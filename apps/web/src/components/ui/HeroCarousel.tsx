"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "./SafeImage";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroImage {
  id: string;
  titulo: string;
  alt: string;
  src: string;
  objectPosition?: string;
  orden: number;
}

interface BackendHeroImage {
  id: string | number;
  titulo?: string;
  alt?: string;
  archivo: string;
  objectPosition?: string;
  orden?: number | string;
}

interface HeroCarouselProps {
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

export function HeroCarousel({
  autoPlay = true,
  autoPlayInterval = 5000,
  className = ""
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch images from API
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/hero/images");
        if (!response.ok) {
          throw new Error("Error al cargar las imágenes");
        }
        const data: BackendHeroImage[] = await response.json();

        const imagesWithSrc: HeroImage[] = data.map((image) => {
          const archivo = image.archivo ?? "";
          const isSvg = archivo.toLowerCase().endsWith(".svg");
          return {
            id: String(image.id),
            titulo: image.titulo ?? "",
            alt: image.alt ?? "",
            objectPosition: image.objectPosition,
            orden: Number(image.orden ?? 0),
            // Para SVG, servimos directo desde /images; para los demás, via proxy
            src: isSvg
              ? `/images/hero/${archivo}`
              : `/api/media/images/hero/${archivo}`,
          };
        });

        setImages(imagesWithSrc);
        setError(null);
      } catch (err) {
        console.error("Error fetching hero images:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
        // Fallback
        setImages([
          {
            id: "fallback-1",
            titulo: "Hero Principal",
            alt: "Imagen principal del sitio",
            src: "/images/placeholder.jpg",
            objectPosition: "50% 50%",
            orden: 0,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || isHovered || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === images.length - 1 ? 0 : prev + 1
      );
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, images.length]);

  const goToPrevious = () => {
    setCurrentIndex((idx) => (idx === 0 ? images.length - 1 : idx - 1));
  };

  const goToNext = () => {
    setCurrentIndex((idx) => (idx === images.length - 1 ? 0 : idx + 1));
  };

  const goToSlide = (index: number) => setCurrentIndex(index);

  if (loading) {
    return (
      <div className={`w-full aspect-[4/3] xl:aspect-[16/9] 2xl:aspect-[21/9] bg-gray-200 ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-300 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error && images.length === 0) {
    return (
      <div className={`w-full aspect-[4/3] xl:aspect-[16/9] 2xl:aspect-[21/9] bg-gray-200 ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-center">
          <div>
            <p className="text-gray-500 mb-2">Error al cargar las imágenes</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`w-full aspect-[4/3] xl:aspect-[16/9] 2xl:aspect-[21/9] bg-gray-200 ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          No hay imágenes disponibles
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full aspect-[4/3] xl:aspect-[16/9] 2xl:aspect-[21/9] overflow-hidden group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={image.id ?? index}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <SafeImage
              src={image.src}
              alt={image.alt}
              className="w-full h-full"
              ratio="auto"
              objectPosition={image.objectPosition || "50% 50%"}
              priority={index === 0}
              withBg={false}
              rounded="none"
              skeleton={false}
            />
          </div>
        ))}
      </div>

      {/* Controles */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10
                       bg-black/50 hover:bg-black/70 text-white
                       w-10 h-10 rounded-full flex items-center justify-center
                       transition-all duration-300 opacity-0 group-hover:opacity-100"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10
                       bg-black/50 hover:bg-black/70 text-white
                       w-10 h-10 rounded-full flex items-center justify-center
                       transition-all duration-300 opacity-0 group-hover:opacity-100"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                          flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-white scale-125"
                    : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Overlay sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
