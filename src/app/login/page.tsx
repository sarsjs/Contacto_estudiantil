"use client";

import * as React from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/context/auth-context";
import { firebaseConfigErrorMessage } from "@/lib/firebase/client";
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

const roleRoutes: Record<string, string> = {
  director: "/dashboard/director",
  orientador: "/dashboard/orientador",
  profesor: "/dashboard/profesor",
  estudiante: "/dashboard/alumno",
};

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { signIn, profile, user, loading: authLoading } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Utiliza tu correo institucional para acceder.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="usuario@school.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </Button>
            <Button variant="ghost" className="w-full" type="button" onClick={handleForgotPassword}>
              Recuperar contraseña
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
