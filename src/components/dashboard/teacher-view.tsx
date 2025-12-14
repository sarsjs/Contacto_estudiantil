'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  fetchSubjects,
  fetchStudents,
  fetchUsers,
  fetchGroups,
  fetchAttendanceForDate,
  setAttendanceBatch,
  setGradeBatch,
  fetchGradesByStudent,
} from '@/lib/firebase/data';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAuth } from '@/context/auth-context';
import { IdCard } from '@/components/dashboard/id-card';
import type { Subject, Student, Group } from '@/lib/types';

export function TeacherView() {
  const { toast } = useToast();
  const { profile } = useAuth();

  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [attendanceState, setAttendanceState] = React.useState<{ [key: string]: boolean }>({});
  const [gradesState, setGradesState] = React.useState<{ [key: string]: number | '' }>({});

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const loadData = React.useCallback(async () => {
    if (!profile) return;
    try {
      const [subjectsData, studentsData, groupsData, attendanceData] = await Promise.all([
        fetchSubjects(),
        fetchStudents(),
        fetchGroups(),
        fetchAttendanceForDate(today),
      ]);

      const teacherSubjects = subjectsData.filter(s => s.teacherId === profile.id);
      setSubjects(teacherSubjects);
      setStudents(studentsData);
      setGroups(groupsData);

      const initialAttendance: { [key: string]: boolean } = {};
      studentsData.forEach(s => {
        const record = attendanceData.find(a => a.studentId === s.id);
        initialAttendance[s.id] = record?.present ?? true;
      });
      setAttendanceState(initialAttendance);

      const initialGrades: { [key: string]: number | '' } = {};
      studentsData.forEach(s => {
        teacherSubjects.forEach(subj => {
          const gradeObj = s.grades.find(g => g.subjectId === subj.id);
          initialGrades[`${s.id}-${subj.id}`] = gradeObj?.grade ?? '';
        });
      });
      setGradesState(initialGrades);

    } catch (error) {
      console.error('Failed to load teacher data', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  }, [profile, toast, today]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAttendanceChange = (studentId: string, value: boolean) => {
    setAttendanceState({ ...attendanceState, [studentId]: value });
  };

  const handleGradeChange = (studentId: string, subjectId: string, value: string) => {
    const parsed = value === '' ? '' : Number(value);
    if (parsed !== '' && (isNaN(parsed) || parsed < 0 || parsed > 100)) return;
    setGradesState({ ...gradesState, [`${studentId}-${subjectId}`]: parsed });
  };

  const handleSaveChanges = async () => {
    try {
      const attendanceRecords = Object.entries(attendanceState).map(([studentId, present]) => ({ studentId, date: today, present }));
      await setAttendanceBatch(attendanceRecords);

      // Prepare grade records for batch update
      const gradeRecords = [];
      for (const key in gradesState) {
        const [studentId, subjectId] = key.split('-');
        const gradeValue = gradesState[key];

        // Find the group for this student
        const student = students.find(s => s.id === studentId);
        if (student && student.groupId) {
          if (gradeValue !== '' && gradeValue !== null) {
            // Determine which partial (1, 2, or 3) this corresponds to
            // For now, we'll assume it's the current partial - in a real app, this would be more dynamic
            const partial = 1; // Should be determined based on current date or academic calendar
            gradeRecords.push({
              studentId,
              subjectId,
              grade: Number(gradeValue),
              partial: partial as 1 | 2 | 3,
              groupId: student.groupId
            });
          }
        }
      }

      if (gradeRecords.length > 0) {
        await setGradeBatch(gradeRecords);
      }

      toast({ title: 'Cambios guardados', description: 'La asistencia y calificaciones han sido registradas.' });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to save changes', error);
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios.' });
    }
  };

  const getStudentsForGroup = (groupId: string) => {
    return students.filter((s) => s.groupId === groupId);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Identificación digital</CardTitle>
            <CardDescription>Descarga tu credencial oficial.</CardDescription>
          </CardHeader>
          <CardContent>
            <IdCard
              name={profile.name}
              role="Profesor"
              cycle="Docencia"
              avatarUrl={profile.avatarUrl}
              idLabel={profile.id.slice(0, 6).toUpperCase()}
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Mis Clases</CardTitle>
          <CardDescription>Gestiona la asistencia y calificaciones de tus clases asignadas.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {subjects.map(subject => {
                    const associatedGroupIds = [...new Set(students.filter(s => s.grades.some(g => g.subjectId === subject.id)).map(s => s.groupId))];
                    const groupsForSubject = groups.filter(g => associatedGroupIds.includes(g.id));

                    return groupsForSubject.map(group => {
                        const studentsInGroup = getStudentsForGroup(group.id);
                        return (
                            <AccordionItem key={`${subject.id}-${group.id}`} value={`${subject.id}-${group.id}`}>
                                <AccordionTrigger className="text-lg font-semibold">{subject.name} - {group.name}</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-md mb-2">Asistencia - {new Date(today).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[80px]"></TableHead>
                                                    <TableHead>Nombre del Estudiante</TableHead>
                                                    <TableHead className="text-right">Presente</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentsInGroup.map((student) => {
                                                    const isPresent = attendanceState[student.id];
                                                    return (
                                                    <TableRow key={student.id}>
                                                        <TableCell>
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={student.avatarUrl} alt={student.name} />
                                                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        </TableCell>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Checkbox
                                                              checked={isPresent}
                                                              onCheckedChange={(checked) => handleAttendanceChange(student.id, Boolean(checked))}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-md mb-2">Ingresar Calificaciones</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nombre del Estudiante</TableHead>
                                                    <TableHead className="text-right w-[100px]">Calificación</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentsInGroup.map((student) => {
                                                    const gradeKey = `${student.id}-${subject.id}`;
                                                    const gradeValue = gradesState[gradeKey];
                                                    return (
                                                    <TableRow key={student.id}>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                              type="number"
                                                              value={gradeValue ?? ''}
                                                              onChange={(e) => handleGradeChange(student.id, subject.id, e.target.value)}
                                                              className="text-right"
                                                              placeholder="N/A"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="text-right">
                                        <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })
                })}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
