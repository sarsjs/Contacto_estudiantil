'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  fetchSubjects,
  fetchGroupsBySubject,
  fetchStudentsByGroup,
  fetchAttendanceForDate,
  setAttendanceBatch,
  generateAttendanceToken,
  logActivity
} from '@/lib/firebase/data';
import type { Subject, Group, Student, Attendance } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShieldCheck, KeyRound, Timer } from 'lucide-react';

function AttendanceSheet({ students, groupId, subjectId }: { students: Student[], groupId: string, subjectId: string }) {
  const { profile } = useAuth();
  const [attendance, setAttendance] = React.useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeToken, setActiveToken] = React.useState<{ code: string; expiresAt: number } | null>(null);
  const [countdown, setCountdown] = React.useState(0);
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const handleStartAttendance = async () => {
    try {
      const token = await generateAttendanceToken(subjectId, groupId);
      setActiveToken({ code: token.code, expiresAt: Date.now() + 5 * 60 * 1000 });
      setCountdown(300); // 5 minutes

      // REGISTRO DE LOG
      await logActivity({
        action: 'ASISTENCIA_TOKEN',
        details: `Se generó código de asistencia (${token.code}) para el grupo ${groupId}.`,
        targetId: groupId,
        targetType: 'group',
        createdBy: profile?.id || 'system',
        creatorName: profile?.name || 'Profesor',
        creatorRole: 'profesor'
      });

      toast({
        title: "Pase de lista iniciado",
        description: "Los alumnos tienen 5 minutos para ingresar el código."
      });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo generar el código.", variant: "destructive" });
    }
  };

  React.useEffect(() => {
    if (countdown <= 0) {
      if (activeToken) setActiveToken(null);
      return;
    }
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, activeToken]);

  React.useEffect(() => {
    const loadAttendance = async () => {
      setIsLoading(true);
      const existingRecords = await fetchAttendanceForDate(today);
      const attendanceMap: Record<string, boolean> = {};
      students.forEach(student => {
        const record = existingRecords.find(r => r.studentId === student.id);
        attendanceMap[student.id] = record ? record.present : true; // Default to present
      });
      setAttendance(attendanceMap);
      setIsLoading(false);
    };

    loadAttendance();
  }, [students, today]);

  const handleSave = async () => {
    setIsSaving(true);
    const records: Omit<Attendance, "id">[] = Object.entries(attendance).map(([studentId, present]) => ({
      studentId,
      present,
      date: today,
      groupId,
      subjectId,
    }));

    try {
      await setAttendanceBatch(records);

      // REGISTRO DE LOG
      const presentCount = records.filter(r => r.present).length;
      await logActivity({
        action: 'ASISTENCIA_GUARDADA',
        details: `Pase de lista guardado: ${presentCount} alumnos presentes.`,
        targetId: groupId,
        targetType: 'group',
        createdBy: profile?.id || 'system',
        creatorName: profile?.name || 'Profesor',
        creatorRole: 'profesor'
      });

      toast({ title: "Asistencia Guardada", description: "El registro de asistencia se ha guardado correctamente." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error al guardar", description: "No se pudo guardar la asistencia.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p>Cargando lista de asistencia...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pase de Lista</CardTitle>
        <CardDescription>Marque a los alumnos ausentes. La lista es para el día de hoy: {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generador de Token */}
        <div className="bg-muted/30 p-5 rounded-2xl border border-border shadow-inner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-sm">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight">Token de Validación</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Seguridad Dinámica</p>
              </div>
            </div>

            {activeToken ? (
              <div className="flex items-center gap-6 bg-card px-6 py-3 rounded-2xl border border-border shadow-lg animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Código</span>
                  <span className="text-3xl font-black tracking-[0.3em] text-primary drop-shadow-sm">{activeToken.code}</span>
                </div>
                <div className="h-10 w-px bg-border mx-2" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Expira</span>
                  <div className="flex items-center gap-2 text-amber-600 font-black">
                    <Timer className="h-5 w-5 animate-pulse" />
                    <span className="text-xl tabular-nums">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleStartAttendance}
                className="bg-primary hover:bg-primary/90 text-[10px] uppercase font-black tracking-widest px-8 h-12 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Iniciar Fase Digital
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead className="text-right">Presente</TableHead></TableRow></TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell>{student.name}</TableCell>
                <TableCell className="text-right">
                  <Checkbox
                    checked={attendance[student.id] || false}
                    onCheckedChange={(checked) => {
                      setAttendance(prev => ({ ...prev, [student.id]: Boolean(checked) }))
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={handleSave} disabled={isSaving} className="mt-6 w-full">
          {isSaving ? "Guardando..." : "Guardar Asistencia"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const { profile: user } = useAuth();

  const [subject, setSubject] = React.useState<Subject | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch subject and associated groups
  React.useEffect(() => {
    if (!subjectId || !user) return;

    const loadInitialData = async () => {
      try {
        const [allSubjects, subjectGroups] = await Promise.all([
          fetchSubjects(),
          fetchGroupsBySubject(subjectId)
        ]);

        const currentSubject = allSubjects.find(s => s.id === subjectId) || null;
        if (!currentSubject) {
          setError("La materia no existe.");
          return;
        }

        setSubject(currentSubject);
        setGroups(subjectGroups);

        // Si solo hay un grupo, seleccionarlo automáticamente
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
  }, [subjectId, user]);

  // Fetch students when a group is selected
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asistencia para: {subject?.name}</h1>
      </div>

      {groups.length > 1 && !selectedGroup && (
        <Card>
          <CardHeader><CardTitle>Seleccionar Grupo</CardTitle><CardDescription>Esta materia se imparte a varios grupos. Por favor, selecciona a cuál quieres pasar lista.</CardDescription></CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedGroup}>
              <SelectTrigger><SelectValue placeholder="Elige un grupo..." /></SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name} - {group.cycleId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedGroup && students.length > 0 && (
        <AttendanceSheet students={students} groupId={selectedGroup} subjectId={subjectId} />
      )}

      {selectedGroup && students.length === 0 && (
        <p>No hay alumnos registrados en el grupo seleccionado.</p>
      )}
    </div>
  );
}
