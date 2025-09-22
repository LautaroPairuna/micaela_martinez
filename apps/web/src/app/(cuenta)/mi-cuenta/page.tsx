// src/app/(cuenta)/mi-cuenta/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mi-cuenta/perfil');
  }, [router]);

  // Opcional: mostrar un loader mientras redirige
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-neutral-500">Redirigiendo...</div>
    </div>
  );
}