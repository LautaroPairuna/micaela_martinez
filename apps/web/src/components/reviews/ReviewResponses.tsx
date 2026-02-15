'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageCircle,
  Reply,
  Edit3,
  Trash2,
  Send,
  X,
  MoreVertical,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useReviewResponses } from '@/hooks/useReviewResponses';

/* ===================== Tipos ===================== */
interface UserLite {
  id: string | number;
  nombre?: string | null;
}

export interface ReviewResponse {
  id: string;
  contenido: string;
  creadoEn: string; // ISO
  editado?: boolean;
  eliminado?: boolean;
  usuario: UserLite;
  respuestaAPadre?: {
    usuario: UserLite;
    contenido: string;
  } | null;
  respuestasHijas?: ReviewResponse[];
}

interface ReviewResponsesProps {
  resenaId: string;
}

interface ResponseItemProps {
  response: ReviewResponse;
  level: number;
  onReply: (responseId: string) => void;
  onEdit: (responseId: string, contenido: string) => void;
  onDelete: (responseId: string) => void;
  currentUserId?: string | number;
  isSubmitting: boolean;
  isAdmin?: boolean;
}

/* ===================== Utils ===================== */
function getInitials(nombre?: string | null, max = 2) {
  if (!nombre) return 'U';

  return nombre
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, max)
    .map(word => word[0]!)
    .join('')
    .toUpperCase();
}

