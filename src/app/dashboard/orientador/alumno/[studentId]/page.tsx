'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchStudents,
  fetchGradesByStudent,
  fetchSubjects,
  fetchGroups,
  fetchAttendanceByStudent
} from '@/lib/firebase/data';
import type { Student, Grade, Subject, Group, Attendance } from '@/lib/types';
import { StudentGrades } from '@/components/dashboard/student-grades';
import { StudentAttendanceHistory } from '@/components/dashboard/student-attendance-history';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const router = useRouter();

  const [student, setStudent] = React.useState<Student | null>(null);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);

        const [allStudents, allGroups, studentGrades, allSubjects, studentAttendance] = await Promise.all([
          fetchStudents(),
          fetchGroups(),
          fetchGradesByStudent(studentId),
          fetchSubjects(),
          fetchAttendanceByStudent(studentId)
        ]);

        const currentStudent = allStudents.find(s => s.id === studentId);
        if (!currentStudent) {
          setError("No se encontró al estudiante.");
          return;
        }

        const currentGroup = allGroups.find(g => g.id === currentStudent.groupId) || null;

        setStudent(currentStudent);
        setGroup(currentGroup);
        setGrades(studentGrades);
        setSubjects(allSubjects);
        setAttendance(studentAttendance);

      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información del estudiante.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  if (isLoading) {
    return <p>Cargando perfil del estudiante...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!student) {
    return <p>Estudiante no encontrado.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Perfil de: {student.name}</h1>
          <p className="text-muted-foreground">Grupo: {group?.name || 'No asignado'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentGrades grades={grades} subjects={subjects} />
        <StudentAttendanceHistory attendanceRecords={attendance} subjects={subjects} />
      </div>

    </div>
  );
}
