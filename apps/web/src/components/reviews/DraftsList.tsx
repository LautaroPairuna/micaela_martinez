'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Trash2, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/contexts/ToastContext';

interface ReviewDraft {
  key: string;
  puntaje: number;
  comentario: string;
  lastSaved: number;
  itemType: 'curso' | 'producto';
  itemId: string;
  itemTitle?: string;
}

interface DraftsListProps {
  onLoadDraft?: (draft: ReviewDraft) => void;
  className?: string;
}

export function DraftsList({ onLoadDraft, className = '' }: DraftsListProps) {
  const { me } = useSession();
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { warning: showWarning, success: showSuccess, error: showError } = useToast();

  // Cargar todos los borradores del usuario
  const loadDrafts = () => {
    if (!me?.id || typeof window === 'undefined') {
      setDrafts([]);
      setIsLoading(false);
      return;
    }

    try {
      const allDrafts: ReviewDraft[] = [];
      const prefix = `review_draft_${me.id}_`;

      // Iterar sobre todas las claves de localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const draftData = localStorage.getItem(key);
            if (draftData) {
              const parsed = JSON.parse(draftData);
              
              // Verificar que el borrador no sea muy antiguo (7 días)
              const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
              if (parsed.lastSaved > sevenDaysAgo) {
                // Extraer información del key
                const keyParts = key.replace(prefix, '').split('_');
                const itemType = keyParts[0] as 'curso' | 'producto';
                const itemId = keyParts[1];

                allDrafts.push({
                  key,
                  puntaje: parsed.puntaje,
                  comentario: parsed.comentario,
                  lastSaved: parsed.lastSaved,
                  itemType,
                  itemId,
                });
              } else {
                // Limpiar borradores antiguos
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            console.error('Error parsing draft:', error);
            // Limpiar borrador corrupto
            if (key) localStorage.removeItem(key);
          }
        }
      }

      // Ordenar por fecha de guardado (más reciente primero)
      allDrafts.sort((a, b) => b.lastSaved - a.lastSaved);
      setDrafts(allDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar borrador
  const deleteDraft = (draftKey: string) => {
    showWarning(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este borrador? Esta acción no se puede deshacer.',
      10000
    );
    
    // Por ahora mantenemos la funcionalidad básica
    // TODO: Implementar modal de confirmación personalizado
    setTimeout(() => {
      if (window.confirm('¿Estás seguro de que quieres eliminar este borrador?')) {
        try {
          localStorage.removeItem(draftKey);
          setDrafts(prev => prev.filter(draft => draft.key !== draftKey));
          showSuccess('Borrador eliminado', 'El borrador se ha eliminado correctamente');
        } catch (error) {
          console.error('Error deleting draft:', error);
          showError('Error', 'Ocurrió un error al eliminar el borrador');
        }
      }
    }, 100);
  };

  // Cargar borradores al montar el componente
  useEffect(() => {
    loadDrafts();
  }, [me?.id]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardBody className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--gold)] border-t-transparent mx-auto mb-2" />
          <p className="text-[var(--muted)]">Cargando borradores...</p>
        </CardBody>
      </Card>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className={className}>
        <CardBody className="text-center py-8">
          <FileText className="h-12 w-12 text-[var(--muted)] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[var(--fg)] mb-2">
            No hay borradores guardados
          </h3>
          <p className="text-[var(--muted)]">
            Los borradores de tus reseñas aparecerán aquí automáticamente.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardBody>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="text-lg font-semibold text-[var(--fg)]">
            Borradores guardados ({drafts.length})
          </h3>
        </div>

        <div className="space-y-3">
          {drafts.map((draft) => {
            const hasContent = draft.comentario.trim().length > 0;
            const previewText = hasContent 
              ? draft.comentario.slice(0, 100) + (draft.comentario.length > 100 ? '...' : '')
              : 'Sin comentario';

            return (
              <div
                key={draft.key}
                className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Tipo y rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 bg-[var(--bg-secondary)] text-[var(--muted)] rounded">
                        {draft.itemType === 'curso' ? 'Curso' : 'Producto'}
                      </span>
                      {draft.puntaje > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-[var(--gold)] fill-current" />
                          <span className="text-xs text-[var(--muted)]">{draft.puntaje}/5</span>
                        </div>
                      )}
                    </div>

                    {/* Preview del comentario */}
                    <p className="text-sm text-[var(--fg)] mb-2 line-clamp-2">
                      {previewText}
                    </p>

                    {/* Fecha de guardado */}
                    <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Clock className="h-3 w-3" />
                      <span>
                        Guardado {formatDistanceToNow(new Date(draft.lastSaved), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {onLoadDraft && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLoadDraft(draft)}
                        className="text-xs"
                      >
                        Cargar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteDraft(draft.key)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón para limpiar todos los borradores */}
        {drafts.length > 1 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                showWarning(
                  'Confirmar eliminación masiva',
                  `¿Estás seguro de que quieres eliminar todos los ${drafts.length} borradores? Esta acción no se puede deshacer.`,
                  10000
                );
                
                // Por ahora mantenemos la funcionalidad básica
                // TODO: Implementar modal de confirmación personalizado
                setTimeout(() => {
                  if (window.confirm(`¿Estás seguro de que quieres eliminar todos los ${drafts.length} borradores?`)) {
                    try {
                      drafts.forEach(draft => {
                        localStorage.removeItem(draft.key);
                      });
                      setDrafts([]);
                      showSuccess('Borradores eliminados', `Se han eliminado todos los ${drafts.length} borradores`);
                    } catch (error) {
                      console.error('Error clearing all drafts:', error);
                      showError('Error', 'Ocurrió un error al eliminar los borradores');
                    }
                  }
                }, 100);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Eliminar todos los borradores
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}