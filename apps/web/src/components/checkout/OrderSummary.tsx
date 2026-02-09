'use client';

import { useCart, cartSelectors } from '@/store/cart';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { Trash2 } from 'lucide-react';
import { useCheckout } from '@/store/checkout';

export function OrderSummary() {
  const { items } = useCart();
  const subtotal = cartSelectors.subtotal(items);
  
  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 group items-start">
             <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
               <SafeImage src={item.image} alt={item.title} className="object-cover w-full h-full" />
               <span className="absolute bottom-0 right-0 bg-[#1a1a1a]/80 text-[10px] text-white px-1.5 py-0.5 rounded-tl-md border-t border-l border-[#2a2a2a]">
                 x{item.quantity}
               </span>
             </div>
             <div className="flex flex-1 flex-col justify-between min-h-[4rem]">
               <span className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight mb-1">{item.title}</span>
               <div className="flex items-center justify-between mt-auto">
                 <span className="text-sm font-semibold text-[var(--gold)]">
                    <Price value={item.price * item.quantity} />
                 </span>
               </div>
             </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-[#2a2a2a] pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Subtotal</span>
          <span className="font-medium text-slate-200"><Price value={subtotal} /></span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Envío</span>
          <span className="text-green-400 text-xs font-medium uppercase tracking-wide bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">Gratis</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-3 border-t border-[#2a2a2a]">
          <span className="text-slate-100">Total</span>
          <span className="text-[var(--gold)]"><Price value={subtotal} /></span>
        </div>
      </div>
    </div>
  );
}