/* ===================== Item ===================== */
function ResponseItem({
  response,
  level,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  isSubmitting,
  isAdmin = false,
}: ResponseItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(response.contenido);

  // Comparación robusta para distintos tipos de ID
  const isOwnResponse =
    (currentUserId != null &&
      response.usuario?.id != null &&
      String(currentUserId) === String(response.usuario.id)) ||
    isAdmin;

  const shouldShowActions = !!isOwnResponse && !response.eliminado;
  const maxLevel = 3; // Máximo nivel de anidación
  const canReply = level < maxLevel && !response.eliminado;

  const handleEdit = () => {
    onEdit(response.id, editContent);
    setIsEditing(false);
    setShowActions(false);
  };

  const handleDelete = () => {
    onDelete(response.id);
    setShowActions(false);
  };

  const formatDate = (dateString: string) =>
    formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es,
    });

  return (
    <div
      id={`response-${response.id}`}
      data-response-id={response.id}
      className={`scroll-mt-4 ${level > 0 ? 'ml-6 pl-4 border-l border-zinc-800' : ''}`}
    >
      <div className="mb-4">
        <div className="p-4 bg-[#161616] rounded-xl border border-zinc-800/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className={[
                  'flex items-center justify-center w-8 h-8 rounded-full text-white text-xs',
                  'bg-zinc-800 text-pink-500 ring-1 ring-zinc-700 font-serif font-bold',
                ].join(' ')}
                title={response.usuario.nombre || 'Usuario anónimo'}
              >
                {getInitials(response.usuario.nombre)}
              </span>
              <div>
                <h5 className="font-medium text-zinc-200 text-sm">
                  {response.usuario.nombre || 'Usuario anónimo'}
                </h5>
                <p className="text-xs text-zinc-500">
                  {formatDate(response.creadoEn)}
                  {response.editado && <span className="ml-1">(editado)</span>}
                </p>
              </div>
            </div>

            {shouldShowActions && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                  className="h-8 w-8 p-0 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full"
                  title="Opciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {showActions && (
                  <div className="absolute right-0 top-full mt-1 bg-[#161616] border border-zinc-800 rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                    >
                      <Edit3 className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-1 text-left text-xs hover:bg-red-900/20 text-red-500 flex items-center gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Respuesta padre si existe */}
          {response.respuestaAPadre && (
            <div className="mb-3 p-3 bg-zinc-900/50 rounded-lg border-l-2 border-pink-500">
              <p className="text-xs text-zinc-400 mb-1">
                Respondiendo a {response.respuestaAPadre.usuario.nombre ?? 'usuario'}
              </p>
              <p className="text-sm text-zinc-300 opacity-75 line-clamp-2 italic">
                {response.respuestaAPadre.contenido}
              </p>
            </div>
          )}

          {/* Contenido de la respuesta */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edita tu respuesta..."
                className="w-full min-h-[100px] p-3 rounded-lg bg-[#0a0a0a] border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-y text-sm"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={isSubmitting || !editContent.trim()}
                  className="text-xs bg-pink-500 hover:bg-pink-600 text-white"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(response.contenido);
                  }}
                  className="text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-zinc-300 mb-3 leading-relaxed">
                <p className="whitespace-pre-line">{response.contenido}</p>
              </div>

              {/* Acción responder */}
              <div className="flex items-center justify-start">
                {canReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(response.id)}
                    className="text-xs p-1 h-6 text-pink-500 hover:text-pink-400 hover:bg-transparent pl-0"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Responder
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Respuestas hijas */}
      {response.respuestasHijas && response.respuestasHijas.length > 0 && (
        <div className="space-y-2 mt-3">
          {response.respuestasHijas.map((childResponse: ReviewResponse) => (
            <ResponseItem
              key={childResponse.id}
              response={childResponse}
              level={level + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
              isSubmitting={isSubmitting}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Lista ===================== */
export function ReviewResponses({ resenaId }: ReviewResponsesProps) {
  const { me: session } = useSession();

  const {
    responses,
    responsesCount,
    isLoading,
    isSubmitting,
    error,
    addResponse,
    updateResponse,
    deleteResponse,
  } = useReviewResponses(resenaId);

  const [showResponseForm, setShowResponseForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState('');

  const handleSubmitResponse = async () => {
    if (!responseContent.trim()) return;

    await addResponse(responseContent, replyingTo || undefined);
    setResponseContent('');
    setShowResponseForm(false);
    setReplyingTo(null);
  };

  const handleReply = (responseId: string) => {
    setReplyingTo(responseId);
    setShowResponseForm(true);
  };

  const handleEdit = async (responseId: string, contenido: string) => {
    await updateResponse(responseId, contenido);
  };

  const handleDelete = async (responseId: string) => {
    // TODO: reemplazar por modal de confirmación real
    if (confirm('¿Estás seguro de que quieres eliminar esta respuesta?')) {
      await deleteResponse(responseId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[var(--muted)]" />
          <span className="text-sm text-[var(--muted)]">Cargando respuestas...</span>
        </div>
      </div>
    );
  }

  const typedResponses: ReviewResponse[] = (responses ?? []) as ReviewResponse[];

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">
            {responsesCount} {responsesCount === 1 ? 'respuesta' : 'respuestas'}
          </span>
        </div>

        {session && !showResponseForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResponseForm(true)}
            className="text-sm border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <Reply className="h-4 w-4 mr-2" />
            Responder
          </Button>
        )}
      </div>

      {/* Formulario de respuesta */}
      {showResponseForm && session && (
        <div className="bg-[#161616] p-4 rounded-xl space-y-3 border border-zinc-800/50 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-zinc-200">Nueva respuesta</h4>
            <button onClick={() => setShowResponseForm(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="size-4" />
            </button>
          </div>
          {replyingTo && (
            <div className="text-sm text-pink-500 mb-2">Respondiendo a un comentario...</div>
          )}
          <textarea
            value={responseContent}
            onChange={(e) => setResponseContent(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="w-full min-h-[100px] p-3 rounded-lg bg-[#0a0a0a] border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-y text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button 
              onClick={handleSubmitResponse} 
              disabled={isSubmitting || !responseContent.trim()} 
              size="sm"
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar respuesta
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Lista de respuestas */}
      {typedResponses.length > 0 ? (
        <div className="space-y-4">
          {typedResponses.map((response) => (
            <ResponseItem
              key={response.id}
              response={response}
              level={0}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentUserId={session?.id}
              isSubmitting={isSubmitting}
              isAdmin={session?.rol === 'ADMIN'}
            />
          ))}
        </div>
      ) : (
        !showResponseForm && (
          <div className="text-center py-8 text-[var(--muted)]">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay respuestas aún</p>
            <p className="text-sm">¡Sé el primero en responder!</p>
          </div>
        )
      )}
    </div>
  );
}
