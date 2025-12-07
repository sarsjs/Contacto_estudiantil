"use client";

import * as React from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { profile, loading, signIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: "Email and password are required" });
      return;
    }
    setPending(true);
    try {
      await signIn(email, password);
      toast({
        title: "Signed in successfully",
      });
    } catch (error) {
      console.error("sign in error", error);
      toast({
        title: "Sign in failed",
        description: "Please check your credentials and try again.",
      });
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-lg">
          <h1 className="text-2xl font-semibold">Welcome to EduChain</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access the dashboard.
          </p>
          <div className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@school.edu"
              className="w-full"
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full"
            />
            <Button className="w-full" onClick={handleLogin} disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <Dashboard />;
}
