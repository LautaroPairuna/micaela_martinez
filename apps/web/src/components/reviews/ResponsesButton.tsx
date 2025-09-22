'use client';

import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useResponsesCount } from '@/hooks/useResponsesCount';

interface ResponsesButtonProps {
  resenaId: string;
  isExpanded: boolean;
  onClick: () => void;
  className?: string;
}

export function ResponsesButton({ 
  resenaId, 
  isExpanded, 
  onClick, 
  className = '' 
}: ResponsesButtonProps) {
  const { count, isLoading } = useResponsesCount(resenaId);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`text-sm p-2 h-8 flex items-center gap-2 hover:bg-[var(--bg-secondary)] ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      <span>Respuestas</span>
      <span className="text-xs text-[var(--muted)] ml-1">
        ({isLoading ? '...' : count})
      </span>
      {isExpanded ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </Button>
  );
}