'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  RemoveFormatting
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  showPreview?: boolean; // Legacy prop, ignored in WYSIWYG
  disabled?: boolean;
}

const MenuButton = ({
  onClick,
  isActive = false,
  disabled = false,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: any;
  title: string;
}) => (
  <button
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    disabled={disabled}
    className={cn(
      'p-1.5 rounded-md transition-colors flex items-center justify-center h-8 w-8',
      isActive
        ? 'bg-slate-200 text-slate-900 dark:bg-[#131313] dark:text-slate-100'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#131313]',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
    title={title}
    type="button"
  >
    <Icon className="w-4 h-4" />
  </button>
);

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border-b border-slate-200 dark:border-[#131313] p-1 flex flex-wrap gap-1 bg-slate-50 dark:bg-[#101010] rounded-t-md items-center sticky top-0 z-10">
      <div className="flex items-center gap-1 pr-2 border-r border-slate-300 dark:border-[#131313] mr-1">
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={Undo}
          title="Deshacer"
        />
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={Redo}
          title="Rehacer"
        />
      </div>

      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title="Negrita"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title="Cursiva"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={UnderlineIcon}
        title="Subrayado"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        title="Tachado"
      />

      <div className="w-px h-5 bg-slate-300 dark:bg-[#131313] mx-1" />

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title="Título 1"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title="Título 2"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        title="Título 3"
      />

      <div className="w-px h-5 bg-slate-300 dark:bg-[#131313] mx-1" />

      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        icon={AlignLeft}
        title="Alinear Izquierda"
      />
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        icon={AlignCenter}
        title="Centrar"
      />
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        icon={AlignRight}
        title="Alinear Derecha"
      />

      <div className="w-px h-5 bg-slate-300 dark:bg-[#131313] mx-1" />

      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title="Lista con viñetas"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title="Lista ordenada"
      />
      
      <div className="w-px h-5 bg-slate-300 dark:bg-[#131313] mx-1" />

      <MenuButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        icon={LinkIcon}
        title="Enlace"
      />
      <MenuButton
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
        icon={Unlink}
        title="Quitar enlace"
      />
      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        title="Cita"
      />
      <MenuButton
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        icon={RemoveFormatting}
        title="Limpiar formato"
      />
    </div>
  );
};

export function AdminRichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  minHeight = '300px',
  maxHeight = '600px',
  disabled = false,
}: AdminRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none before:h-0',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer hover:text-primary/80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-slate dark:prose-invert max-w-none focus:outline-none px-4 py-3 min-h-[150px]',
          'prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-img:rounded-md prose-img:shadow-sm',
          disabled && 'cursor-not-allowed'
        ),
        style: `min-height: ${minHeight}; max-height: ${maxHeight}; overflow-y: auto;`
      },
    },
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sincronizar cambios externos solo si no hay foco (evitar conflictos de cursor)
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentContent = editor.getHTML();
      // Solo actualizar si hay una diferencia real y el editor no tiene foco
      if (value !== currentContent) {
        // Caso especial: si value es string vacío, limpiar editor
        if (!value || value === '<p></p>') {
          if (!editor.isEmpty) editor.commands.clearContent();
        } else {
          editor.commands.setContent(value);
        }
      }
    }
  }, [value, editor]);

  return (
    <div className={cn(
      "border border-slate-200 dark:border-[#131313] rounded-md shadow-sm bg-white dark:bg-[#101010] flex flex-col overflow-hidden transition-all ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      disabled && "opacity-60 pointer-events-none bg-slate-50 dark:bg-slate-900"
    )}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 cursor-text w-full" />
    </div>
  );
}
