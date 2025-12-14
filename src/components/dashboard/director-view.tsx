'use client';

import * as React from 'react';
import { School, Users, User as UserIcon, FolderKanban, UserCheck, GraduationCap } from 'lucide-react';
import { StatCard } from './stat-card';
import { fetchUsers, fetchGroups, fetchStudents } from '@/lib/firebase/data';
import type { Group, User, Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { CalendarPanel } from './calendar-panel';
import { MessagePanel } from './message-panel';

export function DirectorView() {
  const [staffList, setStaffList] = React.useState<User[]>([]);
  const [groupList, setGroupList] = React.useState<Group[]>([]);
  const [cycleList, setCycleList] = React.useState<string[]>([]);
  const [studentList, setStudentList] = React.useState<Student[]>([]);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    try {
      const [users, groupsData, studentsData] = await Promise.all([
        fetchUsers(),
        fetchGroups(),
        fetchStudents(),
      ]);
      setStaffList(users);
      setGroupList(groupsData);
      setStudentList(studentsData);
    } catch (error) {
      console.error('Error loading Firebase data', error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron obtener los datos del servidor.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const uniqueCycles = Array.from(new Set(groupList.map((group) => group.cycleId))).filter(Boolean);
    setCycleList(uniqueCycles);
  }, [groupList]);

  const totalCycles = cycleList.length;
  const totalGroups = groupList.length;
  const counsellorsCount = staffList.filter((u) => u.role === 'orientador').length;
  const teacherCount = staffList.filter((u) => u.role === 'profesor').length;
  const totalStudents = studentList.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total del Personal"
          value={staffList.length.toString()}
          icon={Users}
          description="Profesores y orientadores"
        />
        <StatCard
          title="Maestros"
          value={teacherCount.toString()}
          icon={UserCheck}
          description="Docentes activos en el plantel"
        />
        <StatCard
          title="Estudiantes"
          value={totalStudents.toString()}
          icon={GraduationCap}
          description="Alumnos registrados en el sistema"
        />
        <StatCard
          title="Grupos Activos"
          value={totalGroups.toString()}
          icon={School}
          description="En todos los ciclos"
        />
        <StatCard
          title="Orientadores"
          value={counsellorsCount.toString()}
          icon={UserIcon}
          description="Gestionando grupos de estudiantes"
        />
        <StatCard
          title="Ciclos Escolares"
          value={totalCycles.toString()}
          icon={FolderKanban}
          description="Activos y próximos"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MessagePanel />
        <CalendarPanel role="director" />
      </div>
    </div>
  );
}
