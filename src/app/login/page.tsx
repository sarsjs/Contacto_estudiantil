"use client";

import * as React from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/context/auth-context";
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

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await signIn(normalizedEmail, password);
      toast({ title: "Inicio de sesión", description: "Bienvenido de nuevo." });
    } catch (error) {
      console.error("Login error", error);
      toast({
        title: "Credenciales incorrectas",
        description: "Verifica tu correo y contraseña.",
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
      await sendPasswordResetEmail(getAuth(), normalizedEmail);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja para restablecer la contraseña.",
      });
    } catch (error) {
      console.error("Forgot password error", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el correo.",
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
