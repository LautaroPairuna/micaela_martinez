'use client';

import * as React from 'react';

interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

export function Alert({ variant = 'default', className = '', children }: AlertProps) {
  const variantStyles = {
    default: 'border-blue-200 bg-blue-50 text-blue-800',
    destructive: 'border-red-200 bg-red-50 text-red-800',
  };

  return (
    <div
      className={[
        'relative w-full rounded-lg border p-4',
        'flex items-start space-x-2',
        variantStyles[variant],
        className,
      ].join(' ')}
      role="alert"
    >
      {children}
    </div>
  );
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDescription({ className = '', children }: AlertDescriptionProps) {
  return (
    <div className={['text-sm leading-relaxed', className].join(' ')}>
      {children}
    </div>
  );
}