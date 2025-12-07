"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const ROLE_REDIRECTS: Record<string, string> = {
  alumno: "/",
  estudiante: "/",
  student: "/",
  orientador: "/",
  advisor: "/",
  profesor: "/",
  teacher: "/",
  director: "/",
  admin: "/",
  administrator: "/",
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Procesando tu inicio de sesión...");

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        setStatus("Validando el enlace mágico...");
        const { data: urlData, error: urlError } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (urlError && !urlData?.session) {
          throw urlError;
        }

        const session =
          urlData?.session ??
          (await supabase.auth.getSession()).data.session ??
          null;

        const user = session?.user;
        if (!user) {
          throw new Error("No se obtuvo una sesión válida desde Supabase.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("No se pudo obtener el perfil para redirigir:", profileError);
        }

        const roleKey = profile?.role?.trim().toLowerCase() ?? "";
        const destination = ROLE_REDIRECTS[roleKey] ?? "/";

        if (isMounted) {
          router.replace(destination);
        }
      } catch (error) {
        console.error("Error procesando callback de autenticación:", error);
        if (isMounted) {
          setStatus("No se pudo completar el inicio de sesión. Redirigiendo al inicio...");
          router.replace("/");
        }
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="rounded-lg border bg-card p-6 text-center shadow-lg">
        <p className="text-base font-medium text-foreground">{status}</p>
      </div>
    </div>
  );
}
