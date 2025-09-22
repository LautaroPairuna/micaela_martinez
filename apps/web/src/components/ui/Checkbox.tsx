'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className = '' }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          ref={ref}
          className="sr-only"
        />
        <div
          className={[
            'h-4 w-4 rounded border border-gray-300 bg-white',
            'flex items-center justify-center',
            'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-0',
            checked ? 'bg-blue-600 border-blue-600' : 'bg-white',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            className,
          ].join(' ')}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
        >
          {checked && (
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';