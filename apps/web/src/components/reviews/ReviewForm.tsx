'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Star, Send, Edit3, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { MarkdownEditor } from './MarkdownEditor';
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
  const isEditing = !!existingReview;

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
  }, [draft?.lastSaved, isEditing, existingReview]); // Solo depender de lastSaved para evitar bucles

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
  }, [watchedRating, watchedComment, isEditing, saveDraft]);

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

  return (
    <Card className="w-full">
      <CardBody className="space-y-6">
        {/* Notificación de borrador disponible */}
        {showDraftNotice && hasDraft && !isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Save className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Borrador disponible
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Tienes un borrador guardado {lastSaved && formatDistanceToNow(lastSaved, { addSuffix: true, locale: es })}.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLoadDraft}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Cargar borrador
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDiscardDraft}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <Edit3 className="h-5 w-5 text-[var(--gold)]" />
            ) : (
              <Star className="h-5 w-5 text-[var(--gold)]" />
            )}
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Editar reseña' : 'Escribir reseña'}
            </h3>
          </div>
          
          {/* Indicador de autoguardado */}
          {!isEditing && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              {isAutoSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--gold)] border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Guardado {formatDistanceToNow(lastSaved, { addSuffix: true, locale: es })}</span>
                </>
              ) : null}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
            <MarkdownEditor
              value={watch('comentario') || ''}
              onChange={(value) => setValue('comentario', value)}
              placeholder="Comparte tu experiencia con otros usuarios..."
              disabled={isSubmitting || isLoading}
              minHeight="120px"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || isLoading || watchedRating === 0}
                className="bg-[var(--gold)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                {isSubmitting || isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isEditing ? 'Actualizar reseña' : 'Publicar reseña'}
              </Button>

              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting || isLoading}
                  className="px-6 py-2"
                >
                  Cancelar
                </Button>
              )}
            </div>

            {/* Botón de guardado manual para borradores */}
            {!isEditing && (watchedRating > 0 || (watchedComment && watchedComment.trim().length > 0)) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => saveDraft({ puntaje: watchedRating, comentario: watchedComment || '' })}
                disabled={isAutoSaving}
                className="text-[var(--muted)] hover:text-[var(--fg)] flex items-center gap-2"
              >
                <Save className="h-3 w-3" />
                Guardar borrador
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}