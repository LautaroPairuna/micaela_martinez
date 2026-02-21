// apps/web/src/app/admin/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { fetchAllResourcesMeta } from '@/lib/admin/fetch-admin-meta';
import { auth } from '@/lib/server-auth';
import { AdminSidebar } from './AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect(`/auth?next=${encodeURIComponent('/admin')}`);
  }
  if (session.user.rol !== 'ADMIN') {
    redirect('/');
  }

  const resources = await fetchAllResourcesMeta();

  return (
    <div className="admin-layout flex h-screen overflow-hidden bg-[#1a1a1a] text-slate-50">
      {/* Sidebar fijo a la izquierda */}
      <AdminSidebar resources={resources} />

      {/* Contenido scrollable independiente */}
      <main className="flex-1 h-screen overflow-y-auto px-6 py-4">
        {children}
      </main>
    </div>
  );
}
