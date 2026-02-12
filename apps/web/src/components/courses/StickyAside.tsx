'use client';

import * as React from 'react';

type Props = {
  top?: number; // px
  className?: string;
  boundaryRef: React.RefObject<HTMLElement | null>; // ✅ acepta null
  children: React.ReactNode;
};

export function StickyAside({ top = 96, className, boundaryRef, children }: Props) {
  const placeholderRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const [fixed, setFixed] = React.useState(false);
  const [rect, setRect] = React.useState<{ left: number; width: number; height: number } | null>(
    null
  );
  const [topPx, setTopPx] = React.useState(top);

  const measure = React.useCallback(() => {
    const ph = placeholderRef.current;
    const ct = contentRef.current;
    if (!ph || !ct) return;

    const r = ph.getBoundingClientRect();
    const h = ct.getBoundingClientRect().height;

    setRect({ left: r.left, width: r.width, height: h });
  }, []);

  React.useEffect(() => {
    measure();

    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    const onScroll = () => {
      const ph = placeholderRef.current;
      const bd = boundaryRef.current;
      const ct = contentRef.current;
      if (!ph || !bd || !ct) return;

      const phRect = ph.getBoundingClientRect();
      const shouldFix = phRect.top <= top;
      setFixed(shouldFix);

      if (!shouldFix) {
        setTopPx(top);
        return;
      }

      const bdRect = bd.getBoundingClientRect();
      const contentHeight = ct.getBoundingClientRect().height;

      const maxTop = bdRect.bottom - contentHeight;
      const clampedTop = Math.min(top, maxTop);

      measure();
      setTopPx(clampedTop);
    };

    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [boundaryRef, measure, top]);

  return (
    <aside className={className}>
      <div ref={placeholderRef} style={{ height: rect?.height ?? 'auto' }}>
        <div
          ref={contentRef}
          style={
            fixed && rect
              ? {
                  position: 'fixed',
                  top: topPx,
                  left: rect.left,
                  width: rect.width,
                  zIndex: 60,
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </aside>
  );
}
