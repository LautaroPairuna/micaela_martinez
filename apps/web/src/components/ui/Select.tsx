'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Select({ value = '', onValueChange, disabled = false, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  const contextValue: SelectContextType = {
    value,
    onValueChange: onValueChange || (() => {}),
    open,
    setOpen,
    disabled,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectTrigger({ className = '', children }: SelectTriggerProps) {
  const { open, setOpen, disabled } = useSelectContext();

  return (
    <button
      type="button"
      className={[
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300',
        'bg-white px-3 py-2 text-sm',
        'placeholder:text-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ].join(' ')}
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext();

  return (
    <span className={value ? 'text-gray-900' : 'text-gray-500'}>
      {value || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
}

export function SelectContent({ children }: SelectContentProps) {
  const { open, setOpen } = useSelectContext();

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-select-content]') && !target.closest('button')) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      data-select-content
      className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export function SelectItem({ value, children }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext();
  const isSelected = selectedValue === value;

  const handleClick = () => {
    onValueChange(value);
    setOpen(false);
  };

  return (
    <div
      className={[
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900',
      ].join(' ')}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}