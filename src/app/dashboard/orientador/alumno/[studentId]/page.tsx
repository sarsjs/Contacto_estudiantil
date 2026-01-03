'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchStudents,
  fetchGradesByStudent,
  fetchSubjects,
  fetchGroups,
  fetchAttendanceByStudent,
  assignBadgeToStudent,
  addBadgeSuggestion,
  logActivity
} from '@/lib/firebase/data';
import type { Student, Grade, Subject, Group, Attendance } from '@/lib/types';
import { StudentGrades } from '@/components/dashboard/student-grades';
import { StudentAttendanceHistory } from '@/components/dashboard/student-attendance-history';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const router = useRouter();
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();

  const [student, setStudent] = React.useState<Student | null>(null);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [badgeId, setBadgeId] = React.useState<string>('');
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [suggestionOpen, setSuggestionOpen] = React.useState(false);
  const [suggestedBadgeName, setSuggestedBadgeName] = React.useState('');
  const [suggestedBadgeNotes, setSuggestedBadgeNotes] = React.useState('');

  const badgeOptions = [
    { id: 'cerebro_grafeno', label: 'Cerebro de Grafeno' },
    { id: 'reloj_precision', label: 'Reloj de Precision' },
    { id: 'buscador_oro', label: 'Buscador de Oro' },
    { id: 'leyenda_escolar', label: 'Leyenda Escolar' },
  ];

  React.useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);

        const [allStudents, allGroups, studentGrades, allSubjects, studentAttendance] = await Promise.all([
          fetchStudents(),
          fetchGroups(),
          fetchGradesByStudent(studentId),
          fetchSubjects(),
          fetchAttendanceByStudent(studentId)
        ]);

        const currentStudent = allStudents.find(s => s.id === studentId);
        if (!currentStudent) {
          setError("No se encontró al estudiante.");
          return;
        }

        const currentGroup = allGroups.find(g => g.id === currentStudent.groupId) || null;

        setStudent(currentStudent);
        setGroup(currentGroup);
        setGrades(studentGrades);
        setSubjects(allSubjects);
        setAttendance(studentAttendance);

      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información del estudiante.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  if (isLoading) {
    return <p>Cargando perfil del estudiante...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!student) {
    return <p>Estudiante no encontrado.</p>
  }

  const handleAssignBadge = async () => {
    if (!badgeId || !student) return;
    setIsAssigning(true);
    try {
      await assignBadgeToStudent(student.id, badgeId);
      await logActivity({
        action: 'INSIGNIA_OTORGADA',
        details: `Insignia ${badgeId} otorgada a ${student.name}.`,
        targetId: student.id,
        targetType: 'user',
        createdBy: currentUser?.id || 'system',
        creatorName: currentUser?.name || 'Orientador',
        creatorRole: 'orientador'
      });
      toast({ title: 'Insignia otorgada', description: 'Se actualizo el perfil del alumno.' });
      setBadgeId('');
    } catch (err) {
      console.error(err);
      toast({ title: 'No se pudo asignar', description: 'Intenta nuevamente.', variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSuggestBadge = async () => {
    if (!suggestedBadgeName.trim()) {
      toast({ title: 'Falta nombre', description: 'Escribe la insignia sugerida.', variant: 'destructive' });
      return;
    }
    try {
      await addBadgeSuggestion({
        studentId: student.id,
        badgeName: suggestedBadgeName.trim(),
        notes: suggestedBadgeNotes.trim(),
        suggestedBy: currentUser?.id || 'system',
        suggestedByRole: currentUser?.role || 'orientador'
      });
      toast({ title: 'Sugerencia enviada', description: 'Se registro la sugerencia de insignia.' });
      setSuggestedBadgeName('');
      setSuggestedBadgeNotes('');
      setSuggestionOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'No se pudo enviar', description: 'Intenta nuevamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Perfil de: {student.name}</h1>
          <p className="text-muted-foreground">Grupo: {group?.name || 'No asignado'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentGrades grades={grades} subjects={subjects} />
        <StudentAttendanceHistory attendanceRecords={attendance} subjects={subjects} />
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Insignias</h2>
            <p className="text-sm text-muted-foreground">Otorga insignias al alumno o sugiere nuevas.</p>
          </div>
          <Dialog open={suggestionOpen} onOpenChange={setSuggestionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Sugerir insignia</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sugerir nueva insignia</DialogTitle>
                <DialogDescription>Esta sugerencia quedara registrada para revision.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Nombre de la insignia"
                  value={suggestedBadgeName}
                  onChange={(e) => setSuggestedBadgeName(e.target.value)}
                />
                <Textarea
                  placeholder="Motivo o detalles (opcional)"
                  value={suggestedBadgeNotes}
                  onChange={(e) => setSuggestedBadgeNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleSuggestBadge}>Enviar sugerencia</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Select value={badgeId} onValueChange={setBadgeId}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Selecciona una insignia" />
            </SelectTrigger>
            <SelectContent>
              {badgeOptions.map((badge) => (
                <SelectItem key={badge.id} value={badge.id}>{badge.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAssignBadge} disabled={!badgeId || isAssigning}>
            {isAssigning ? 'Asignando...' : 'Otorgar insignia'}
          </Button>
        </div>
      </div>

    </div>
  );
}
