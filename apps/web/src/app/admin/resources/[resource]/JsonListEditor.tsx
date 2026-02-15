import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface JsonListEditorProps {
  value: string[] | string;
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  help?: string;
}

export function JsonListEditor({
  value,
  onChange,
  placeholder = 'Nuevo elemento...',
  label,
  help,
}: JsonListEditorProps) {
  // Normalizar valor inicial
  const items = useMemo<string[]>(() => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [value]);

  const [newItem, setNewItem] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const handleAdd = useCallback(() => {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem('');
  }, [items, newItem, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = [...items];
      next.splice(index, 1);
      onChange(next);
    },
    [items, onChange]
  );

  const handleEdit = useCallback(
    (index: number, val: string) => {
      const next = [...items];
      next[index] = val;
      onChange(next);
    },
    [items, onChange]
  );

  /* ───────────── Drag & Drop Logic ───────────── */
  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragEnter = (index: number) => {
    dragOverItemIndex.current = index;
  };

  const onDragEnd = () => {
    const dragIndex = draggedIndex;
    const dropIndex = dragOverItemIndex.current;

    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      const updatedItems = [...items];
      const [draggedItem] = updatedItems.splice(dragIndex, 1);
      updatedItems.splice(dropIndex, 0, draggedItem);
      onChange(updatedItems);
    }

    setDraggedIndex(null);
    dragOverItemIndex.current = null;
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary for onDrop/onDragEnd to fire
  };

  return (
    <div className="space-y-2 md:col-span-2">
      {(label || help) && (
        <div className="flex items-center gap-2 mb-1">
          {label && (
            <label className="block text-xs font-medium text-slate-100">
              {label}
            </label>
          )}
          {help && <Tooltip content={help} />}
        </div>
      )}

      <div className="rounded-md border border-[#2a2a2a] bg-[#101010] p-3 space-y-3">
        {/* Lista de items */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnter={() => onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              className={cn(
                "flex items-center gap-2 group transition-colors rounded p-1",
                draggedIndex === idx 
                  ? "bg-emerald-900/20 border border-emerald-500/30 opacity-50" 
                  : "hover:bg-[#1a1a1a]"
              )}
            >
              <div className="cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="w-4 h-4 text-slate-600 hover:text-slate-400" />
              </div>
              
              <input
                type="text"
                value={item}
                onChange={(e) => handleEdit(idx, e.target.value)}
                className="flex-1 bg-transparent border-b border-transparent focus:border-emerald-500 text-sm text-slate-200 py-1 outline-none transition-colors"
              />
              
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {items.length === 0 && (
            <p className="text-xs text-slate-500 italic py-2 text-center">
              La lista está vacía.
            </p>
          )}
        </div>

        {/* Input para nuevo item */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#2a2a2a]">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-[#1a1a1a] rounded px-3 py-1.5 text-sm text-slate-200 border border-[#333] focus:border-emerald-500 outline-none placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Agregar"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
