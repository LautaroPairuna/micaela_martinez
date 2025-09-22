'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { 
  Eye, 
  EyeOff, 
  Bold, 
  Italic, 
  List, 
  Link, 
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  showPreview?: boolean;
  disabled?: boolean;
}

const MARKDOWN_SHORTCUTS = [
  { icon: Bold, label: 'Negrita', syntax: '**texto**', shortcut: 'Ctrl+B' },
  { icon: Italic, label: 'Cursiva', syntax: '*texto*', shortcut: 'Ctrl+I' },
  { icon: Heading1, label: 'Título 1', syntax: '# Título', shortcut: 'Ctrl+1' },
  { icon: Heading2, label: 'Título 2', syntax: '## Título', shortcut: 'Ctrl+2' },
  { icon: Heading3, label: 'Título 3', syntax: '### Título', shortcut: 'Ctrl+3' },
  { icon: List, label: 'Lista', syntax: '- Item\n- Item', shortcut: 'Ctrl+L' },
  { icon: Link, label: 'Enlace', syntax: '[texto](url)', shortcut: 'Ctrl+K' },
  { icon: Code, label: 'Código', syntax: '`código`', shortcut: 'Ctrl+`' },
  { icon: Quote, label: 'Cita', syntax: '> Cita', shortcut: 'Ctrl+Q' },
];

const MARKDOWN_GUIDE = `
## Guía de Markdown

### Formato de texto
- **Negrita**: \`**texto**\` o \`__texto__\`
- *Cursiva*: \`*texto*\` o \`_texto_\`
- ~~Tachado~~: \`~~texto~~\`
- \`Código\`: \`\`código\`\`

### Títulos
\`\`\`
# Título 1
## Título 2
### Título 3
\`\`\`

### Listas
**Lista con viñetas:**
\`\`\`
- Item 1
- Item 2
  - Sub-item
\`\`\`

**Lista numerada:**
\`\`\`
1. Primer item
2. Segundo item
\`\`\`

### Enlaces e imágenes
- Enlace: \`[texto](https://ejemplo.com)\`
- Imagen: \`![alt text](url-imagen)\`

### Otros
- Cita: \`> Texto de la cita\`
- Línea horizontal: \`---\`
- Código de bloque:
\`\`\`
\`\`\`javascript
console.log('Hola mundo');
\`\`\`
\`\`\`
`;

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escribe tu reseña usando Markdown...',
  minHeight = '200px',
  maxHeight = '400px',
  showPreview: initialShowPreview = false,
  disabled = false,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(initialShowPreview);
  const [showGuide, setShowGuide] = useState(false);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const insertMarkdown = (syntax: string) => {
    if (!textareaRef || disabled) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText = '';
    let newCursorPos = start;

    // Manejar diferentes tipos de sintaxis
    if (syntax.includes('texto')) {
      if (selectedText) {
        newText = syntax.replace('texto', selectedText);
      } else {
        newText = syntax;
        // Posicionar cursor entre los marcadores
        const textIndex = syntax.indexOf('texto');
        newCursorPos = start + textIndex;
      }
    } else {
      newText = syntax;
      newCursorPos = start + syntax.length;
    }

    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);

    // Restaurar focus y posición del cursor
    setTimeout(() => {
      textareaRef.focus();
      if (selectedText || !syntax.includes('texto')) {
        textareaRef.setSelectionRange(newCursorPos, newCursorPos);
      } else {
        // Seleccionar la palabra "texto" para reemplazar
        const textStart = start + syntax.indexOf('texto');
        const textEnd = textStart + 5; // longitud de "texto"
        textareaRef.setSelectionRange(textStart, textEnd);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    // Atajos de teclado
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertMarkdown('**texto**');
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('*texto*');
          break;
        case '1':
          e.preventDefault();
          insertMarkdown('# texto');
          break;
        case '2':
          e.preventDefault();
          insertMarkdown('## texto');
          break;
        case '3':
          e.preventDefault();
          insertMarkdown('### texto');
          break;
        case 'l':
          e.preventDefault();
          insertMarkdown('- texto');
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown('[texto](url)');
          break;
        case '`':
          e.preventDefault();
          insertMarkdown('`texto`');
          break;
        case 'q':
          e.preventDefault();
          insertMarkdown('> texto');
          break;
      }
    }

    // Tab para indentación
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef?.selectionStart || 0;
      const end = textareaRef?.selectionEnd || 0;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textareaRef?.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
        <div className="flex items-center gap-1 flex-wrap">
          {MARKDOWN_SHORTCUTS.map((shortcut, index) => {
            const Icon = shortcut.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown(shortcut.syntax)}
                disabled={disabled}
                className="p-2 h-8 w-8"
                title={`${shortcut.label} (${shortcut.shortcut})`}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            className="p-2 h-8 w-8"
            title="Guía de Markdown"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="p-2 h-8 w-8"
            title={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Guía de Markdown */}
      {showGuide && (
        <Card>
          <CardBody className="p-4">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {MARKDOWN_GUIDE}
              </ReactMarkdown>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Editor y Vista Previa */}
      <div className={`grid gap-4 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--fg)]">Editor</label>
          <textarea
            ref={setTextareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={[
              'w-full p-3 border border-[var(--border)] rounded-lg',
              'bg-[var(--bg)] text-[var(--fg)]',
              'resize-none font-mono text-sm leading-relaxed',
              'focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent',
              'placeholder:text-[var(--muted)]',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            style={{
              minHeight,
              maxHeight,
            }}
          />
          
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>{value.length} caracteres</span>
            <span>Usa Markdown para dar formato</span>
          </div>
        </div>

        {/* Vista Previa */}
        {showPreview && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--fg)]">Vista Previa</label>
            <div 
              className={[
                'p-3 border border-[var(--border)] rounded-lg',
                'bg-[var(--bg)] overflow-auto',
                'prose prose-sm max-w-none',
              ].join(' ')}
              style={{
                minHeight,
                maxHeight,
              }}
            >
              {value.trim() ? (
                <div className="text-[var(--fg)]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {value}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-[var(--muted)] italic">La vista previa aparecerá aquí...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}