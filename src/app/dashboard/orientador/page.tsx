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
import { HelpCircle, Users } from 'lucide-react';
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Alta masiva de alumnos</CardTitle>
              <CardDescription>
                Descarga la plantilla, llénala con los datos básicos y súbela para registrar alumnos rápidamente.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9"
              onClick={() => document.getElementById('csv-tutorial-modal')?.classList.remove('hidden')}
            >
              <HelpCircle className="h-4 w-4" />
              Tutorial
            </Button>
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

      {/* CSV Tutorial Modal */}
      <div
        id="csv-tutorial-modal"
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden"
      >
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Tutorial: Importación Masiva de Alumnos</h3>
              <button
                onClick={() => document.getElementById('csv-tutorial-modal')?.classList.add('hidden')}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg mb-2">1. Descargar plantilla</h4>
                <p className="text-sm text-muted-foreground">
                  En la sección de importación masiva, haz clic en "Descargar plantilla" para obtener un archivo CSV con el formato correcto.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">2. Completar la plantilla</h4>
                <div className="bg-muted p-4 rounded-md text-sm">
                  <p className="font-medium mb-2">Formato requerido:</p>
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {`name,email,groupId
María López,mlopez@colegio.com,grupo-1-1
Juan Pérez,jperez@colegio.com,grupo-1-2`}
                  </pre>
                </div>
                <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                  <li><strong>name:</strong> Nombre completo del alumno</li>
                  <li><strong>email:</strong> Correo electrónico único del alumno</li>
                  <li><strong>groupId:</strong> ID del grupo al que pertenecerá el alumno</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">3. Validar datos</h4>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>Cada fila representa a un alumno</li>
                  <li>Asegúrate de que todos los campos sean obligatorios</li>
                  <li>El correo electrónico debe ser único para cada alumno</li>
                  <li>Los IDs de grupo deben existir en el sistema</li>
                  <li>No deben existir filas vacías</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">4. Importar archivo</h4>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>Haz clic en "Seleccionar archivo CSV"</li>
                  <li>Elige tu archivo completado</li>
                  <li>Espera a que se procese la importación</li>
                  <li>Revisa los resultados: se mostrará el número de alumnos registrados y posibles errores</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">Consejos importantes</h4>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>Evita caracteres especiales en los nombres</li>
                  <li>Verifica que los correos electrónicos tengan formato válido</li>
                  <li>Los alumnos importados recibirán un correo para restablecer su contraseña</li>
                  <li>Los IDs de grupo deben coincidir con los grupos existentes en el sistema</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-lg mb-2">Ejemplo completo</h4>
                <div className="bg-muted p-4 rounded-md text-sm">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {`name,email,groupId
María López,mlopez@colegio.com,grupo-1-1
Juan Pérez,jperez@colegio.com,grupo-1-1
Carlos Gómez,cgomez@colegio.com,grupo-1-2
Ana Torres,atorres@colegio.com,grupo-1-2`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
