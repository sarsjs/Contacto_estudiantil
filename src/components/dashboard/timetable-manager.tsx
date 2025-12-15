'use client';

import * as React from 'react';
import type { TimetableEntry, Subject, Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimetableManagerProps {
  timetable: TimetableEntry[];
  subjects: Subject[];
  groups: Group[];
  onAddEntry: (entry: Omit<TimetableEntry, 'id'>) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
}

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;
const timeSlots = [
  '07:00 - 08:00',
  '08:00 - 09:00', 
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00'
];

export function TimetableManager({ 
  timetable, 
  subjects, 
  groups, 
  onAddEntry, 
  onDeleteEntry 
}: TimetableManagerProps) {
  const { toast } = useToast();
  const [newDay, setNewDay] = React.useState< typeof daysOfWeek[number]>('Lunes');
  const [newTime, setNewTime] = React.useState(timeSlots[0]);
  const [newSubjectId, setNewSubjectId] = React.useState(subjects[0]?.id || '');
  const [newGroupId, setNewGroupId] = React.useState(groups[0]?.id || '');
  const [customTime, setCustomTime] = React.useState('');

  const handleAdd = async () => {
    if (!newSubjectId || !newGroupId) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor selecciona una materia y un grupo.',
        variant: 'destructive',
      });
      return;
    }

    const timeToUse = customTime || newTime;
    
    try {
      await onAddEntry({
        groupId: newGroupId,
        subjectId: newSubjectId,
        day: newDay,
        time: timeToUse,
      });
      setCustomTime('');
      toast({
        title: 'Horario agregado',
        description: 'La clase ha sido añadida al horario.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar la clase al horario.',
        variant: 'destructive',
      });
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Materia desconocida';
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? `${group.name} (${group.semester}° semestre)` : 'Grupo desconocido';
  };

  const groupedEntries = React.useMemo(() => {
    const grouped: Record<string, TimetableEntry[]> = {};
    
    for (const day of daysOfWeek) {
      grouped[day] = timetable.filter(entry => entry.day === day);
    }
    
    return grouped;
  }, [timetable]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Asignar Horario a Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Día</label>
              <Select value={newDay} onValueChange={(value: any) => setNewDay(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Hora</label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Otra hora</label>
              <Input
                placeholder="Ej. 09:00 - 10:00"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Materia</label>
              <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupo</label>
              <Select value={newGroupId} onValueChange={setNewGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.semester}° semestre)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleAdd} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            Agregar Clase
          </Button>
        </CardContent>
      </Card>

      {daysOfWeek.map(day => (
        <Card key={day}>
          <CardHeader>
            <CardTitle>{day}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedEntries[day].map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.time}</TableCell>
                    <TableCell>{getSubjectName(entry.subjectId)}</TableCell>
                    <TableCell>{getGroupName(entry.groupId)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onDeleteEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {groupedEntries[day].length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay clases programadas para este día
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}