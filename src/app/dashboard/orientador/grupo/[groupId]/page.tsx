'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchStudentsByGroup, fetchGroups } from '@/lib/firebase/data';
import type { Student, Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';

export default function GroupStudentsPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [students, setStudents] = React.useState<Student[]>([]);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!groupId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [studentsData, allGroups] = await Promise.all([
          fetchStudentsByGroup(groupId),
          fetchGroups(),
        ]);

        const currentGroup = allGroups.find(g => g.id === groupId) || null;
        setStudents(studentsData);
        setGroup(currentGroup);
        
        if (!currentGroup) {
            setError("El grupo que buscas no existe.");
        }

      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los datos de los alumnos.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [groupId]);

  if (isLoading) {
    return <p>Cargando alumnos...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/orientador" passHref>
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold">Alumnos del {group?.name}</h1>
                <p className="text-muted-foreground">Lista de estudiantes inscritos en este grupo.</p>
            </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total de Alumnos: {students.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Alumno</TableHead>
                <TableHead>Correo Electrónico</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="text-right">
                        <Link href={`/dashboard/orientador/alumno/${student.id}`} passHref>
                            <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2"/>
                                Ver Detalles
                            </Button>
                        </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No hay alumnos registrados en este grupo.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
