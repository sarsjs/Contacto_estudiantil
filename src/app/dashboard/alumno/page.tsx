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
import { DigitalIdCard } from '@/components/dashboard/digital-id-card';
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
            <DigitalIdCard
              user={student}
              schoolName="Escuela"
              verificationUrl={`${window.location.origin}/verify`}
              showCamera={true}
              onPhotoUpdate={handlePhotoUpdate}
            />
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
