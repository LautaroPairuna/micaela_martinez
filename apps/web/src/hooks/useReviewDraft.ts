'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';

interface ReviewDraftData {
  puntaje: number;
  comentario: string;
  lastSaved: number;
}

interface UseReviewDraftOptions {
  cursoId?: string;
  productoId?: string;
  autoSaveInterval?: number; // en milisegundos
  enabled?: boolean;
}

interface UseReviewDraftReturn {
  draft: ReviewDraftData | null;
  saveDraft: (data: Partial<ReviewDraftData>) => void;
  clearDraft: () => void;
  hasDraft: boolean;
  lastSaved: Date | null;
  isAutoSaving: boolean;
}

const DEFAULT_AUTO_SAVE_INTERVAL = 3000; // 3 segundos

export function useReviewDraft({
  cursoId,
  productoId,
  autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
  enabled = true,
}: UseReviewDraftOptions): UseReviewDraftReturn {
  const { me } = useSession();
  const [draft, setDraft] = useState<ReviewDraftData | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [pendingData, setPendingData] = useState<Partial<ReviewDraftData> | null>(null);

  // Generar clave única para el borrador
  const getDraftKey = useCallback(() => {
    if (!me?.id) return null;
    const itemId = cursoId || productoId;
    const itemType = cursoId ? 'curso' : 'producto';
    return `review_draft_${me.id}_${itemType}_${itemId}`;
  }, [me?.id, cursoId, productoId]);

  // Cargar borrador desde localStorage
  const loadDraft = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    
    const draftKey = getDraftKey();
    if (!draftKey) return;

    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft) as ReviewDraftData;
        // Verificar que el borrador no sea muy antiguo (7 días)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (parsedDraft.lastSaved > sevenDaysAgo) {
          setDraft(parsedDraft);
        } else {
          // Limpiar borrador antiguo
          localStorage.removeItem(draftKey);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [enabled, getDraftKey]);

  // Guardar borrador en localStorage
  const saveDraftToStorage = useCallback((draftData: ReviewDraftData) => {
    if (!enabled || typeof window === 'undefined') return;
    
    const draftKey = getDraftKey();
    if (!draftKey) return;

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [enabled, getDraftKey]);

  // Función para guardar borrador
  const saveDraft = useCallback((data: Partial<ReviewDraftData>) => {
    if (!enabled || !me?.id) return;

    // Solo guardar si hay contenido significativo
    const hasContent = (data.comentario && data.comentario.trim().length > 0) || 
                      (data.puntaje && data.puntaje > 0);
    
    if (!hasContent) return;

    const newDraft: ReviewDraftData = {
      puntaje: data.puntaje || draft?.puntaje || 0,
      comentario: data.comentario || draft?.comentario || '',
      lastSaved: Date.now(),
    };

    setDraft(newDraft);
    setPendingData(data);
  }, [enabled, me?.id, draft]);

  // Limpiar borrador
  const clearDraft = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    
    const draftKey = getDraftKey();
    if (!draftKey) return;

    try {
      localStorage.removeItem(draftKey);
      setDraft(null);
      setPendingData(null);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [enabled, getDraftKey]);

  // Auto-guardado con debounce
  useEffect(() => {
    if (!enabled || !pendingData) return;

    const timeoutId = setTimeout(async () => {
      setIsAutoSaving(true);
      
      try {
        const newDraft: ReviewDraftData = {
          puntaje: pendingData.puntaje || draft?.puntaje || 0,
          comentario: pendingData.comentario || draft?.comentario || '',
          lastSaved: Date.now(),
        };

        saveDraftToStorage(newDraft);
        setDraft(newDraft);
        setPendingData(null);
        
        // Mostrar indicador sutil de guardado
        toast.success('Borrador guardado', {
          duration: 1500,
          position: 'bottom-right',
        });
      } catch (error) {
        console.error('Error auto-saving draft:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timeoutId);
  }, [enabled, pendingData, draft, autoSaveInterval, saveDraftToStorage]);

  // Cargar borrador al montar el componente
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Limpiar al cambiar de usuario
  useEffect(() => {
    if (!me?.id) {
      setDraft(null);
      setPendingData(null);
    }
  }, [me?.id]);

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft: !!draft && (draft.puntaje > 0 || draft.comentario.trim().length > 0),
    lastSaved: draft ? new Date(draft.lastSaved) : null,
    isAutoSaving,
  };
}