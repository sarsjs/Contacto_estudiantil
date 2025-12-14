'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookCopy,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  Home,
  LayoutGrid,
  School,
  Users,
  ClipboardList,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/lib/types';
import { Logo } from '@/components/icons';
import { Button } from '../ui/button';
import { useAuth } from '@/context/auth-context';

const navItems = {
  director: [
    { href: '/dashboard/director', icon: Home, label: 'Panel Principal' },
    { href: '/dashboard/director/personal', icon: Users, label: 'Personal' },
    { href: '/dashboard/director/alumnos', icon: GraduationCap, label: 'Alumnos' },
    { href: '/dashboard/director/estructura', icon: School, label: 'Estructura' },
  ],
  orientador: [
    { href: '/dashboard/orientador', icon: Home, label: 'Panel Principal' },
    { href: '/dashboard/orientador/grupo', icon: ClipboardList, label: 'Grupos' },
    { href: '/dashboard/orientador/horarios', icon: Calendar, label: 'Horarios' },
    { href: '/dashboard/orientador/materias', icon: BookCopy, label: 'Materias' },
  ],
  profesor: [
    { href: '/dashboard/profesor', icon: LayoutGrid, label: 'Mis Clases' },
    { href: '/dashboard/profesor/asistencia', icon: ClipboardCheck, label: 'Asistencia' },
    { href: '/dashboard/profesor/calificaciones', icon: GraduationCap, label: 'Calificaciones' },
  ],
  estudiante: [
    { href: '/dashboard/alumno', icon: LayoutGrid, label: 'Panel Principal' },
    { href: '/dashboard/alumno/horario', icon: Calendar, label: 'Mi Horario' },
    { href: '/dashboard/alumno/calificaciones', icon: GraduationCap, label: 'Mis Calificaciones' },
  ],
};

const viewTitles = {
    director: 'Portal del Director',
    orientador: 'Portal del Orientador',
    profesor: 'App del Profesor',
    estudiante: 'Portal del Estudiante'
}

function AppSidebar({ user }: { user: User }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  const currentNav = navItems[user.role];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Logo className="size-8 text-primary" />
          <span className="text-lg font-semibold">EduChain</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {currentNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard/director' && pathname.startsWith(item.href));
            const buttonContent = (
              <>
                <item.icon />
                <span>{item.label}</span>
              </>
            );

            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  tooltip={{ children: item.label, hidden: open }}
                  isActive={isActive}
                >
                  <Link href={item.href} className={isActive ? 'bg-muted font-semibold' : ''}>
                    {buttonContent}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm">
            <span className="font-semibold">{user.name}</span>
            <span className="text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppHeader({
    title,
    signOut
}: {
    title: string;
    signOut: () => Promise<void>;
}) {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
                 <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold md:text-2xl">{title}</h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <Button onClick={signOut} variant="outline">Cerrar Sesión</Button>
            </div>
        </header>
    )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();

  const pathname = usePathname();

  React.useEffect(() => {
    if (loading || !profile) return;
    const expectedPath = `/dashboard/${profile.role}`;
    if (!pathname.startsWith(expectedPath)) {
      router.push(expectedPath);
    }
  }, [loading, profile, router, pathname]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-lg font-semibold">Tu perfil no está registrado.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          La cuenta autenticada no tiene un perfil asociado. Contacta al administrador
          para revisar tu invitación o crear el registro correspondiente.
        </p>
        <Button onClick={signOut} variant="outline">
          Cerrar sesión
        </Button>
      </div>
    );
  }

  const title = viewTitles[profile.role] || 'Dashboard';

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full">
        <AppSidebar user={profile} />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader
            title={title}
            signOut={signOut}
          />
          <main className="flex-1 overflow-y-auto bg-muted/40 p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
