"use client";

import { Dashboard } from "@/components/dashboard/dashboard";

export default function Home() {
  // Toda la logica de proteccion de rutas y carga
  // ahora es manejada por el componente AuthGuard en el layout.
  // Si este componente se renderiza, podemos asumir que el usuario esta autenticado.
  return <Dashboard />;
}
