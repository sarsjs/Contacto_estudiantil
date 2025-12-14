'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchStudentByEmail, fetchTimetableByGroup, fetchSubjects } from '@/lib/firebase/data';
import type { TimetableEntry, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentSchedulePage() {
  const { profile } = useAuth();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [schedule, setSchedule] = React.useState<TimetableEntry[]>([]);
  const [subjectLookup, setSubjectLookup] = React.useState<Record<string, string>>({});
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
        if (!studentRecord || !studentRecord.groupId) {
          setError('No se encontró tu grupo.');
          return;
        }
        setStudent(studentRecord);
        const entries = await fetchTimetableByGroup(studentRecord.groupId);
        setSchedule(entries);

        const subjects = await fetchSubjects();
        const subjectMap: Record<string, string> = {};
        subjects.forEach((subject) => {
          subjectMap[subject.id] = subject.name;
        });
        setSubjectLookup(subjectMap);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar tu horario.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [profile]);

  if (loading) {
    return <p>Cargando horario...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi horario</h1>
        <p className="text-muted-foreground">Estas son tus clases programadas.</p>
      </div>

      {student ? (
        <Card>
          <CardHeader>
            <CardTitle>{student.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <p>No hay clases registradas para este grupo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Materia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.day}</TableCell>
                      <TableCell>{entry.time}</TableCell>
                      <TableCell>{subjectLookup[entry.subjectId] || entry.subjectId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <p>No se encontró tu registro.</p>
      )}
    </div>
  );
}
