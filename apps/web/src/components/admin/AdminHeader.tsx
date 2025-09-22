'use client';

import { Menu, X, User as UserIcon } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

interface AdminHeaderProps {
  title?: string;
  displayName: string;
  avatarUrl: string;
  onSignOut: () => void;
}

export default function AdminHeader({ 
  title = 'Dashboard', 
  displayName, 
  avatarUrl,
  onSignOut 
}: AdminHeaderProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <header className="bg-white border-b px-4 py-3 shadow-sm flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={toggle}
          className="p-2 mr-3 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className="text-gray-600">¡Hola, {displayName}!</span>
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-indigo-600" />
        </div>
      </div>
    </header>
  );
}