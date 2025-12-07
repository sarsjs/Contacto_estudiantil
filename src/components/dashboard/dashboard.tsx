'use client';

import * as React from 'react';
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
  UserCog,
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
import { User, UserRole } from '@/lib/types';
import { fetchUsers } from '@/lib/firebase/data';
import { Logo } from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DirectorView } from './director-view';
import { CounselorView } from './counselor-view';
import { TeacherView } from './teacher-view';
import { StudentView } from './student-view';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = {
  director: [
    { href: '#panel', icon: Home, label: 'Panel Principal' },
    { href: '#personal', icon: Users, label: 'Personal' },
    { href: '#estructura', icon: School, label: 'Estructura' },
  ],
  orientador: [
    { href: '#', icon: Home, label: 'Panel Principal' },
    { href: '#', icon: ClipboardList, label: 'Estudiantes' },
    { href: '#', icon: Calendar, label: 'Horarios' },
    { href: '#', icon: BookCopy, label: 'Materias' },
  ],
  profesor: [
    { href: '#', icon: LayoutGrid, label: 'Mis Clases' },
    { href: '#', icon: ClipboardCheck, label: 'Asistencia' },
    { href: '#', icon: GraduationCap, label: 'Calificaciones' },
  ],
  estudiante: [
    { href: '#', icon: LayoutGrid, label: 'Panel Principal' },
    { href: '#', icon: Calendar, label: 'Mi Horario' },
    { href: '#', icon: GraduationCap, label: 'Mis Calificaciones' },
  ],
};

const viewTitles = {
    director: 'Portal del Director',
    orientador: 'Portal del Orientador',
    profesor: 'App del Profesor',
    estudiante: 'Portal del Estudiante'
}

function RoleSwitcher({
  user,
  setUser,
  allUsers,
}: {
  user: User;
  setUser: (user: User) => void;
  allUsers: User[];
}) {
  const handleRoleChange = (role: UserRole) => {
    const newUser = allUsers.find((u) => u.role === role);
    if (newUser) {
      setUser(newUser);
    }
  }
  return (
    <Select value={user.role} onValueChange={(value) => handleRoleChange(value as UserRole)}>
      <SelectTrigger className="w-auto border-0 bg-transparent shadow-none focus:ring-0">
        <SelectValue placeholder="Seleccionar Rol" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="director">Director</SelectItem>
        <SelectItem value="orientador">Orientador</SelectItem>
        <SelectItem value="profesor">Profesor</SelectItem>
        <SelectItem value="estudiante">Estudiante</SelectItem>
      </SelectContent>
    </Select>
  );
}

function AppSidebar({ user }: { user: User }) {
  const { open } = useSidebar();
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
          {currentNav.map((item, index) => {
            const buttonContent = (
              <>
                <item.icon />
                <span>{item.label}</span>
              </>
            );

            return (
              <SidebarMenuItem key={item.label}>
                {item.href && item.href !== '#' ? (
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: item.label, hidden: open }}
                    isActive={index === 0}
                  >
                    <a href={item.href}>{buttonContent}</a>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    tooltip={{ children: item.label, hidden: open }}
                    isActive={index === 0}
                  >
                    {buttonContent}
                  </SidebarMenuButton>
                )}
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

function UserMenu({
  setUser,
  allUsers
}: {
  setUser: (role: User) => void;
  allUsers: User[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserCog className="h-5 w-5" />
          <span className="sr-only">Menú de usuario</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Simular Rol</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allUsers.map((u) => (
          <DropdownMenuItem key={u.id} onSelect={() => setUser(u)}>
            {u.name} ({u.role})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppHeader({
    user,
    setUser,
    title,
    allUsers
}: {
    user: User,
    setUser: (user: User) => void;
    title: string;
    allUsers: User[];
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
                <RoleSwitcher user={user} setUser={setUser} allUsers={allUsers} />
                 <UserMenu setUser={setUser} allUsers={allUsers} />
            </div>
        </header>
    )
}

export function Dashboard() {
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await fetchUsers();
        setAllUsers(users);
        const director = users.find(u => u.role === 'director');
        setCurrentUser(director || users[0] || null);
      } catch (error) {
        console.error("Error loading users", error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSetUser = (user: User) => {
    setCurrentUser(user);
  }

  if (loading || !currentUser) {
    return <div className="flex h-screen items-center justify-center">Cargando panel...</div>;
  }

  const title = viewTitles[currentUser.role];

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar user={currentUser} />
      <SidebarInset>
        <AppHeader 
            user={currentUser} 
            setUser={handleSetUser} 
            title={title}
            allUsers={allUsers}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
            {currentUser.role === 'director' && <DirectorView />}
            {currentUser.role === 'orientador' && <CounselorView currentUser={currentUser} />}
            {currentUser.role === 'profesor' && <TeacherView />}
            {currentUser.role === 'estudiante' && <StudentView />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
