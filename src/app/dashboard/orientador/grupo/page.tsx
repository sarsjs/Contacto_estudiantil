'use client';

import * as React from 'react';
import Link from 'next/link';
import { fetchGroupsByCounselor, fetchStudentsByGroup } from '@/lib/firebase/data';
import { useAuth } from '@/context/auth-context';
import type { Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function CounselorGroupsPage() {
  const { profile: user } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [studentCounts, setStudentCounts] = React.useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user || user.role !== 'orientador') {
      setIsLoading(false);
      return;
    }

    const loadGroups = async () => {
      try {
        setIsLoading(true);
        const fetchedGroups = await fetchGroupsByCounselor(user.id);
        setGroups(fetchedGroups);

        const counts: Record<string, number> = {};
        await Promise.all(
          fetchedGroups.map(async (group) => {
            const students = await fetchStudentsByGroup(group.id);
            counts[group.id] = students.length;
          })
        );
        setStudentCounts(counts);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los grupos asignados.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [user]);

  if (isLoading) {
    return <p>Cargando grupos...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grupos a tu cargo</h1>
        <p className="text-muted-foreground">Revisa los alumnos inscritos y accede a la información del grupo.</p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent>No tienes grupos asignados todavía.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Listado de grupos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Alumnos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.cycleId}</TableCell>
                    <TableCell>{studentCounts[group.id] ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/orientador/grupo/${group.id}`}>{/* TODO: Link to group detail? */}
                        <Button variant="outline" size="sm">
                          Ver detalles
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
