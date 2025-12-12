'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { fetchSubjectsByTeacher, fetchUserByEmail } from '@/lib/firebase/data';
import type { Subject } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BookMarked, ClipboardCheck } from 'lucide-react';

// Componente para una sola materia
function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center">
                <BookMarked className="mr-3 h-8 w-8 text-gray-400" />
                <div>
                    <CardTitle>{subject.name}</CardTitle>
                    <CardDescription>Materia Asignada</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Link href={`/dashboard/profesor/asistencia/${subject.id}`} passHref>
          <Button variant="outline" className="w-full">Pasar Lista</Button>
        </Link>
        <Link href={`/dashboard/profesor/calificaciones/${subject.id}`} passHref>
          <Button className="w-full">Calificar</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Página principal del profesor
export default function ProfesorPage() {
  const { profile: user } = useAuth();
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadTeacherData = async () => {
      if (!user || !user.email) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const currentUser = await fetchUserByEmail(user.email);
        if (!currentUser || currentUser.role !== 'profesor') {
          setError('No tienes permiso para ver esta página.');
          return;
        }

        const fetchedSubjects = await fetchSubjectsByTeacher(currentUser.id);
        setSubjects(fetchedSubjects);

      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar tus materias.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeacherData();
  }, [user]);

  if (isLoading) {
    return <p>Cargando tus materias...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Materias</h1>
        <p className="text-muted-foreground">
          Gestiona la asistencia y calificaciones de los alumnos en tus materias.
        </p>
      </div>

      {subjects.length === 0 ? (
        <p>Aún no se te han asignado materias. Contacta al director.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
