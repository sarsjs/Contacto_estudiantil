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

  // Si esta autenticado pero no tiene perfil (posible error de sincronizacion o usuario no registrado en Firestore)
  if (user && !profile) {
    const isAdminCandidate = user.email?.toLowerCase() === 'admin@school.com';
    // Mostrar un mensaje de error mas descriptivo y permitir cerrar sesion
    return (
      <div className=\"min-h-screen w-full flex items-center justify-center\">
        <div className=\"text-center space-y-3\">
          <p className=\"text-red-500\">No se encontro tu perfil registrado en el sistema.</p>
          {isAdminCandidate && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  router.push('/test/rescue-admin');
                }
              }}
              className=\"text-sm text-blue-500 underline\"
            >
              Ir a rescate de admin
            </button>
          )}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                router.push('/login');
                if (!firebaseConfigErrorMessage) {
                  auth.signOut(); // Cerrar sesion de Firebase
                }
              }
            }}
            className=\"text-blue-500 underline\"
          >
            Cerrar sesion e intentar nuevamente
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

