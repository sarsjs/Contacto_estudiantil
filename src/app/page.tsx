'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!profile) {
      router.replace('/login');
      return;
    }

    const roleRoutes: Record<string, string> = {
      director: '/dashboard/director',
      orientador: '/dashboard/orientador',
      profesor: '/dashboard/profesor',
      estudiante: '/dashboard/estudiante',
    };

    const destination = roleRoutes[profile.role] ?? '/login';
    router.replace(destination);
  }, [loading, profile, router]);

  return <div className="flex h-screen items-center justify-center">Cargando...</div>;
}
