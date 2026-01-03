'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { auth, firebaseConfigErrorMessage } from '@/lib/firebase/client';

const roleRoutes: Record<string, string> = {
  admin: '/dashboard/admin',
  director: '/dashboard/director',
  orientador: '/dashboard/orientador',
  profesor: '/dashboard/profesor',
  estudiante: '/dashboard/alumno',
  alumno: '/dashboard/alumno',
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Estado para prevenir redirecciones temporales cuando se esta actualizando el perfil
  const [shouldRedirect, setShouldRedirect] = useState(true);

  useEffect(() => {
    if (loading) {
      return; // Espera a que la carga inicial de user y profile termine
    }

    const isAuthPage = pathname == '/login';
    const isDashboardPage = pathname.startsWith('/dashboard');

    if (user && profile) {
      // Usuario autenticado y con perfil
      const destination = roleRoutes[profile.role] ?? '/login';

      // Solo redirige si:
      // 1. No estamos en una pagina de dashboard
      // 2. Estamos en una pagina que no coincide con nuestro rol y no estamos en una subpagina
      // 3. El estado de redireccion esta habilitado
      if (shouldRedirect && pathname != destination && isDashboardPage && pathname != '/dashboard') {
        // Verificamos si estamos en una subpagina del rol correcto
        if (!pathname.startsWith(destination)) {
          router.replace(destination);
        }
      }
    } else if (user && !profile) {
      // Usuario autenticado pero el perfil aun esta cargando o no existe
      // No hacer nada, esperar a que el contexto termine de buscar el perfil.
    } else {
      // Rutas publicas que no requieren autenticacion
      const publicRoutes = ['/test', '/validar'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

      // No hay usuario, no esta autenticado
      if (!isAuthPage && !isPublicRoute) {
        router.replace('/login');
      }
    }
  }, [user, profile, loading, router, pathname, shouldRedirect]);

  // Manejar la interrupcion de redireccion temporal
  useEffect(() => {
    // Si estamos en una pagina de dashboard valida para este rol, evitar redirecciones
    if (user && profile && pathname.startsWith('/dashboard')) {
      const userDashboard = roleRoutes[profile.role];
      if (pathname.startsWith(userDashboard)) {
        setShouldRedirect(false);
        // Reanudar redirecciones despues de un breve periodo para evitar problemas
        const timer = setTimeout(() => {
          setShouldRedirect(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, user, profile]);

  if (loading) {
    // Muestra 'Cargando...' si la autenticacion esta en curso
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Lista de rutas publicas que no requieren autenticacion
  const publicRoutes = ['/test', '/validar'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Si es una ruta publica, renderizar children directamente sin validaciones de auth
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Si esta autenticado y con perfil, y esta en una ruta de dashboard, muestra el contenido
  if (user && profile && pathname.startsWith('/dashboard')) {
    return <>{children}</>;
  }

  // Si no esta autenticado y esta en la pagina de login, muestra el formulario
  if (!user && pathname == '/login') {
    return <>{children}</>;
  }

  // Si esta autenticado pero no tiene perfil (posible error de sincronizacion o usuario no registrado en Firestore)
  if (user && !profile) {
    const isAdminCandidate = user.email?.toLowerCase() == 'admin@school.com';
    // Mostrar un mensaje de error mas descriptivo y permitir cerrar sesion
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-500">No se encontro tu perfil registrado en el sistema.</p>
          {isAdminCandidate && (
            <button
              onClick={() => {
                if (typeof window != 'undefined') {
                  router.push('/test/rescue-admin');
                }
              }}
              className="text-sm text-blue-500 underline"
            >
              Ir a rescate de admin
            </button>
          )}
          <button
            onClick={() => {
              if (typeof window != 'undefined') {
                router.push('/login');
                if (!firebaseConfigErrorMessage) {
                  auth.signOut(); // Cerrar sesion de Firebase
                }
              }
            }}
            className="text-blue-500 underline"
          >
            Cerrar sesion e intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  // Si no esta autenticado y no esta en login, redirigir a login
  if (!user && pathname != '/login') {
    if (typeof window != 'undefined') {
      router.replace('/login');
    }
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  // Si esta autenticado pero no esta en una pagina de dashboard, redirigir a su dashboard
  if (user && profile && !pathname.startsWith('/dashboard')) {
    const destination = roleRoutes[profile.role] ?? '/login';
    if (typeof window != 'undefined') {
      router.replace(destination);
    }
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  // En cualquier otro caso, no renderiza nada para evitar parpadeos
  return null;
}
