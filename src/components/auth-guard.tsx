"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

// Este componente actua como un guardia para toda la aplicacion.
// Muestra una pantalla de carga mientras se verifica el estado de autenticacion
// y redirige al usuario segun este autenticado o no.

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si aun estamos cargando el estado de autenticacion, no hacemos nada.
    if (loading) {
      return;
    }

    const isAuthPage = pathname === "/login";

    // Si el usuario tiene un perfil, esta autenticado.
    if (profile) {
      // Si esta en la pagina de login, lo redirigimos a la pagina principal.
      if (isAuthPage) {
        router.push("/");
      }
    } else {
      // Si no tiene perfil, no esta autenticado.
      // Si no esta en la pagina de login, lo redirigimos alli.
      if (!isAuthPage) {
        router.push("/login");
      }
    }
  }, [profile, loading, router, pathname]);

  // Mientras se determina el estado de autenticacion, mostramos una pantalla de carga.
  // Esto es CRUCIAL para prevenir el "parpadeo" de la pagina de login.
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Si el usuario no esta autenticado y esta en la pagina de login, mostramos la pagina de login.
  if (!profile && pathname === "/login") {
    return <>{children}</>;
  }

  // Si el usuario esta autenticado y no esta en la pagina de login, mostramos la pagina solicitada.
  if (profile && pathname !== "/login") {
    return <>{children}</>;
  }

  // Para todos los demas casos intermedios, no mostramos nada para evitar contenido incorrecto.
  return null;
}
