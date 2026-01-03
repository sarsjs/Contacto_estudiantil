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
  generateAttendanceToken,
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
import { StatCard } from '@/components/dashboard/stat-card';
import {
  KeyRound,
  Timer,
  ShieldCheck,
  Users,
  BookOpen,
  BarChart3,
  Calendar as CalendarIcon
} from 'lucide-react';
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
  const [activeToken, setActiveToken] = React.useState<{ code: string; expiresAt: number } | null>(null);
  const [countdown, setCountdown] = React.useState(0);

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

  const handleStartAttendance = async (subjectId: string, groupId: string) => {
    try {
      const token = await generateAttendanceToken(subjectId, groupId);
      setActiveToken({ code: token.code, expiresAt: Date.now() + 5 * 60 * 1000 });
      setCountdown(300); // 5 minutes
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/20 rounded-full" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Cargando Panel Docente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">App del Profesor </h1>
          <p className="text-muted-foreground font-medium">Gestión Académica y Pase de Lista Digital</p>
        </div>
        <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <span className="text-xs font-black uppercase text-primary">Ciclo Escolar 2024-2025</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tus Materias"
          value={subjects.length.toString()}
          icon={BookOpen}
          description="Carga académica actual"
        />
        <StatCard
          title="Total Alumnos"
          value={students.filter(s => subjects.some(subj => s.grades.some(g => g.subjectId === subj.id))).length.toString()}
          icon={Users}
          description="Alumnos bajo tu cargo"
        />
        <StatCard
          title="Clases de Hoy"
          value={subjects.length > 0 ? "2" : "0"} // Mock de ejemplo
          icon={CalendarIcon}
          description="Programadas para hoy"
        />
        <StatCard
          title="Rendimiento"
          value="8.4"
          icon={BarChart3}
          description="Promedio grupal"
        />
      </div>
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
                    <AccordionContent className="space-y-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                              <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm">Pase de Lista Seguro</h3>
                              <p className="text-xs text-muted-foreground">Genera un código dinámico para validar la presencia física.</p>
                            </div>
                          </div>

                          {activeToken ? (
                            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border shadow-sm">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Código</span>
                                <span className="text-2xl font-black tracking-widest text-primary">{activeToken.code}</span>
                              </div>
                              <div className="border-l pl-4 flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Expira en</span>
                                <div className="flex items-center gap-1 text-orange-600 font-bold">
                                  <Timer className="h-4 w-4" />
                                  <span>{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleStartAttendance(subject.id, group.id)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Iniciar Pase de Lista
                            </Button>
                          )}
                        </div>
                      </div>

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
