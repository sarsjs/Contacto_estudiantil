'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchStudentByEmail, fetchTimetableByGroup, fetchSubjects } from '@/lib/firebase/data';
import type { TimetableEntry, Student, Subject } from '@/lib/types';
import { StudentSchedule } from '@/components/dashboard/student-schedule';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentSchedulePage() {
  const { profile } = useAuth();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [schedule, setSchedule] = React.useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const loadSchedule = async () => {
      try {
        setLoading(true);
        const studentRecord = await fetchStudentByEmail(profile.email);

        if (!studentRecord) {
          setError('No encontramos tu expediente de estudiante.');
          return;
        }

        setStudent(studentRecord);

        if (!studentRecord.groupId) {
          // Si no tiene grupo, no es un error critico, solo no hay horario
          setSchedule([]);
          setSubjects([]);
          return;
        }

        const [entries, subjectList] = await Promise.all([
          fetchTimetableByGroup(studentRecord.groupId),
          fetchSubjects()
        ]);

        setSchedule(entries);
        setSubjects(subjectList);
      } catch (err) {
        console.error("Error loading schedule:", err);
        setError('Tuvimos un problema al cargar tu horario. Intenta recargar la página.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/20 rounded-full" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Cargando Horario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <Calendar className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold">Algo no salió bien</h3>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Mi Horario Escolar </h1>
          <p className="text-muted-foreground font-medium">Planificación semanal de clases</p>
        </div>
        {student?.groupId && (
          <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20 flex items-center gap-2">
            <span className="text-xs font-black uppercase text-primary">Grupo: {student.groupId}</span>
          </div>
        )}
      </div>

      {!student?.groupId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Clock className="h-10 w-10 mb-4 opacity-50" />
            <p className="font-medium">Aún no tienes un grupo asignado.</p>
            <p className="text-sm">Tu horario aparecerá aquí cuando se te asigne un grupo.</p>
          </CardContent>
        </Card>
      ) : (
        <StudentSchedule schedule={schedule} subjects={subjects} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="flex items-center gap-3 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <Clock className="h-4 w-4" />
          <span>Horario: Matutino (7:00 - 14:00)</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <MapPin className="h-4 w-4" />
          <span>Plantel Central EPO 264</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4" />
          <span>Ciclo 2024-2025</span>
        </div>
      </div>
    </div>
  );
}
