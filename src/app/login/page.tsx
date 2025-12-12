"use client";

import * as React from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { fetchUserByEmail, updateUser } from "@/lib/firebase/data";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [profileMatch, setProfileMatch] = React.useState<User | null>(null);
  const [curp, setCurp] = React.useState("");
  const [matricula, setMatricula] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const emailLower = email.trim().toLowerCase();
    try {
      await signIn(emailLower, password);
      toast({ title: "Inicio de sesion exitoso", description: "Bienvenido de nuevo." });
    } catch (error) {
      console.error("Sign in failed", error);
      toast({
        title: "Error en el inicio de sesion",
        description: "Credenciales invalidas. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailLower = email.trim().toLowerCase();
    if (!emailLower) {
      toast({
        title: "Correo requerido",
        description: "Introduce tu correo para enviar el enlace de recuperacion.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(getAuth(), emailLower);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja para restablecer tu contrasena.",
      });
    } catch (error) {
      console.error("Error al enviar correo de recuperacion:", error);
      toast({
        title: "No se pudo enviar",
        description: "No se pudo enviar el correo de recuperacion.",
        variant: "destructive",
      });
    }
  };

  const handleLookupProfile = async (): Promise<User | null> => {
    const emailLower = email.trim().toLowerCase();
    if (!emailLower) {
      toast({
        title: "Correo requerido",
        description: "Introduce tu correo institucional.",
        variant: "destructive",
      });
      return null;
    }
    setLoading(true);
    try {
      const profile = await fetchUserByEmail(emailLower);
      if (!profile) {
        toast({
          title: "No encontrado",
          description: "Ese correo no tiene una invitacion registrada.",
          variant: "destructive",
        });
        setProfileMatch(null);
        return null;
      }
      const allowedRoles = ["orientador", "profesor", "director"];
      if (!allowedRoles.includes(profile.role)) {
        toast({
          title: "Invitacion no valida",
          description: "Este correo no tiene un rol autorizado para registrarse.",
          variant: "destructive",
        });
        setProfileMatch(null);
        return null;
      }
      setProfileMatch(profile);
      setAvatarUrl(profile.avatarUrl || "");
      setCurp(profile.curp || "");
      setMatricula(profile.matricula || "");
      return profile;
    } catch (error) {
      console.error("lookup profile error", error);
      toast({
        title: "Error al buscar",
        description: "No se pudo consultar la invitacion.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curp || !matricula) {
      toast({
        title: "Datos incompletos",
        description: "CURP y matricula son obligatorios.",
        variant: "destructive",
      });
      return;
    }
    try {
      const profile = profileMatch ?? (await handleLookupProfile());
      if (!profile) return;
      const emailLower = email.trim().toLowerCase();
      if (!emailLower) {
        toast({
          title: "Correo requerido",
          description: "Introduce tu correo institucional.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      await updateUser(profile.id, {
        curp,
        matricula,
        avatarUrl: avatarUrl || profile.avatarUrl,
      });
      await sendPasswordResetEmail(getAuth(), emailLower);
      toast({
        title: "Registro completado",
        description: "Te enviamos un correo para que definas tu contrasena.",
      });
      setMode("login");
    } catch (error) {
      console.error("register error", error);
      toast({
        title: "No se pudo registrar",
        description: "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isLogin ? "default" : "outline"}
              onClick={() => {
                setMode("login");
                setPassword("");
              }}
            >
              Iniciar sesion
            </Button>
            <Button
              type="button"
              variant={!isLogin ? "default" : "outline"}
              onClick={() => {
                setMode("register");
              }}
            >
              Registrarse
            </Button>
          </div>
          <CardTitle className="text-2xl">{isLogin ? "Iniciar Sesion" : "Completar registro"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Ingresa tu correo electronico para acceder a tu panel."
              : "Usa el correo invitado, confirma tu nombre/rol y agrega los datos para tu credencial."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={isLogin ? handleSignIn : handleRegister}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@school.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {!isLogin && (
                <Button type="button" variant="secondary" size="sm" onClick={handleLookupProfile} disabled={loading}>
                  Buscar invitacion
                </Button>
              )}
            </div>

            {isLogin ? (
              <div className="grid gap-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="rounded-md border p-3 text-sm">
                  {profileMatch ? (
                    <div className="space-y-1">
                      <p className="font-medium">{profileMatch.name}</p>
                      <p className="text-muted-foreground">Rol: {profileMatch.role}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Busca tu invitacion por correo para validar tu rol.</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="curp">CURP</Label>
                  <Input id="curp" placeholder="CURP" value={curp} onChange={(e) => setCurp(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="matricula">Matricula</Label>
                  <Input
                    id="matricula"
                    placeholder="Numero de matricula"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="avatar">Foto (URL)</Label>
                  <Input
                    id="avatar"
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Usa una URL de foto; si no agregas, se conservara la actual.</p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading
                ? isLogin
                  ? "Iniciando sesion..."
                  : "Guardando..."
                : isLogin
                  ? "Iniciar Sesion"
                  : "Completar registro"}
            </Button>
            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:underline"
                disabled={loading}
              >
                Olvidaste tu contrasena?
              </button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
