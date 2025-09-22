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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MarkdownEditor } from './MarkdownEditor';

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
}: ResponseItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(response.contenido);

  // Comparación robusta para distintos tipos de ID
  const isOwnResponse =
    currentUserId != null &&
    response.usuario?.id != null &&
    String(currentUserId) === String(response.usuario.id);

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
      className={`scroll-mt-4 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--border)]' : ''}`}
    >
      <Card className="mb-3">
        <CardBody className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className={[
                  'flex items-center justify-center w-8 h-8 rounded-full text-white text-sm',
                  'bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]',
                  'shadow-[inset_0_1px_0_rgba(255,255,255,.2)] font-semibold text-[14px] tracking-wide',
                ].join(' ')}
                title={response.usuario.nombre || 'Usuario anónimo'}
              >
                {getInitials(response.usuario.nombre)}
              </span>
              <div>
                <h5 className="font-medium text-[var(--fg)] text-sm">
                  {response.usuario.nombre || 'Usuario anónimo'}
                </h5>
                <p className="text-xs text-[var(--muted)]">
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
                  className="p-1 h-6 w-6"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>

                {showActions && (
                  <div className="absolute right-0 top-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                    >
                      <Edit3 className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-1 text-left text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
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
            <div className="mb-3 p-2 bg-[var(--bg-secondary)] rounded border-l-2 border-[var(--gold)]">
              <p className="text-xs text-[var(--muted)] mb-1">
                Respondiendo a {response.respuestaAPadre.usuario.nombre ?? 'usuario'}
              </p>
              <p className="text-sm text-[var(--fg)] opacity-75 line-clamp-2">
                {response.respuestaAPadre.contenido}
              </p>
            </div>
          )}

          {/* Contenido de la respuesta */}
          {isEditing ? (
            <div className="space-y-2">
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Editar respuesta..."
                minHeight="80px"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={isSubmitting || !editContent.trim()}
                  className="text-xs"
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
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-[var(--fg)] mb-3 prose prose-sm max-w-none prose-headings:text-[var(--fg)] prose-p:text-[var(--fg)] prose-strong:text-[var(--fg)] prose-em:text-[var(--fg)] prose-code:text-[var(--fg)] prose-code:bg-[var(--bg-secondary)] prose-pre:bg-[var(--bg-secondary)] prose-blockquote:text-[var(--muted)] prose-blockquote:border-[var(--border)] prose-a:text-[var(--gold)] hover:prose-a:text-[var(--gold)]/80">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {response.contenido}
                </ReactMarkdown>
              </div>

              {/* Acción responder */}
              <div className="flex items-center justify-start">
                {canReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(response.id)}
                    className="text-xs p-1 h-6"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Responder
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[var(--muted)]" />
          <span className="text-sm font-medium text-[var(--fg)]">
            {responsesCount} {responsesCount === 1 ? 'respuesta' : 'respuestas'}
          </span>
        </div>

        {session && !showResponseForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResponseForm(true)}
            className="text-sm"
          >
            <Reply className="h-4 w-4 mr-2" />
            Responder
          </Button>
        )}
      </div>

      {/* Formulario de respuesta */}
      {showResponseForm && session && (
        <Card>
          <CardBody className="p-4">
            <div className="space-y-3">
              {replyingTo && (
                <div className="text-sm text-[var(--muted)]">Respondiendo a un comentario...</div>
              )}
              <MarkdownEditor
                value={responseContent}
                onChange={setResponseContent}
                placeholder="Escribe tu respuesta..."
                minHeight="80px"
              />
              <div className="flex gap-2">
                <Button onClick={handleSubmitResponse} disabled={isSubmitting || !responseContent.trim()} size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Enviando...' : 'Enviar respuesta'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResponseForm(false);
                    setReplyingTo(null);
                    setResponseContent('');
                  }}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
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
