'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  fetchSubjects,
  fetchGroupsBySubject,
  fetchStudentsByGroup,
  fetchGradesBySubjectAndGroup,
  setGradeBatch,
  logActivity,
  assignBadgeToStudent
} from '@/lib/firebase/data';
import { useAuth } from '@/context/auth-context';
import type { Subject, Group, Student, Grade } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function GradeSheet({ students, groupId, subjectId, partial }: { students: Student[], groupId: string, subjectId: string, partial: 1 | 2 | 3 }) {
  const { profile } = useAuth();
  const [grades, setGrades] = React.useState<Record<string, number | string>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [selectedBadgeId, setSelectedBadgeId] = React.useState('');
  const [isAssigningBadge, setIsAssigningBadge] = React.useState(false);
  const { toast } = useToast();
  const badgeOptions = [
    { id: 'cerebro_grafeno', label: 'Cerebro de Grafeno' },
    { id: 'reloj_precision', label: 'Reloj de Precision' },
    { id: 'buscador_oro', label: 'Buscador de Oro' },
    { id: 'leyenda_escolar', label: 'Leyenda Escolar' },
  ];

  React.useEffect(() => {
    const loadGrades = async () => {
      setIsLoading(true);
      const existingGrades = await fetchGradesBySubjectAndGroup(subjectId, groupId);
      const gradeMap: Record<string, number> = {};
      students.forEach(student => {
        const record = existingGrades.find(g => g.studentId === student.id && g.partial === partial);
        gradeMap[student.id] = record ? record.grade : 0;
      });
      setGrades(gradeMap);
      setIsLoading(false);
    };

    loadGrades();
  }, [students, subjectId, groupId, partial]);

  const handleSave = async () => {
    setIsSaving(true);
    const recordsToSave: Omit<Grade, "id" | "createdAt">[] = Object.entries(grades).map(([studentId, grade]) => ({
      studentId,
      subjectId,
      groupId,
      partial,
      grade: Number(grade),
    }));

    try {
      await setGradeBatch(recordsToSave);

      // REGISTRO DE LOG
      await logActivity({
        action: 'CALIFICACIONES_GUARDADAS',
        details: `Se registraron calificaciones del ${partial}er parcial para el grupo ${groupId}.`,
        targetId: subjectId,
        targetType: 'subject',
        createdBy: profile?.id || 'system',
        creatorName: profile?.name || 'Profesor',
        creatorRole: 'profesor'
      });

      toast({ title: "Calificaciones Guardadas", description: "El registro se ha guardado correctamente." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error al guardar", description: "No se pudieron guardar las calificaciones.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    const numValue = value === '' ? '' : Math.max(0, Math.min(10, Number(value)));
    setGrades(prev => ({ ...prev, [studentId]: numValue }));
  };

  const handleAssignBadge = async () => {
    if (!selectedStudentId || !selectedBadgeId) return;
    setIsAssigningBadge(true);
    try {
      await assignBadgeToStudent(selectedStudentId, selectedBadgeId);
      const target = students.find(s => s.id === selectedStudentId);
      await logActivity({
        action: 'INSIGNIA_OTORGADA',
        details: `Insignia ${selectedBadgeId} otorgada a ${target?.name || selectedStudentId}.`,
        targetId: selectedStudentId,
        targetType: 'user',
        createdBy: profile?.id || 'system',
        creatorName: profile?.name || 'Profesor',
        creatorRole: 'profesor'
      });
      toast({ title: 'Insignia otorgada', description: 'Se actualizo el perfil del alumno.' });
      setSelectedStudentId('');
      setSelectedBadgeId('');
    } catch (err) {
      console.error(err);
      toast({ title: 'No se pudo asignar', description: 'Intenta nuevamente.', variant: 'destructive' });
    } finally {
      setIsAssigningBadge(false);
    }
  };

  if (isLoading) {
    return <p>Cargando hoja de calificaciones...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Calificaciones - {partial}er Parcial</CardTitle>
        <CardDescription>Introduzca la calificación (0-10) para cada alumno.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-lg border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-semibold">Otorgar insignia</p>
            <p className="text-xs text-muted-foreground">Selecciona un alumno y una insignia para otorgarla.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue placeholder="Selecciona alumno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue placeholder="Selecciona insignia" />
              </SelectTrigger>
              <SelectContent>
                {badgeOptions.map((badge) => (
                  <SelectItem key={badge.id} value={badge.id}>{badge.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssignBadge} disabled={!selectedStudentId || !selectedBadgeId || isAssigningBadge}>
              {isAssigningBadge ? 'Asignando...' : 'Otorgar'}
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead className="text-right">Calificación</TableHead></TableRow></TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell>{student.name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-24 float-right"
                    min={0}
                    max={10}
                    value={grades[student.id] || ''}
                    onChange={(e) => handleGradeChange(student.id, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={handleSave} disabled={isSaving} className="mt-6 w-full">
          {isSaving ? "Guardando..." : "Guardar Calificaciones"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function GradingPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = React.useState<Subject | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = React.useState<string>("");
  const [selectedPartial, setSelectedPartial] = React.useState<1 | 2 | 3 | 0>(0);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!subjectId) return;

    const loadInitialData = async () => {
      try {
        const [allSubjects, subjectGroups] = await Promise.all([
          fetchSubjects(),
          fetchGroupsBySubject(subjectId)
        ]);

        const currentSubject = allSubjects.find(s => s.id === subjectId);
        if (!currentSubject) {
          setError("La materia no existe.");
          return;
        }

        setSubject(currentSubject);
        setGroups(subjectGroups);

        if (subjectGroups.length === 1) {
          setSelectedGroup(subjectGroups[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Error al cargar la información.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [subjectId]);

  React.useEffect(() => {
    if (!selectedGroup) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      try {
        const studentData = await fetchStudentsByGroup(selectedGroup);
        setStudents(studentData);
      } catch (err) {
        console.error(err);
        setError("Error al cargar los alumnos.");
      }
    };
    loadStudents();
  }, [selectedGroup]);

  if (isLoading) {
    return <p>Cargando...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  const showGradingSheet = selectedGroup && selectedPartial > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calificar: {subject?.name}</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>1. Seleccionar Grupo</CardTitle></CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedGroup} value={selectedGroup} disabled={groups.length <= 1}>
              <SelectTrigger><SelectValue placeholder="Elige un grupo..." /></SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name} - {group.cycleId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Seleccionar Parcial</CardTitle></CardHeader>
          <CardContent>
            <Select
              onValueChange={(val) => setSelectedPartial(Number(val) as 1 | 2 | 3)}
              value={selectedPartial > 0 ? String(selectedPartial) : ''}
              disabled={!selectedGroup}
            >
              <SelectTrigger><SelectValue placeholder="Elige un parcial..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1er Parcial</SelectItem>
                <SelectItem value="2">2do Parcial</SelectItem>
                <SelectItem value="3">3er Parcial</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {showGradingSheet && students.length > 0 && (
        <GradeSheet students={students} groupId={selectedGroup} subjectId={subjectId} partial={selectedPartial} />
      )}

      {showGradingSheet && students.length === 0 && (
        <p>No hay alumnos registrados en el grupo seleccionado.</p>
      )}
    </div>
  );
}
