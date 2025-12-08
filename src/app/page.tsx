"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando sesión...
      </div>
    );
  }

  return <Dashboard />;
}
