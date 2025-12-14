'use client';

import * as React from 'react';
import { fetchSubjects, fetchUsers, fetchGroups } from '@/lib/firebase/data';
import type { Subject, User, Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CounselorSubjectsPage() {
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [teachers, setTeachers] = React.useState<Record<string, string>>({});
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [subjectData, userData, groupData] = await Promise.all([
          fetchSubjects(),
          fetchUsers(),
          fetchGroups(),
        ]);
        setSubjects(subjectData);
        setGroups(groupData);
        const teacherMap: Record<string, string> = {};
        userData.forEach((user: User) => {
          teacherMap[user.id] = user.name;
        });
        setTeachers(teacherMap);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las materias.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <p>Cargando materias...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Materias del ciclo</h1>
        <p className="text-muted-foreground">Consulta las asignaturas disponibles y su responsable.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Materias</CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p>No hay materias registradas todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Grupos relacionados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => {
                  const relatedGroups = groups.filter((group) => group.id && group.counselorId);
                  return (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{teachers[subject.teacherId] || 'Sin asignar'}</TableCell>
                      <TableCell>
                        {relatedGroups.length > 0
                          ? relatedGroups.map((grp) => grp.name).join(', ')
                          : 'Sin grupos'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
