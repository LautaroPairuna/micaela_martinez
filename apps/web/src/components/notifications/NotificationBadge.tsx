'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useUnreadCount } from '@/hooks/useNotifications';
import { NotificationsList } from './NotificationsList';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className }: NotificationBadgeProps) {
  const { unreadCount, loading } = useUnreadCount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative" ref={badgeRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDropdown}
        className={cn(
          'relative p-2 rounded-full transition-colors',
          'hover:bg-[var(--subtle)] focus:bg-[var(--subtle)]',
          isOpen && 'bg-[var(--subtle)]',
          className
        )}
      >
        <Bell className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />
        {unreadCount > 0 && (
          <Pill 
            tone="gold" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-medium min-w-[20px] shadow-md"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Pill>
        )}
        {loading && !unreadCount && (
          <div className="absolute top-0 right-0 h-2 w-2 bg-[var(--gold)] rounded-full animate-pulse" />
        )}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-96 max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 animate-in fade-in-0 zoom-in-95"
        >
          <NotificationsList />
        </div>
      )}
    </div>
  );
}