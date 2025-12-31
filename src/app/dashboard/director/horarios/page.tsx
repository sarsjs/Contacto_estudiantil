'use client';

import * as React from 'react';
import { TimetableManager } from '@/components/dashboard/timetable-manager';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  addTimetableEntry,
  deleteTimetableEntry,
  fetchAllTimetables,
  fetchGroups,
  fetchSubjects,
  fetchUsers,
  logActivity,
} from '@/lib/firebase/data';
import type { TimetableEntry, Group, Subject, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DirectorSchedulesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<TimetableEntry[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [teachers, setTeachers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [allEntries, allGroups, allSubjects, users] = await Promise.all([
        fetchAllTimetables(),
        fetchGroups(),
        fetchSubjects(),
        fetchUsers(),
      ]);
      setEntries(allEntries);
      setGroups(allGroups);
      setSubjects(allSubjects);
      setTeachers(users.filter((u) => u.role === 'profesor'));
    } catch (error) {
      console.error(error);
      toast({
        title: 'No se pudo cargar el horario',
        description: 'Intenta recargar la página.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (entry: Omit<TimetableEntry, 'id'>) => {
    await addTimetableEntry(entry);

    // REGISTRO DE LOG
    const groupName = groups.find(g => g.id === entry.groupId)?.name || entry.groupId;
    const subjectName = subjects.find(s => s.id === entry.subjectId)?.name || entry.subjectId;

    await logActivity({
      action: 'HORARIO_CREADO',
      details: `Se asignó la clase ${subjectName} al grupo ${groupName} (${entry.day}, ${entry.time}).`,
      targetId: entry.groupId,
      targetType: 'timetable',
      createdBy: profile?.id || 'system',
      creatorName: profile?.name || 'Administrador',
      creatorRole: 'director'
    });

    await loadData();
  };

  const handleDelete = async (entryId: string) => {
    const entryToDelete = entries.find(e => e.id === entryId);
    await deleteTimetableEntry(entryId);

    // REGISTRO DE LOG
    if (entryToDelete) {
      const groupName = groups.find(g => g.id === entryToDelete.groupId)?.name || entryToDelete.groupId;
      const subjectName = subjects.find(s => s.id === entryToDelete.subjectId)?.name || entryToDelete.subjectId;

      await logActivity({
        action: 'HORARIO_ELIMINADO',
        details: `Se eliminó la clase ${subjectName} del grupo ${groupName} (${entryToDelete.day}, ${entryToDelete.time}).`,
        targetId: entryId,
        targetType: 'timetable',
        createdBy: profile?.id || 'system',
        creatorName: profile?.name || 'Administrador',
        creatorRole: 'director'
      });
    }

    await loadData();
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Horarios escolares</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Administra el horario completo de todos los grupos y valida traslapes entre materias y docentes.
          </p>
        </CardContent>
      </Card>

      <TimetableManager
        entries={entries}
        subjects={subjects}
        groups={groups}
        teachers={teachers}
        onAddEntry={handleAdd}
        onDeleteEntry={handleDelete}
        loading={loading}
      />
    </div>
  );
}
