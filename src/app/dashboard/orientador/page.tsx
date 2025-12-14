'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  fetchGroupsByCounselor,
  fetchStudentsByGroup,
  fetchUserByEmail,
  addStudent,
} from '@/lib/firebase/data';
import type { Group } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { MessagePanel } from '@/components/dashboard/message-panel';
import { CalendarPanel } from '@/components/dashboard/calendar-panel';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [studentCounts, setStudentCounts] = React.useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bulkResult, setBulkResult] = React.useState({ successCount: 0, errors: [] as string[] });
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadCounselorData = React.useCallback(async () => {
    if (!user || !user.email) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      setIsLoading(true);
      const currentUser = await fetchUserByEmail(user.email);
      if (!currentUser || currentUser.role !== 'orientador') {
        setError('No tienes permiso para ver esta página.');
        return;
      }

      const fetchedGroups = await fetchGroupsByCounselor(currentUser.id);
      setGroups(fetchedGroups);

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
  }, [user]);

  React.useEffect(() => {
    loadCounselorData();
  }, [loadCounselorData]);

  const handleDownloadTemplate = () => {
    const template = 'name,email,groupId\nMaría López,mlopez@colegio.com,grado-1-1\nJuan Pérez,jperez@colegio.com,grado-1-2';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla_alumnos.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setBulkResult({ successCount: 0, errors: [] });

    try {
      const content = await file.text();
      const rows = content.split(/\\r?\\n/).map((row) => row.trim()).filter(Boolean);
      if (rows.length <= 1) {
        toast({ title: 'Archivo vacío', description: 'Carga un archivo con datos.' });
        return;
      }

      const header = rows[0].split(',').map((cell) => cell.trim().toLowerCase());
      const nameIndex = header.indexOf('name');
      const emailIndex = header.indexOf('email');
      const groupIndex = header.indexOf('groupid');
      if (nameIndex < 0 || emailIndex < 0 || groupIndex < 0) {
        toast({
          title: 'Encabezado inválido',
          description: 'Asegúrate que las columnas sean name,email,groupId.',
          variant: 'destructive',
        });
        return;
      }

      let successCount = 0;
      const errors: string[] = [];
      for (let i = 1; i < rows.length; i += 1) {
        const values = rows[i].split(',').map((cell) => cell.trim());
        const name = values[nameIndex];
        const email = values[emailIndex];
        const groupId = values[groupIndex];

        if (!name || !email || !groupId) {
          errors.push(`Fila ${i + 1}: Faltan datos requeridos.`);
          continue;
        }

        try {
          await addStudent({
            name,
            email,
            groupId,
            avatarUrl: `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(name)}`,
          });
          successCount += 1;
        } catch (err) {
          console.error('Error agregando alumno', err);
          errors.push(`Fila ${i + 1}: ${String(err)}`);
        }
      }

      setBulkResult({ successCount, errors });
      if (successCount > 0) {
        toast({ title: 'Importación exitosa', description: `${successCount} alumnos agregados.` });
        await loadCounselorData();
      }
    } catch (err) {
      console.error('Lectura de archivo', err);
      toast({
        title: 'Error al procesar archivo',
        description: 'Revisa el formato e inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alta masiva de alumnos</CardTitle>
            <CardDescription>
              Descarga la plantilla, llénala con los datos básicos y súbela para registrar alumnos rápidamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Columnas obligatorias: <code>name,email,groupId</code>.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button variant="secondary" onClick={handleDownloadTemplate}>
                  Descargar plantilla
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? 'Procesando...' : 'Seleccionar archivo CSV'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            {bulkResult.successCount > 0 && (
              <p className="text-sm text-success-600">{bulkResult.successCount} alumnos agregados correctamente.</p>
            )}
            {bulkResult.errors.length > 0 && (
              <div className="space-y-1">
                {bulkResult.errors.map((errorMsg) => (
                  <p key={errorMsg} className="text-xs text-destructive">
                    {errorMsg}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Materias y horarios</CardTitle>
            <CardDescription>
              Vincula materias, docentes y horarios con tus grupos asignados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Revisa y ajusta los horarios y las materias para cada grupo desde los módulos dedicados.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/orientador/horarios" className="w-full lg:w-auto">
                <Button variant="outline" className="w-full">
                  Ver horarios
                </Button>
              </Link>
              <Link href="/dashboard/orientador/materias" className="w-full lg:w-auto">
                <Button variant="outline" className="w-full">
                  Ver materias
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MessagePanel />
        <CalendarPanel role="orientador" />
      </div>
    </div>
  );
}
