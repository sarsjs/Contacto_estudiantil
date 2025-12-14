'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchStudentByEmail, fetchGradesByStudent, fetchSubjects } from '@/lib/firebase/data';
import type { Grade, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentGradesPage() {
  const { profile } = useAuth();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [subjectLookup, setSubjectLookup] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const loadGrades = async () => {
      try {
        setLoading(true);
        const studentRecord = await fetchStudentByEmail(profile.email);
        if (!studentRecord) {
          setError('No se encontró tu registro de estudiante.');
          return;
        }
        setStudent(studentRecord);

        const gradesData = await fetchGradesByStudent(studentRecord.id);
        setGrades(gradesData);

        const subjects = await fetchSubjects();
        const subjectMap: Record<string, string> = {};
        subjects.forEach((subject) => {
          subjectMap[subject.id] = subject.name;
        });
        setSubjectLookup(subjectMap);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar tus calificaciones.');
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, [profile]);

  if (loading) {
    return <p>Cargando calificaciones...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  const grouped = React.useMemo(() => {
    const map: Record<string, Grade[]> = {};
    grades.forEach((grade) => {
      if (!map[grade.subjectId]) {
        map[grade.subjectId] = [];
      }
      map[grade.subjectId].push(grade);
    });
    return map;
  }, [grades]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis calificaciones</h1>
        <p className="text-muted-foreground">Consulta tu desempeño por materia y parcial.</p>
      </div>
      {student ? (
        <Card>
          <CardHeader>
            <CardTitle>{student.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(grouped).length === 0 ? (
              <p>Aún no tienes calificaciones registradas.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([subjectId, gradesBySubject]) => (
                  <div key={subjectId}>
                    <p className="font-semibold">{subjectLookup[subjectId] || subjectId}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parcial</TableHead>
                          <TableHead>Calificación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradesBySubject.map((grade) => (
                          <TableRow key={`${grade.subjectId}-${grade.partial}`}>
                            <TableCell>{grade.partial}º</TableCell>
                            <TableCell>{grade.grade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <p>No se encontró tu registro.</p>
      )}
    </div>
  );
}
