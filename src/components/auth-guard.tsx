'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const roleRoutes: Record<string, string> = {
  director: '/dashboard/director',
  orientador: '/dashboard/orientador',
  profesor: '/dashboard/profesor',
  estudiante: '/dashboard/alumno',
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Estado para prevenir redirecciones temporales cuando se está actualizando el perfil
  const [shouldRedirect, setShouldRedirect] = useState(true);

  useEffect(() => {
    if (loading) {
      return; // Espera a que la carga inicial de user y profile termine
    }

    const isAuthPage = pathname === '/login';
    const isDashboardPage = pathname.startsWith('/dashboard');

    if (user && profile) {
      // Usuario autenticado y con perfil
      const destination = roleRoutes[profile.role] ?? '/login';

      // Solo redirige si:
      // 1. No estamos en una página de dashboard
      // 2. Estamos en una página que no coincide con nuestro rol Y no estamos en una subpágina
      // 3. El estado de redirección está habilitado
      if (shouldRedirect && pathname !== destination && isDashboardPage && pathname !== '/dashboard') {
        // Verificamos si estamos en una subpágina del rol correcto
        if (!pathname.startsWith(destination)) {
          router.replace(destination);
        }
      }
    } else if (user && !profile) {
      // Usuario autenticado pero el perfil aún está cargando o no existe
      // No hacer nada, esperar a que el contexto termine de buscar el perfil.
    } else {
      // No hay usuario, no está autenticado
      if (!isAuthPage) {
        router.replace('/login');
      }
    }
  }, [user, profile, loading, router, pathname, shouldRedirect]);

  // Manejar la interrupción de redirección temporal
  useEffect(() => {
    // Si estamos en una página de dashboard válida para este rol, evitar redirecciones
    if (user && profile && pathname.startsWith('/dashboard')) {
      const userDashboard = roleRoutes[profile.role];
      if (pathname.startsWith(userDashboard)) {
        setShouldRedirect(false);
        // Reanudar redirecciones después de un breve período para evitar problemas
        const timer = setTimeout(() => {
          setShouldRedirect(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, user, profile]);

  if (loading || (user && !profile && pathname !== '/login')) {
    // Muestra 'Cargando...' si:
    // 1. La autenticación inicial está en curso.
    // 2. O si ya hay un usuario de Firebase pero su perfil de la base de datos aún no ha llegado,
    //    y no estamos en la página de login (para evitar un flash de 'cargando' sobre el formulario).
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Si está autenticado y con perfil, y está en una ruta de dashboard, muestra el contenido
  if (user && profile && pathname.startsWith('/dashboard')) {
    return <>{children}</>;
  }

  // Si no está autenticado y está en la página de login, muestra el formulario
  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  // En cualquier otro caso (como un estado intermedio), no renderiza nada para evitar parpadeos
  return null;
}
