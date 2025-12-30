'use client';

import * as React from 'react';
import type { TimetableEntry, Subject, Group, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimetableManagerProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  groups: Group[];
  teachers: User[];
  onAddEntry: (entry: Omit<TimetableEntry, 'id'>) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  loading?: boolean;
}

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;
const defaultTimeSlots = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

type TimeRange = { start: string; end: string };

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const parseRange = (range: string): TimeRange => {
  const [start, end] = range.split('-').map((segment) => segment.trim());
  return { start, end };
};

const rangesOverlap = (a: TimeRange, b: TimeRange) => toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

const normalizeRange = (start: string, end: string) => `${start} - ${end}`;

export function TimetableManager({
  entries,
  subjects,
  groups,
  teachers,
  onAddEntry,
  onDeleteEntry,
  loading,
}: TimetableManagerProps) {
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = React.useState(groups[0]?.id || '');
  const [day, setDay] = React.useState<typeof daysOfWeek[number]>('Lunes');
  const [startTime, setStartTime] = React.useState(defaultTimeSlots[1]);
  const [endTime, setEndTime] = React.useState(defaultTimeSlots[2]);
  const [subjectId, setSubjectId] = React.useState(subjects[0]?.id || '');
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');

  React.useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [selectedGroupId, groups]);

  const teacherBySubject = React.useMemo(() => {
    return subjects.reduce<Record<string, string>>((acc, subject) => {
      acc[subject.id] = subject.teacherId;
      return acc;
    }, {});
  }, [subjects]);

  const teacherLabel = React.useMemo(() => {
    return teachers.reduce<Record<string, string>>((acc, teacher) => {
      acc[teacher.id] = teacher.name;
      return acc;
    }, {});
  }, [teachers]);

  const visibleEntries = React.useMemo(() => {
    const allowedGroups = new Set(groups.map((g) => g.id));
    return entries.filter((entry) => allowedGroups.has(entry.groupId));
  }, [entries, groups]);

  const selectedEntries = React.useMemo(() => {
    return visibleEntries.filter((entry) => entry.groupId === selectedGroupId);
  }, [visibleEntries, selectedGroupId]);

  const timetableByDay = React.useMemo(() => {
    const grouped: Record<string, TimetableEntry[]> = {};
    daysOfWeek.forEach((d) => {
      grouped[d] = selectedEntries
        .filter((entry) => entry.day === d)
        .sort((a, b) => {
          const rangeA = parseRange(a.time);
          const rangeB = parseRange(b.time);
          return toMinutes(rangeA.start) - toMinutes(rangeB.start);
        });
    });
    return grouped;
  }, [selectedEntries]);

  const detectConflict = (newEntry: Omit<TimetableEntry, 'id'>) => {
    const candidateRange = parseRange(newEntry.time);
    const teacherId = teacherBySubject[newEntry.subjectId];

    const conflict = entries.find((entry) => {
      if (entry.day !== newEntry.day) return false;
      const sameGroup = entry.groupId === newEntry.groupId;
      const sameTeacher = teacherId && teacherBySubject[entry.subjectId] === teacherId;
      if (!sameGroup && !sameTeacher) return false;
      return rangesOverlap(candidateRange, parseRange(entry.time));
    });

    if (!conflict) return null;

    if (conflict.groupId === newEntry.groupId) {
      return 'Ese grupo ya tiene una clase en ese horario.';
    }
    const conflictTeacher = teacherBySubject[conflict.subjectId];
    const teacherName = conflictTeacher ? teacherLabel[conflictTeacher] : 'el profesor asignado';
    return `El profesor ${teacherName} ya imparte una clase en ese horario.`;
  };

  const handleAdd = async () => {
    if (!subjectId || !selectedGroupId) {
      toast({
        title: 'Campos incompletos',
        description: 'Selecciona materia y grupo antes de agregar.',
        variant: 'destructive',
      });
      return;
    }

    const start = customStart || startTime;
    const end = customEnd || endTime;

    if (!start || !end) {
      toast({
        title: 'Horas faltantes',
        description: 'Define hora de inicio y fin.',
        variant: 'destructive',
      });
      return;
    }

    if (toMinutes(start) >= toMinutes(end)) {
      toast({
        title: 'Revisa el rango horario',
        description: 'La hora de inicio debe ser menor a la hora de fin.',
        variant: 'destructive',
      });
      return;
    }

    const timeRange = normalizeRange(start, end);
    const conflictMessage = detectConflict({
      groupId: selectedGroupId,
      subjectId,
      day,
      time: timeRange,
    });

    if (conflictMessage) {
      toast({
        title: 'Conflicto detectado',
        description: conflictMessage,
        variant: 'destructive',
      });
      return;
    }

    try {
      await onAddEntry({
        groupId: selectedGroupId,
        subjectId,
        day,
        time: timeRange,
      });
      setCustomStart('');
      setCustomEnd('');
      toast({
        title: 'Horario agregado',
        description: 'La clase se registró sin traslapes.',
      });
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: 'No se pudo agregar la clase. Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || 'Materia';
  const getGroupName = (id: string) => {
    const group = groups.find((g) => g.id === id);
    return group ? `${group.name} (${group.semester}°)` : 'Grupo';
  };

  const getTeacherName = (id?: string) => (id ? teacherLabel[id] || 'Profesor sin asignar' : 'Profesor sin asignar');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestor de horarios</CardTitle>
          <CardDescription>
            Crea horarios por grupo, evita empalmes de docente y consulta el día a día.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupo</label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.semester}°)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Día</label>
              <Select value={day} onValueChange={(value: typeof daysOfWeek[number]) => setDay(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un día" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Inicio</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="07:00" />
                </SelectTrigger>
                <SelectContent>
                  {defaultTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Personalizar (HH:MM)"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fin</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="08:00" />
                </SelectTrigger>
                <SelectContent>
                  {defaultTimeSlots.slice(1).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Personalizar (HH:MM)"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Materia</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Docente: {getTeacherName(teacherBySubject[subjectId])}
              </p>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} className="w-full" disabled={loading}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Agregar clase
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Los empalmes se bloquean si el grupo o el profesor ya tienen una clase en el mismo horario.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {daysOfWeek.map((d) => (
          <Card key={d} className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">{d}</CardTitle>
              <CardDescription>Clases del grupo seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 pr-2">
                <div className="space-y-3">
                  {timetableByDay[d].map((entry) => {
                    const teacherId = teacherBySubject[entry.subjectId];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between rounded-lg border p-3 bg-muted/40"
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">{entry.time}</div>
                          <div className="text-sm">{getSubjectName(entry.subjectId)}</div>
                          <p className="text-xs text-muted-foreground">{getTeacherName(teacherId)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDeleteEntry(entry.id)}
                          aria-label={`Eliminar clase ${entry.time}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {timetableByDay[d].length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin clases registradas.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de todo el horario</CardTitle>
          <CardDescription>Vista rápida para validar empalmes entre grupos y docentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <Badge
                key={group.id}
                variant={group.id === selectedGroupId ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedGroupId(group.id)}
              >
                {group.name}
              </Badge>
            ))}
          </div>
          <div className="grid gap-3">
            {selectedEntries
              .sort((a, b) => {
                const dayDiff = daysOfWeek.indexOf(a.day as typeof daysOfWeek[number]) -
                  daysOfWeek.indexOf(b.day as typeof daysOfWeek[number]);
                if (dayDiff !== 0) return dayDiff;
                return toMinutes(parseRange(a.time).start) - toMinutes(parseRange(b.time).start);
              })
              .map((entry) => {
                const subjectName = getSubjectName(entry.subjectId);
                const teacherId = teacherBySubject[entry.subjectId];
                return (
                  <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 bg-muted/30">
                    <Badge variant="secondary">{entry.day}</Badge>
                    <span className="text-sm font-semibold">{entry.time}</span>
                    <span className="text-sm">{subjectName}</span>
                    <Badge variant="outline">{getGroupName(entry.groupId)}</Badge>
                    <span className="text-xs text-muted-foreground">{getTeacherName(teacherId)}</span>
                  </div>
                );
              })}
            {selectedEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay horarios registrados para el grupo seleccionado.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
