'use client';

import * as React from 'react';
import {
  ClipboardList,
  Calendar,
  BookCopy,
  Users,
} from 'lucide-react';
import { StatCard } from './stat-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  fetchStudents,
  fetchGroups,
  fetchSubjects,
  fetchAllTimetables,
  fetchSecurityAlerts,
  addStudent,
  addTimetableEntry,
} from '@/lib/firebase/data';
import type { Student, Group, Subject, TimetableEntry, SecurityAlert, User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { SecurityAlerts } from './security-alerts';
import { IdCard } from './id-card';
import { MessagePanel } from './message-panel';
import { RealTimeAttendance } from './real-time-attendance';
import { NotificationPanel } from './notification-panel';

export function CounselorView({ currentUser }: { currentUser: User }) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [timetable, setTimetable] = React.useState<TimetableEntry[]>([]);
  const [securityAlerts, setSecurityAlerts] = React.useState<SecurityAlert[]>([]);
  const [loading, setLoading] = React.useState(true);

  const { toast } = useToast();
  const { profile } = useAuth();

  const assignedGroups = groups.filter((g) => g.counselorId === currentUser.id);
  const assignedGroupIds = assignedGroups.map((g) => g.id);

  const assignedStudents = students.filter((s) => assignedGroupIds.includes(s.groupId));
  const assignedStudentIds = assignedStudents.map((s) => s.id);
  const assignedTimetable = timetable.filter((t) => assignedGroupIds.includes(t.groupId));
  const assignedAlerts = securityAlerts.filter((a) => assignedStudentIds.includes(a.studentId));

  const totalStudents = assignedStudents.length;

  const [addStudentOpen, setAddStudentOpen] = React.useState(false);
  const [newStudentName, setNewStudentName] = React.useState('');
  const [newStudentEmail, setNewStudentEmail] = React.useState('');
  const [newStudentGroupId, setNewStudentGroupId] = React.useState(
    assignedGroupIds[0] ?? ''
  );

  const [addScheduleOpen, setAddScheduleOpen] = React.useState(false);
  const [newScheduleDay, setNewScheduleDay] = React.useState<TimetableEntry['day']>('Lunes');
  const [newScheduleTime, setNewScheduleTime] = React.useState('');
  const [newScheduleSubjectId, setNewScheduleSubjectId] = React.useState(
    subjects[0]?.id ?? ''
  );
  const [newScheduleGroupId, setNewScheduleGroupId] = React.useState(
    assignedGroupIds[0] ?? ''
  );

  const daysOfWeek: TimetableEntry['day'][] = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
  ];

  const loadData = React.useCallback(async () => {
    try {
      const [studentsData, groupsData, subjectsData, timetablesData, alertsData] = await Promise.all([
        fetchStudents(),
        fetchGroups(),
        fetchSubjects(),
        fetchAllTimetables(),
        fetchSecurityAlerts(),
      ]);
      setStudents(studentsData);
      setGroups(groupsData);
      setSubjects(subjectsData);
      setTimetable(timetablesData);
      setSecurityAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load data', error);
      toast({ title: 'Error', description: 'Failed to load data from the server.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStudent = async () => {
    if (!newStudentName || !newStudentGroupId || !newStudentEmail) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor ingresa el nombre, correo y selecciona un grupo.',
      });
      return;
    }
    const avatarSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;
    const gradeList = subjects.map((s) => ({ subjectId: s.id, grade: null }));

    try {
      await addStudent({
        name: newStudentName,
        email: newStudentEmail,
        avatarUrl,
        groupId: newStudentGroupId,
        grades: gradeList,
      });

      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentGroupId(assignedGroupIds[0] ?? '');
      setAddStudentOpen(false);
      toast({
        title: 'Estudiante inscrito',
        description: `Se inscribió a ${newStudentName}.`,
      });
      loadData();
    } catch (error) {
      console.error('Failed to add student', error);
      toast({ title: 'Error', description: 'Failed to inscribe the student.' });
    }
  };

  const handleAddSchedule = async () => {
    if (!newScheduleTime || !newScheduleSubjectId || !newScheduleGroupId) {
      toast({
        title: 'Datos incompletos',
        description: 'Completa todos los campos del horario.',
      });
      return;
    }

    try {
      await addTimetableEntry({
        groupId: newScheduleGroupId,
        subjectId: newScheduleSubjectId,
        day: newScheduleDay,
        time: newScheduleTime,
      });

      setNewScheduleDay('Lunes');
      setNewScheduleTime('');
      setNewScheduleSubjectId(subjects[0]?.id ?? '');
      setNewScheduleGroupId(assignedGroupIds[0] ?? '');
      setAddScheduleOpen(false);
      toast({
        title: 'Horario agregado',
        description: `Se agregó la clase al horario.`,
      });
      loadData();
    } catch (error) {
      console.error('Failed to add schedule', error);
      toast({ title: 'Error', description: 'Failed to add the schedule.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/20 rounded-full" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Cargando Panel de Orientación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Portal del Orientador </h1>
          <p className="text-muted-foreground font-medium">Control Escolar y Seguimiento de Grupos</p>
        </div>
        <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <span className="text-xs font-black uppercase text-primary">Gestión de Turno</span>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='Total de Estudiantes'
          value={totalStudents.toString()}
          icon={Users}
          description='En tus grupos gestionados'
        />
        <StatCard
          title='Grupos Gestionados'
          value={assignedGroups.length.toString()}
          icon={ClipboardList}
          description='Grupos bajo tu supervisión'
        />
        <StatCard
          title='Materias'
          value={subjects.length.toString()}
          icon={BookCopy}
          description='Disponibles en el plan de estudios'
        />
        <StatCard
          title='Clases Programadas'
          value={assignedTimetable.length.toString()}
          icon={Calendar}
          description='Total de clases por semana'
        />
      </div>

      {assignedAlerts.length > 0 && (
        <div className='grid grid-cols-1 gap-6'>
          <SecurityAlerts alerts={assignedAlerts} students={students} />
        </div>
      )}

      <RealTimeAttendance students={assignedStudents} />


      {profile?.role === 'orientador' && (
        <Card>
          <CardHeader>
            <CardTitle>Identificación digital</CardTitle>
            <CardDescription>Tu credencial oficial para el turno.</CardDescription>
          </CardHeader>
          <CardContent>
            <IdCard
              name={currentUser.name}
              role='Orientador'
              cycle='Orientación'
              avatarUrl={currentUser.avatarUrl}
              idLabel={currentUser.id.slice(0, 6).toUpperCase()}
            />
          </CardContent>
        </Card>
      )}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Inscripción de Estudiantes</CardTitle>
                <CardDescription>
                  Inscribe nuevos estudiantes y asígnalos a tus grupos.
                </CardDescription>
              </div>
              {/* Dialog for enrolling a new student */}
              <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                <DialogTrigger asChild>
                  <Button>Inscribir Estudiante</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inscribir Nuevo Estudiante</DialogTitle>
                    <DialogDescription>
                      Proporciona la información del estudiante para inscribirlo en uno de tus grupos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Nombre</label>
                      <Input
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder='Nombre del estudiante'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Email</label>
                      <Input
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        placeholder='Email del estudiante'
                        type='email'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Grupo</label>
                      <Select
                        value={newStudentGroupId}
                        onValueChange={(value) => setNewStudentGroupId(value)}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Seleccionar grupo' />
                        </SelectTrigger>
                        <SelectContent>
                          {assignedGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className='mt-4'>
                    <Button onClick={handleAddStudent}>Inscribir</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Grupo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedStudents.map((student) => {
                  const group = groups.find(g => g.id === student.groupId);
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-8 w-8'>
                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className='font-medium'>{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{group?.name || 'N/A'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Gestión de Horarios</CardTitle>
                <CardDescription>
                  Crea horarios y asigna materias a los profesores.
                </CardDescription>
              </div>
              {/* Dialog for adding a new schedule entry */}
              <Dialog open={addScheduleOpen} onOpenChange={setAddScheduleOpen}>
                <DialogTrigger asChild>
                  <Button>Nuevo Horario</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Horario</DialogTitle>
                    <DialogDescription>
                      Completa la información para programar una nueva clase.
                    </DialogDescription>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Día</label>
                      <Select
                        value={newScheduleDay}
                        onValueChange={(value) => setNewScheduleDay(value as TimetableEntry['day'])}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Seleccionar día' />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Hora</label>
                      <Input
                        value={newScheduleTime}
                        onChange={(e) => setNewScheduleTime(e.target.value)}
                        placeholder='Ej. 10:00 - 11:00'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Materia</label>
                      <Select
                        value={newScheduleSubjectId}
                        onValueChange={(value) => setNewScheduleSubjectId(value)}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Seleccionar materia' />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <label className='block text-sm font-medium'>Grupo</label>
                      <Select
                        value={newScheduleGroupId}
                        onValueChange={(value) => setNewScheduleGroupId(value)}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Seleccionar grupo' />
                        </SelectTrigger>
                        <SelectContent>
                          {assignedGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className='mt-4'>
                    <Button onClick={handleAddSchedule}>Agregar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead>Grupo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedTimetable.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day)).map((entry) => {
                  const subject = subjects.find(s => s.id === entry.subjectId);
                  const group = groups.find(g => g.id === entry.groupId);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className='font-medium'>{entry.day}</TableCell>
                      <TableCell>{entry.time}</TableCell>
                      <TableCell>{subject?.name || 'N/A'}</TableCell>
                      <TableCell>{group?.name || 'N/A'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <NotificationPanel />
      </div>

      <div className="grid grid-cols-1 gap-6">
      </div>
    </div>
  );
}
