'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { fetchStudentByEmail, fetchGradesByStudent, fetchSubjects } from '@/lib/firebase/data';
import type { Grade, Student, Subject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { StudentGrades } from '@/components/dashboard/student-grades';
import { GraduationCap, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';

export default function StudentGradesPage() {
  const { profile } = useAuth();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const loadGrades = async () => {
      try {
        setLoading(true);
        const studentRecord = await fetchStudentByEmail(profile.email);

        if (!studentRecord) {
          setError('No encontramos tu expediente académico.');
          return;
        }

        setStudent(studentRecord);

        const [gradesData, subjectsData] = await Promise.all([
          fetchGradesByStudent(studentRecord.id),
          fetchSubjects()
        ]);

        setGrades(gradesData);
        setSubjects(subjectsData);

      } catch (err) {
        console.error("Error loading grades:", err);
        setError('Ocurrió un error al cargar tus calificaciones. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, [profile]);

  const stats = React.useMemo(() => {
    if (!grades.length) return null;
    const validGrades = grades.filter(g => g.grade !== null && g.grade !== undefined);
    if (!validGrades.length) return null;

    const average = validGrades.reduce((acc, curr) => acc + curr.grade!, 0) / validGrades.length;
    const maxGrade = Math.max(...validGrades.map(g => g.grade!));
    const minGrade = Math.min(...validGrades.map(g => g.grade!));

    return {
      average: average.toFixed(1),
      max: maxGrade,
      min: minGrade,
      total: validGrades.length
    };
  }, [grades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/20 rounded-full" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Cargando Calificaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold">Error de Carga</h3>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Historial Académico 🎓</h1>
          <p className="text-muted-foreground font-medium">Consulta detallada de desempeño</p>
        </div>
        <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <span className="text-xs font-black uppercase text-primary">Promedio General: {stats?.average || '0.0'}</span>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title="Promedio"
            value={stats.average}
            icon={TrendingUp}
            description="Acumulado del ciclo"
          />
          <StatCard
            title="Materias"
            value={subjects.length.toString()}
            icon={GraduationCap}
            description="Plan de estudios"
          />
          <StatCard
            title="Nota Más Alta"
            value={stats.max.toString()}
            icon={Award}
            description="Excelente desempeño"
          />
          <StatCard
            title="Evaluaciones"
            value={stats.total.toString()}
            icon={AlertCircle}
            description="Parciales registrados"
          />
        </div>
      )}

      {student ? (
        <StudentGrades grades={grades} subjects={subjects} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p>No se encontraron datos del estudiante.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
