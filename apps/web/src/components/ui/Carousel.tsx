// apps/web/src/components/ui/Carousel.tsx

'use client';

import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';

type CarouselApi = UseEmblaCarouselType[1];

type CarouselContextValue = {
  emblaRef: UseEmblaCarouselType[0];
  emblaApi: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selectedIndex: number;
  scrollSnaps: number[];
  scrollTo: (index: number) => void;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) throw new Error('useCarousel must be used within <Carousel />');
  return ctx;
}

export type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  opts?: Parameters<typeof useEmblaCarousel>[0];
  plugins?: Parameters<typeof useEmblaCarousel>[1];
};

export function Carousel({ opts, plugins, className, children, ...props }: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(opts, plugins);

  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  React.useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect(emblaApi);

    const handleSelect = () => onSelect(emblaApi);
    const handleReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect(emblaApi);
    };

    emblaApi.on('select', handleSelect);
    emblaApi.on('reInit', handleReInit);

    return () => {
      emblaApi.off('select', handleSelect);
      emblaApi.off('reInit', handleReInit);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = React.useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <CarouselContext.Provider
      value={{
        emblaRef,
        emblaApi,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        selectedIndex,
        scrollSnaps,
        scrollTo,
      }}
    >
      <div className={className} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { emblaRef } = useCarousel();
  return (
    <div ref={emblaRef} className="w-full overflow-x-hidden overflow-y-hidden">
      <div className={['flex w-full touch-pan-y min-w-0', className].filter(Boolean).join(' ')} {...props} />
    </div>
  );
}

export function CarouselItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['min-w-0 flex-[0_0_100%] select-none', className].filter(Boolean).join(' ')} {...props} />
  );
}

type ArrowProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  disabled?: boolean;
};

function ArrowButton({ className, disabled, ...props }: ArrowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/30 backdrop-blur',
        'h-11 w-11 shadow-lg transition',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/45',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

export function CarouselPrevious({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { scrollPrev, canScrollPrev } = useCarousel();
  return (
    <ArrowButton
      aria-label="Previous slide"
      onClick={scrollPrev}
      disabled={!canScrollPrev}
      className={className}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white/90 stroke-[2]">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </ArrowButton>
  );
}

export function CarouselNext({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { scrollNext, canScrollNext } = useCarousel();
  return (
    <ArrowButton
      aria-label="Next slide"
      onClick={scrollNext}
      disabled={!canScrollNext}
      className={className}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white/90 stroke-[2]">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </ArrowButton>
  );
}

export function CarouselDots({ className }: { className?: string }) {
  const { scrollSnaps, selectedIndex, scrollTo } = useCarousel();
  if (!scrollSnaps.length) return null;

  return (
    <div className={['flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {scrollSnaps.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => scrollTo(i)}
          className={[
            'h-2.5 rounded-full transition-all',
            i === selectedIndex ? 'w-8 bg-white/80' : 'w-2.5 bg-white/30 hover:bg-white/45',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
