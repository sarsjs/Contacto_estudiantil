'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(); // Usamos 'user' como fuente de la verdad
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/login';

    // Si el objeto 'user' de Firebase existe, el usuario está autenticado.
    if (user) {
      // Si está en la página de login, lo redirigimos a la página principal.
      if (isAuthPage) {
        router.push('/');
      }
    } else {
      // Si no hay 'user', no está autenticado.
      // Si no está en la página de login, lo redirigimos allí.
      if (!isAuthPage) {
        router.push('/login');
      }
    }
  }, [user, loading, router, pathname]); // La dependencia ahora es 'user'

  // Mientras se determina el estado de autenticación, mostramos una pantalla de carga.
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // La lógica de renderizado también se basa en 'user'.
  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  if (user && pathname !== '/login') {
    return <>{children}</>;
  }

  return null;
}
