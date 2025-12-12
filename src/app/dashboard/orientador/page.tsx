'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { fetchGroupsByCounselor, fetchUserByEmail, fetchStudentsByGroup } from '@/lib/firebase/data';
import type { Group } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

// Componente para mostrar un solo grupo
function GroupCard({ group, studentCount }: { group: Group; studentCount: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{group.name}</CardTitle>
        <CardDescription>{group.cycleId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <Users className="mr-2 h-5 w-5 text-gray-500" />
          <p>{studentCount} alumnos en este grupo.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/dashboard/orientador/grupo/${group.id}`} passHref>
          <Button className="w-full">Ver Alumnos</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Página principal del orientador
export default function OrientadorPage() {
  const { profile: user } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [studentCounts, setStudentCounts] = React.useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadCounselorData = async () => {
      if (!user || !user.email) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const currentUser = await fetchUserByEmail(user.email);
        if (!currentUser || currentUser.role !== 'orientador') {
          setError('No tienes permiso para ver esta página.');
          return;
        }

        const fetchedGroups = await fetchGroupsByCounselor(currentUser.id);
        setGroups(fetchedGroups);
        
        // Cargar el número de alumnos para cada grupo
        const counts: Record<string, number> = {};
        for (const group of fetchedGroups) {
            const studentsInGroup = await fetchStudentsByGroup(group.id);
            counts[group.id] = studentsInGroup.length;
        }
        setStudentCounts(counts);

      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos de los grupos.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCounselorData();
  }, [user]);

  if (isLoading) {
    return <p>Cargando tus grupos...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Grupos Asignados</h1>
        <p className="text-muted-foreground">
          Aquí puedes ver los grupos que tienes a tu cargo y gestionar a tus alumnos.
        </p>
      </div>

      {groups.length === 0 ? (
        <p>Aún no se te han asignado grupos. Contacta al director.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} studentCount={studentCounts[group.id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
