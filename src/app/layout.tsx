import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { AuthGuard } from '@/components/auth-guard';

export const metadata: Metadata = {
  title: 'EduChain',
  description: 'El Sistema Definitivo de Gestión Escolar',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <AuthGuard>
            {children}
            <Toaster />
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
