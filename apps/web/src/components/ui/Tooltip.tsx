import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, className = '', side = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Posicionamiento según 'side'
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-700 border-y-transparent border-l-transparent',
  };

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || <Info className="h-4 w-4 text-slate-400 hover:text-slate-200 cursor-help transition-colors" />}
      
      {isVisible && (
        <div className={`absolute ${positionClasses[side]} w-64 px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-md shadow-lg border border-slate-700 z-[2000] pointer-events-none animate-in fade-in zoom-in-95 duration-200`}>
          {content}
          <div className={`absolute border-4 ${arrowClasses[side]}`} />
        </div>
      )}
    </div>
  );
}
