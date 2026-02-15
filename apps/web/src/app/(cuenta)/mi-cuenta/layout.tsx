// src/app/(cuenta)/mi-cuenta/layout.tsx
import { ReactNode } from 'react';
import { getMe } from '@/lib/sdk/userApi';
import AccountSidebar from '@/components/account/AccountSidebar';

// Forzar renderizado dinámico para páginas que requieren autenticación
export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  
  return (
    // Layout tipo Dashboard: Ocupa toda la pantalla disponible (viewport height)
    <div className="w-full h-screen lg:flex lg:overflow-hidden bg-black">
      {/* Sidebar - Fijo a la izquierda con fondo distinto al negro puro */}
      <aside className="
        hidden lg:block lg:w-80 lg:flex-shrink-0 
        lg:h-full lg:overflow-y-auto lg:border-r lg:border-zinc-800 bg-zinc-950
      ">
        <AccountSidebar me={me} />
      </aside>

      {/* Sidebar Mobile - Se mantiene flotante/drawer controlado por AccountSidebar */}
      <div className="lg:hidden">
        <AccountSidebar me={me} />
      </div>

      {/* Main Content - Scroll independiente */}
      <main className="
        flex-1 min-w-0 isolate relative z-0 
        h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent
        py-6 px-4 lg:px-8 xl:px-12
        pt-24 lg:pt-10
        bg-zinc-900
      ">
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}