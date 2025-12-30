'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import {
  fetchGroupsByCounselor,
  fetchStudentsByGroup,
} from '@/lib/firebase/data';
import type { Group, User } from '@/lib/types';
import {
  Users,
  GraduationCap,
  Bell,
  MapPin,
  School,
  Clock
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { MessagePanel } from '@/components/dashboard/message-panel';
import { CalendarPanel } from '@/components/dashboard/calendar-panel';
import { NotificationPanel } from '@/components/dashboard/notification-panel';
import { RealTimeAttendance } from '@/components/dashboard/real-time-attendance';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SubstitutionManager } from '@/components/dashboard/substitution-manager';
import { GPSMonitor } from '@/components/dashboard/gps-monitor';
import { WorkAttendanceTable } from '@/components/dashboard/work-attendance-table';

export default function OrientadorPage() {
  const { profile: user } = useAuth();
  const { toast } = useToast();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadCounselorDashboard = React.useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const fetchedGroups = await fetchGroupsByCounselor(user.id);
      setGroups(fetchedGroups);

      // Fetch all students from all assigned groups
      const allStudentsPromises = fetchedGroups.map(g => fetchStudentsByGroup(g.id));
      const studentsInGroups = await Promise.all(allStudentsPromises);
      setStudents(studentsInGroups.flat());

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo cargar el tablero.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  React.useEffect(() => {
    loadCounselorDashboard();
  }, [loadCounselorDashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Sincronizando información institucional...</div>
      </div>
    );
  }

  const totalStudents = students.length;
  const insideStudents = students.filter(s => s.gpsStatus === 'inside').length;
  const comingStudents = students.filter(s => s.gpsStatus === 'coming').length;

  return (
    <div className="space-y-6">
      {/* Resumen de Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Alumnos"
          value={totalStudents.toString()}
          icon={GraduationCap}
          description="En tus grupos asignados"
        />
        <StatCard
          title="En Plantel"
          value={insideStudents.toString()}
          icon={MapPin}
          description="Localizados en zona segura"
        />
        <StatCard
          title="En Camino"
          value={comingStudents.toString()}
          icon={Clock}
          description="Con aviso de retraso"
        />
        <StatCard
          title="Grupos"
          value={groups.length.toString()}
          icon={School}
          description="Bajo tu orientación"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Estado en Tiempo Real */}
        <div className="lg:col-span-2 space-y-6">
          <RealTimeAttendance students={students} />

          {/* Grupos Rápidos */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Mis Grupos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => (
                  <Link key={group.id} href={`/dashboard/orientador/grupo/${group.id}`}>
                    <div className="p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{group.name}</p>
                          {group.tempCounselorId === user?.id && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Temporal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{group.cycleId}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Gestionar
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Derecho: Notificaciones y Gestión */}
        <div className="space-y-6">
          <WorkAttendanceTable userId={user?.id} title="Mi Asistencia" />
          <SubstitutionManager myGroups={groups} onUpdate={loadCounselorDashboard} />
          <NotificationPanel />
        </div>
      </div>

      {/* Calendario a pantalla completa o abajo */}
      <div className="grid grid-cols-1 gap-6">
        <CalendarPanel role="orientador" />
      </div>
      <GPSMonitor />
    </div>
  );
}
