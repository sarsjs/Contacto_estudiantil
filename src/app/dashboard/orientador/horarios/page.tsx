'use client';

import * as React from 'react';
import { fetchGroupsByCounselor, fetchTimetableByGroup, fetchSubjects } from '@/lib/firebase/data';
import { useAuth } from '@/context/auth-context';
import type { Group, TimetableEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CounselorSchedulePage() {
  const { profile: user } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [schedule, setSchedule] = React.useState<Record<string, TimetableEntry[]>>({});
  const [subjectLookup, setSubjectLookup] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user || user.role !== 'orientador') {
      setLoading(false);
      return;
    }

    const loadSchedule = async () => {
      try {
        setLoading(true);
        const fetchedGroups = await fetchGroupsByCounselor(user.id);
        setGroups(fetchedGroups);

        const subjects = await fetchSubjects();
        const subjectsMap: Record<string, string> = {};
        subjects.forEach((subject) => {
          subjectsMap[subject.id] = subject.name;
        });
        setSubjectLookup(subjectsMap);

        const scheduleData: Record<string, TimetableEntry[]> = {};
        await Promise.all(
          fetchedGroups.map(async (group) => {
            const entries = await fetchTimetableByGroup(group.id);
            scheduleData[group.id] = entries;
          })
        );
        setSchedule(scheduleData);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el horario escolar.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [user]);

  if (loading) {
    return <p>Cargando horarios...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horarios de tus grupos</h1>
        <p className="text-muted-foreground">Consulta las clases programadas para cada grupo bajo tu supervisión.</p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent>Aún no tienes grupos asignados.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.name} - {group.cycleId}</CardTitle>
              </CardHeader>
              <CardContent>
                {schedule[group.id]?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Día</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Materia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule[group.id].map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.day}</TableCell>
                          <TableCell>{entry.time}</TableCell>
                          <TableCell>{subjectLookup[entry.subjectId] || entry.subjectId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay clases registradas.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
