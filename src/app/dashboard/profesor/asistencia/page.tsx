'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchSubjectsByTeacher } from '@/lib/firebase/data';
import type { Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function ProfessorAttendanceIndexPage() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const loadSubjects = async () => {
      try {
        setLoading(true);
        const fetched = await fetchSubjectsByTeacher(profile.id);
        setSubjects(fetched);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las materias.');
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, [profile]);

  if (loading) {
    return <p>Cargando materias...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asistencia</h1>
        <p className="text-muted-foreground">Selecciona una materia para registrar la asistencia.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Materias asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p>No tienes materias asignadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/profesor/asistencia/${subject.id}`}>
                        <Button variant="outline" size="sm">
                          Abrir lista
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
