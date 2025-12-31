'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { auth, firebaseConfigErrorMessage } from '@/lib/firebase/client';

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
      // Rutas públicas que no requieren autenticación
      const publicRoutes = ['/test', '/validar'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

      // No hay usuario, no está autenticado
      if (!isAuthPage && !isPublicRoute) {
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

  if (loading) {
    // Muestra 'Cargando...' si la autenticación está en curso
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Lista de rutas públicas que no requieren autenticación
  const publicRoutes = ['/test', '/validar'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Si es una ruta pública, renderizar children directamente sin validaciones de auth
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Si está autenticado y con perfil, y está en una ruta de dashboard, muestra el contenido
  if (user && profile && pathname.startsWith('/dashboard')) {
    return <>{children}</>;
  }

  // Si no está autenticado y está en la página de login, muestra el formulario
  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  // Si está autenticado pero no tiene perfil (posiblemente error de sincronización o usuario no registrado en Firestore)
  if (user && !profile) {
    // Mostrar un mensaje de error más descriptivo y permitir cerrar sesión
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">No se encontró tu perfil registrado en el sistema.</p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                router.push('/login');
                if (!firebaseConfigErrorMessage) {
                  auth.signOut(); // Cerrar sesión de Firebase
                }
              }
            }}
            className="text-blue-500 underline"
          >
            Cerrar sesión e intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  // Si no está autenticado y no está en login, redirigir a login
  if (!user && pathname !== '/login') {
    if (typeof window !== 'undefined') {
      router.replace('/login');
    }
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  // Si está autenticado pero no está en una página de dashboard, redirigir a su dashboard
  if (user && profile && !pathname.startsWith('/dashboard')) {
    const destination = roleRoutes[profile.role] ?? '/login';
    if (typeof window !== 'undefined') {
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
