'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  fetchSubjects, 
  fetchGroupsBySubject, 
  fetchStudentsByGroup, 
  fetchAttendanceForDate, 
  setAttendanceBatch
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

function AttendanceSheet({ students, groupId, subjectId }: { students: Student[], groupId: string, subjectId: string }) {
  const [attendance, setAttendance] = React.useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

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
      <CardContent>
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
                      setAttendance(prev => ({...prev, [student.id]: Boolean(checked) }))
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
