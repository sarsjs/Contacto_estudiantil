'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchStudentByEmail, fetchTimetableByGroup, fetchSubjects } from '@/lib/firebase/data';
import type { TimetableEntry, Student, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentSchedule } from '@/components/dashboard/student-schedule';

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
        if (!studentRecord || !studentRecord.groupId) {
          setError('No se encontró tu grupo.');
          return;
        }
        setStudent(studentRecord);
        const entries = await fetchTimetableByGroup(studentRecord.groupId);
        setSchedule(entries);

        const subjectList = await fetchSubjects();
        setSubjects(subjectList);
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
        <StudentSchedule schedule={schedule} subjects={subjects} />
      ) : (
        <p>No se encontró tu registro.</p>
      )}
    </div>
  );
}
