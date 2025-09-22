'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  const portalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="relative z-[1001]">
        {children}
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(portalContent, document.body);
}

export function DialogContent({ className, children }: DialogContentProps) {
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4',
      className
    )}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold', className)}>
      {children}
    </h2>
  );
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div className={cn('flex justify-end gap-2 mt-6', className)}>
      {children}
    </div>
  );
}