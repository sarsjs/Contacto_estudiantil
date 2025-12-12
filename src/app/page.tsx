'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (profile) {
        // Redirect based on user role
        switch (profile.role) {
          case 'director':
            router.replace('/dashboard/director');
            break;
          // TODO: Add redirects for other roles
          default:
            // Redirect to a generic dashboard or login if role is unknown
            router.replace('/login');
            break;
        }
      } else {
        // If no profile, redirect to login
        router.replace('/login');
      }
    }
  }, [loading, profile, router]);

  // Optional: Show a loading indicator while redirecting
  return <div className="flex h-screen items-center justify-center">Cargando...</div>;
}
