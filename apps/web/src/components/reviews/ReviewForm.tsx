'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Star, Send, Edit3, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useReviewDraft } from '@/hooks/useReviewDraft';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const reviewSchema = z.object({
  puntaje: z.number().min(1, 'Debe seleccionar una calificación').max(5),
  comentario: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  cursoId?: string;
  productoId?: string;
  existingReview?: {
    id: string;
    puntaje: number;
    comentario?: string | null;
    creadoEn: string | Date;
  } | null;
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ReviewForm({
  cursoId,
  productoId,
  existingReview,
  onSubmit,
  onCancel,
  isLoading = false,
}: ReviewFormProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Hook para manejo de borradores (solo para nuevas reseñas)
  const {
    draft,
    saveDraft,
    clearDraft,
    hasDraft,
    lastSaved,
    isAutoSaving,
  } = useReviewDraft({
    cursoId,
    productoId,
    enabled: !isEditing, // Solo para nuevas reseñas
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      puntaje: existingReview?.puntaje || draft?.puntaje || 0,
      comentario: existingReview?.comentario || draft?.comentario || '',
    },
  });

  const watchedRating = watch('puntaje');
  const watchedComment = watch('comentario');

  // Mostrar notificación de borrador disponible
  useEffect(() => {
    if (!isEditing && hasDraft && !showDraftNotice) {
      setShowDraftNotice(true);
    }
  }, [isEditing, hasDraft, showDraftNotice]);

  // Cargar borrador en el formulario si existe (solo una vez)
  useEffect(() => {
    if (!isEditing && draft && !existingReview) {
      const currentRating = getValues('puntaje');
      const currentComment = getValues('comentario');
      
      // Solo cargar si los valores actuales están vacíos/por defecto
      if (draft.puntaje > 0 && (currentRating === 0 || currentRating === undefined)) {
        setValue('puntaje', draft.puntaje, { shouldValidate: false });
      }
      if (draft.comentario && (!currentComment || currentComment === '')) {
        setValue('comentario', draft.comentario, { shouldValidate: false });
      }
    }
  }, [draft, getValues, setValue, isEditing, existingReview]);

  // Auto-guardar cambios (con debounce implícito)
  useEffect(() => {
    if (!isEditing && (watchedRating > 0 || (watchedComment && watchedComment.trim().length > 0))) {
      // Solo guardar si el contenido ha cambiado realmente
      const currentDraftRating = draft?.puntaje || 0;
      const currentDraftComment = draft?.comentario || '';
      const hasChanged = 
        (currentDraftRating !== watchedRating) || 
        (currentDraftComment !== (watchedComment || ''));
      
      if (hasChanged) {
        saveDraft({
          puntaje: watchedRating,
          comentario: watchedComment || '',
        });
      }
    }
  }, [watchedRating, watchedComment, isEditing, saveDraft, draft]);

  const handleRatingClick = (rating: number) => {
    setValue('puntaje', rating, { shouldValidate: true });
  };

  const handleFormSubmit = async (data: ReviewFormData) => {
    try {
      await onSubmit(data);
      // Limpiar borrador después de envío exitoso
      if (!isEditing) {
        clearDraft();
      }
    } catch (error) {
      console.error('Error al enviar reseña:', error);
    }
  };

  const handleLoadDraft = () => {
    if (draft) {
      setValue('puntaje', draft.puntaje);
      setValue('comentario', draft.comentario);
      setShowDraftNotice(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftNotice(false);
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return 'Selecciona una calificación';
    }
  };

  if (existingReview && !isEditing) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-[var(--fg)]">Tu reseña</h3>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Clock className="w-4 h-4" />
              <span>
                Publicada {formatDistanceToNow(new Date(existingReview.creadoEn), { addSuffix: true, locale: es })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= existingReview.puntaje ? 'text-[var(--gold)] fill-current' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="font-medium text-[var(--fg)]">{existingReview.puntaje}/5</span>
        </div>

        {existingReview.comentario && (
          <div className="prose prose-sm max-w-none text-[var(--fg)]">
            <p className="whitespace-pre-line">{existingReview.comentario}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-[var(--fg)]">
            {isEditing ? 'Editar tu reseña' : 'Escribe una reseña'}
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Tu opinión ayuda a otros estudiantes a elegir el mejor curso.
          </p>
        </div>
          {/* Rating Stars */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--fg)]">
              Calificación *
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= (hoveredRating || watchedRating);
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`p-1 transition-all duration-200 hover:scale-110 ${
                        isActive ? 'text-[var(--gold)]' : 'text-gray-400'
                      }`}
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      <Star
                        className={`h-8 w-8 transition-all duration-200 ${
                          isActive ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-sm text-[var(--muted)] ml-2">
                {getRatingText(hoveredRating || watchedRating)}
              </span>
            </div>
            {errors.puntaje && (
              <p className="text-sm text-red-500">{errors.puntaje.message}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--fg)]">
              Comentario (opcional)
            </label>
            <textarea
              {...register('comentario')}
              placeholder="Comparte tu experiencia con otros usuarios..."
              className="w-full min-h-[120px] p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] resize-y"
            />
            {errors.comentario && (
              <p className="text-sm text-red-500">{errors.comentario.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--gold)] text-black hover:bg-[var(--gold-dark)] font-semibold px-8"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Publicando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Publicar reseña</span>
                </div>
              )}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  reset();
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}
          </div>
      </form>
    </div>
  );
}