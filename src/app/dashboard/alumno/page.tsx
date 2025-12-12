'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import {
  fetchStudentByEmail, 
  fetchTimetableByGroup, 
  fetchSubjects, 
  fetchGradesByStudent
} from '@/lib/firebase/data';
import type { Student, TimetableEntry, Subject, Grade } from '@/lib/types';
import { StudentSchedule } from '@/components/dashboard/student-schedule';
import { StudentGrades } from '@/components/dashboard/student-grades';
import { MessageHistory } from '@/components/dashboard/message-history';

export default function AlumnoPage() {
  const { profile: user } = useAuth();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [schedule, setSchedule] = React.useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadStudentData = async () => {
      if (!user || !user.email) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const currentStudent = await fetchStudentByEmail(user.email);
        if (!currentStudent) {
          setError('No se encontró tu perfil de estudiante.');
          return;
        }
        setStudent(currentStudent);

        const allSubjects = await fetchSubjects();
        setSubjects(allSubjects);

        if (currentStudent.groupId) {
          const [timetableData, gradesData] = await Promise.all([
            fetchTimetableByGroup(currentStudent.groupId),
            fetchGradesByStudent(currentStudent.id),
          ]);
          setSchedule(timetableData);
          setGrades(gradesData);
        } else {
          setSchedule([]);
          setGrades([]);
        }

      } catch (err) {
        console.error(err);
        setError('No se pudo cargar tu información.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, {student?.name || 'Estudiante'}</h1>
        <p className="text-muted-foreground">Aquí puedes ver tu horario, calificaciones y comunicados.</p>
      </div>

      {isLoading ? (
        <p>Cargando tu información...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : student?.groupId ? (
        <div className="space-y-6">
            <StudentSchedule schedule={schedule} subjects={subjects} />
            <StudentGrades grades={grades} subjects={subjects} />
        </div>
      ) : (
        <p>Aún no estás asignado a un grupo. Tu horario y calificaciones aparecerán aquí cuando se te asigne uno.</p>
      )}

      <MessageHistory />

    </div>
  );
}
