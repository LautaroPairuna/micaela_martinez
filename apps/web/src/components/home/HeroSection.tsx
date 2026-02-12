// apps/web/src/components/home/HeroSection.tsx

import HeroCarousel from './HeroCarousel';
import type { SliderItem } from '@/lib/hero-types';

export default function HeroSection({ logo, items }: { logo?: React.ReactNode; items?: SliderItem[] }) {
  return (
    <section className="relative w-full bg-[#111] overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-[520px] w-[520px] rounded-full bg-[#ff4fb2]/14 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[420px] w-[420px] rounded-full bg-[#ffd278]/10 blur-[150px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/25" />
      </div>

      <div className="relative">
        <HeroCarousel
          items={items}
          autoPlay
          autoPlayInterval={6000}
          withBackground={false}
          contentMaxWidthClassName="max-w-[1600px]"
          imageAspectClassName="aspect-[1/1] sm:aspect-[4/3] xl:aspect-[1/1] 2xl:aspect-[16/9]"
          imageMaxWidthClassName="max-w-[min(720px,100%)] md:max-w-[min(900px,100%)] xl:max-w-[min(1040px,100%)]"
          logoMode="per-slide"
          logoSlot={logo}
        />
      </div>
    </section>
  );
}
