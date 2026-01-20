'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker
      .getRegistrations()
      .then(async (regs) => {
        await Promise.all(regs.map((r) => r.unregister()));
      })
      .catch(() => {
        return;
      });
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
