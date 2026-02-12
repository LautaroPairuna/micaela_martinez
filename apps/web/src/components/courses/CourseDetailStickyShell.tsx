'use client';

import * as React from 'react';
import { StickyAside } from '@/components/courses/StickyAside';

export function CourseDetailStickyShell({
  childrenLeft,
  childrenRight,
}: {
  childrenLeft: React.ReactNode;
  childrenRight: React.ReactNode;
}) {
  const boundaryRef = React.useRef<HTMLDivElement | null>(null); // ✅ div

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div
          ref={boundaryRef}
          className="grid lg:grid-cols-[2fr_1fr] gap-8 relative lg:items-start"
        >
          <div className="space-y-10">{childrenLeft}</div>

          <StickyAside
            top={96}
            boundaryRef={boundaryRef} // ✅ ahora coincide
            className="hidden lg:block lg:-mt-72 z-20 self-start"
          >
            {childrenRight}
          </StickyAside>
        </div>
      </div>
    </section>
  );
}
