import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, className = '', side = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (side) {
        case 'top':
          top = rect.top;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right;
          break;
      }

      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  // Clases base para el contenido flotante
  // Usamos 'fixed' para posicionar relativo al viewport (coincide con getBoundingClientRect)
  const baseClasses = "fixed z-[9999] px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-md shadow-lg border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-200 w-64";
  
  const sideClasses = {
    top: '-translate-x-1/2 -translate-y-full -mt-2',
    bottom: '-translate-x-1/2 mt-2',
    left: '-translate-y-1/2 -translate-x-full -ml-2',
    right: '-translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-700 border-y-transparent border-l-transparent',
  };

  return (
    <>
      <div 
        ref={triggerRef}
        className={`inline-flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children || <Info className="h-4 w-4 text-slate-400 hover:text-slate-200 cursor-help transition-colors" />}
      </div>
      
      {mounted && isVisible && createPortal(
        <div 
          className={`${baseClasses} ${sideClasses[side]}`}
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div className={`absolute border-4 ${arrowClasses[side]}`} />
        </div>,
        document.body
      )}
    </>
  );
}
