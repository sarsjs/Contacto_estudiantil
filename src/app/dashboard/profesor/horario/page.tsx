'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { fetchGroups, fetchSubjects, fetchTimetableByTeacher } from '@/lib/firebase/data';
import type { Group, Subject, TimetableEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleGrid } from '@/components/dashboard/student-schedule';

export default function TeacherSchedulePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [timetable, subjectList, groupList] = await Promise.all([
        fetchTimetableByTeacher(profile.id),
        fetchSubjects(),
        fetchGroups(),
      ]);
      setEntries(timetable);
      setSubjects(subjectList);
      setGroups(groupList);
    } catch (error) {
      console.error(error);
      toast({
        title: 'No se pudo cargar tu horario',
        description: 'Intenta nuevamente en unos segundos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mi horario</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Revisa en qué grupo y horario impartes cada materia durante la semana.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p>Cargando horario...</p>
      ) : (
        <ScheduleGrid
          schedule={entries}
          subjects={subjects}
          groups={groups}
          title="Clases asignadas"
          emptyLabel="Aún no tienes clases programadas."
          showGroup
        />
      )}
    </div>
  );
}
