// src/app/(cuenta)/mi-cuenta/layout.tsx
import { ReactNode } from 'react';
import { getMe } from '@/lib/sdk/userApi';
import AccountSidebar from '@/components/account/AccountSidebar';

// Forzar renderizado dinámico para páginas que requieren autenticación
export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  
  return (
    <div className="w-full min-h-screen relative lg:flex">
      {/* Sidebar - Se maneja internamente en AccountSidebar */}
      <aside className="
        lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-0
        lg:h-screen lg:overflow-y-auto lg:border-r lg:border-gray-200
      ">
        <AccountSidebar me={me} />
      </aside>

      {/* Main Content */}
      <main className="
        flex-1 min-w-0 isolate relative z-0 
        space-y-6 py-4 lg:py-6 xl:py-10 
        px-4 lg:px-6 xl:px-10
        pt-20 lg:pt-6 xl:pt-10
      ">
        {children}
      </main>
    </div>
  );
}