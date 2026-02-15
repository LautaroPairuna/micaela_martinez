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
      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-zinc-200">Tu reseña</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
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
              className="flex items-center gap-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
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
                  star <= existingReview.puntaje ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'
                }`}
              />
            ))}
          </div>
          <span className="font-medium text-zinc-200">{existingReview.puntaje}/5</span>
        </div>

        {existingReview.comentario && (
          <div className="prose prose-sm max-w-none text-zinc-300">
            <p className="whitespace-pre-line">{existingReview.comentario}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="mb-8 border border-zinc-800 bg-[#111] overflow-hidden rounded-2xl">
      <CardBody className="p-6">
        <h3 className="text-xl font-serif text-white mb-6">
          {isEditing ? 'Editar tu reseña' : 'Comparte tu experiencia'}
        </h3>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Selector de Estrellas */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">
              Calificación general
            </label>
            <div className="flex items-center gap-1" onMouseLeave={() => setHoveredRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValue('puntaje', star, { shouldValidate: true })}
                  onMouseEnter={() => setHoveredRating(star)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || watchedRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-zinc-700'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm font-medium text-zinc-400">
                {(hoveredRating || watchedRating) > 0 
                  ? ['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][(hoveredRating || watchedRating) - 1]
                  : 'Selecciona una calificación'}
              </span>
            </div>
            {errors.puntaje && (
              <p className="text-sm text-red-500">{errors.puntaje.message}</p>
            )}
          </div>

          {/* Comentario */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">
              Tu opinión (opcional)
            </label>
            <textarea
              {...register('comentario')}
              rows={4}
              placeholder="¿Qué te pareció el curso? ¿Qué aprendiste? ¿Lo recomendarías?"
              className="w-full p-4 rounded-xl bg-[#0a0a0a] border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none"
            />
          </div>

          {/* Draft Notice */}
          {showDraftNotice && !isEditing && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              <Save className="h-3 w-3" />
              <span>
                Tienes un borrador guardado de {draft?.lastSaved ? formatDistanceToNow(new Date(draft.lastSaved), { locale: es, addSuffix: true }) : 'hace un momento'}
              </span>
              <button
                type="button"
                onClick={clearDraft}
                className="ml-auto underline hover:text-yellow-400"
              >
                Descartar
              </button>
            </div>
          )}

          {/* Auto-save indicator */}
          {!isEditing && isAutoSaving && (
            <div className="flex items-center gap-1 text-xs text-zinc-500 justify-end">
              <Clock className="h-3 w-3" />
              Guardando borrador...
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading || isSubmitting}
                className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="bg-pink-500 hover:bg-pink-600 text-white min-w-[140px]"
            >
              {isLoading || isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Enviando...
                </span>
              ) : (
                <>
                  {isEditing ? <Edit3 className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {isEditing ? 'Actualizar reseña' : 'Publicar reseña'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}