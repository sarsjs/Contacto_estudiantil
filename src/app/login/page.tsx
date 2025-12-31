"use client";

import * as React from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/context/auth-context";
import { firebaseConfigErrorMessage } from "@/lib/firebase/client";
import { signInWithEmail } from "@/lib/firebase/auth";
import { fetchUserByEmail, logActivity } from "@/lib/firebase/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAppConfig } from "@/context/config-context";

const roleRoutes: Record<string, string> = {
  director: "/dashboard/director",
  orientador: "/dashboard/orientador",
  profesor: "/dashboard/profesor",
  estudiante: "/dashboard/alumno",
  admin: "/dashboard/admin",
};

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { signIn, profile, user, loading: authLoading } = useAuth();
  const { config } = useAppConfig();
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    if (authLoading) return;
    if (user && profile) {
      const destination = roleRoutes[profile.role] ?? "/dashboard";
      router.replace(destination);
    }
  }, [authLoading, profile, router, user]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (firebaseConfigErrorMessage) {
        throw new Error(firebaseConfigErrorMessage);
      }

      await signIn(normalizedEmail, password);

      // REGISTRO DE LOG
      // Intentamos obtener el perfil para el log
      try {
        const userProfile = await fetchUserByEmail(normalizedEmail);
        if (userProfile) {
          await logActivity({
            action: 'LOGIN',
            details: `Inicio de sesión exitoso.`,
            targetId: userProfile.id,
            targetType: 'user',
            createdBy: userProfile.id,
            creatorName: userProfile.name,
            creatorRole: userProfile.role as any
          });
        }
      } catch (logErr) {
        console.error("Error logging login:", logErr);
      }

      toast({ title: "Inicio de sesión", description: "Bienvenido de nuevo." });
    } catch (error) {
      console.error("Login error", error);

      // Mostrar mensajes claros según el tipo de error
      let title = "Error al iniciar sesión";
      let description = "Intenta nuevamente.";

      if (firebaseConfigErrorMessage) {
        description = firebaseConfigErrorMessage;
      } else if (typeof error === "object" && error && "code" in error) {
        const code = String((error as { code?: unknown }).code);

        switch (code) {
          case "auth/invalid-api-key":
          case "auth/configuration-not-found":
            description =
              "La configuración de Firebase es inválida o falta. Revisa las llaves públicas en las variables de entorno.";
            break;
          case "auth/invalid-email":
            description = "El correo no es válido.";
            break;
          case "auth/user-disabled":
            description = "La cuenta está deshabilitada.";
            break;
          case "auth/user-not-found":
          case "auth/wrong-password":
            title = "Credenciales incorrectas";
            description = "Verifica tu correo y contraseña.";
            break;
          default:
            description = "Ocurrió un problema al validar tus credenciales.";
            break;
        }
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({
        title: "Correo requerido",
        description: "Introduce tu correo para recuperar la contraseña.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (firebaseConfigErrorMessage) {
        throw new Error(firebaseConfigErrorMessage);
      }

      await sendPasswordResetEmail(getAuth(), normalizedEmail);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja para restablecer la contraseña.",
      });
    } catch (error) {
      console.error("Forgot password error", error);
      toast({
        title: "Error",
        description:
          firebaseConfigErrorMessage ??
          "No se pudo enviar el correo. Verifica la configuración de Firebase o inténtalo más tarde.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 overflow-hidden relative">
      {/* Abstract Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />

      <Card className="w-full max-w-sm bg-zinc-950 border-red-900/40 shadow-[0_0_40px_rgba(153,27,27,0.15)] relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 w-32 h-32 flex items-center justify-center">
            <img
              src={config?.schoolLogoUrl || "/logo.png"}
              alt="Logo Institucional"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-widest uppercase mb-1">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium tracking-tight">
            {config?.institutionName || "Panel Institucional EPO 264"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="usuario@school.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-600 focus:ring-red-600 h-11"
              />
            </div>
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-600 focus:ring-red-600 h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button
              type="submit"
              className="w-full h-12 bg-red-700 hover:bg-red-800 text-white font-black tracking-widest uppercase transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Acceder"}
            </Button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-zinc-600 hover:text-red-500 transition-colors font-medium underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
