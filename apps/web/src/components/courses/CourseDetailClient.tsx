'use client';

import { useEffect } from 'react';
import { useScrollToComment } from '@/hooks/useScrollToComment';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';

interface CourseDetailClientProps {
  cursoId: string;
  title: string;
  className?: string;
}

export function CourseDetailClient({ cursoId, title, className }: CourseDetailClientProps) {
  const { navigateToComment } = useScrollToComment({
    onExpandReview: (reviewId: string) => {
      // Lógica para expandir reseña si es necesario
      console.log('Expanding review:', reviewId);
    },
    onExpandResponses: (reviewId: string) => {
      // Lógica para expandir respuestas si es necesario
  
    }
  });

  useEffect(() => {
    // El hook ya maneja la detección automática del hash en la URL
    // No necesitamos lógica adicional aquí
  }, []);

  return (
    <ReviewsSection
      cursoId={cursoId}
      title={title}
      className={className}
    />
  );
}