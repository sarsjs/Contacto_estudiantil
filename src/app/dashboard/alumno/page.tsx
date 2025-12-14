'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import {
  fetchStudentByEmail,
  fetchTimetableByGroup,
  fetchSubjects,
  fetchGradesByStudent,
  uploadStudentPhoto,
  deleteStudentPhoto
} from '@/lib/firebase/data';
import type { Student, TimetableEntry, Subject, Grade } from '@/lib/types';
import { StudentSchedule } from '@/components/dashboard/student-schedule';
import { StudentGrades } from '@/components/dashboard/student-grades';
import { MessageHistory } from '@/components/dashboard/message-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Camera } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function AlumnoPage() {
  const { profile: user } = useAuth();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [schedule, setSchedule] = React.useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadStudentData = async () => {
      if (!user || !user.email) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const currentStudent = await fetchStudentByEmail(user.email);
        if (!currentStudent) {
          setError('No se encontró tu perfil de estudiante.');
          return;
        }
        setStudent(currentStudent);

        const allSubjects = await fetchSubjects();
        setSubjects(allSubjects);

        if (currentStudent.groupId) {
          const [timetableData, gradesData] = await Promise.all([
            fetchTimetableByGroup(currentStudent.groupId),
            fetchGradesByStudent(currentStudent.id),
          ]);
          setSchedule(timetableData);
          setGrades(gradesData);
        } else {
          setSchedule([]);
          setGrades([]);
        }

      } catch (err) {
        console.error(err);
        setError('No se pudo cargar tu información.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [user]);

  const { toast } = useToast();

  const handleDownloadCard = async () => {
    if (student) {
      try {
        toast({
          title: "Descarga en progreso",
          description: "La credencial se está preparando para descarga.",
        });
      } catch (error) {
        console.error('Error downloading card:', error);
        toast({
          title: "Error",
          description: "No se pudo descargar la credencial.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePhotoUpdate = async (photoUrl: string) => {
    if (student) {
      setStudent({
        ...student,
        avatarUrl: photoUrl
      });

      toast({
        title: "Foto actualizada",
        description: "La foto de tu credencial ha sido actualizada.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, {student?.name || 'Estudiante'}</h1>
        <p className="text-muted-foreground">Aquí puedes ver tu horario, calificaciones y comunicados.</p>
      </div>

      {student && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Tu Credencial Digital</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadCard}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Tomar Foto
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center">
          <Card className="w-80 h-52 border-2 border-gray-800 rounded-lg overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="flex h-full bg-white">
                {/* Lado izquierdo - Foto y datos */}
                <div className="w-2/5 bg-gray-100 flex flex-col items-center justify-center p-4">
                  <div className="w-16 h-16 rounded-full bg-gray-300 mb-2 overflow-hidden">
                    {student.avatarUrl ? (
                      <img
                        src={student.avatarUrl}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs">{student.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-1">
                    <div className="text-xs font-bold truncate max-w-full">{student.name}</div>
                    <div className="text-[8px] text-muted-foreground truncate max-w-full">{student.email}</div>
                  </div>
                </div>

                {/* Lado derecho - Información y código de verificación */}
                <div className="w-3/5 flex flex-col p-3">
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase">ESCUELA</div>
                    <div className="text-[10px] mt-1">Estudiante</div>
                    {student.matricula && (
                      <div className="text-[10px] mt-1">Matrícula: {student.matricula}</div>
                    )}
                    {student.groupId && (
                      <div className="text-[10px] mt-1">Grupo: {student.groupId}</div>
                    )}

                    <div className="text-[8px] mt-2 text-muted-foreground">
                      Alumno Activo
                    </div>
                  </div>

                  {/* Código de verificación */}
                  <div className="text-center">
                    <div className="text-[8px] font-mono bg-gray-100 p-1 rounded border">
                      {student.id.substring(0, 8).toUpperCase()}-E
                    </div>
                    <div className="text-[6px] text-center text-muted-foreground mt-1">
                      Cod: {student.id.substring(0, 8).toUpperCase()}-E
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Cargando tu información...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : student?.groupId ? (
        <div className="space-y-6">
            <StudentSchedule schedule={schedule} subjects={subjects} />
            <StudentGrades grades={grades} subjects={subjects} />
        </div>
      ) : (
        <p>Aún no estás asignado a un grupo. Tu horario y calificaciones aparecerán aquí cuando se te asigne uno.</p>
      )}

      <MessageHistory />

    </div>
  );
}
