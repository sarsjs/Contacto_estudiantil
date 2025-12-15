'use client';

import * as React from 'react';
import type { TimetableEntry, Subject, Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

type ScheduleGridProps = {
  schedule: TimetableEntry[];
  subjects: Subject[];
  groups?: Group[];
  title?: string;
  emptyLabel?: string;
  showGroup?: boolean;
};

type TimeRange = { start: string; end: string };

const parseRange = (range: string): TimeRange => {
  const [start, end] = range.split('-').map((value) => value.trim());
  return { start, end };
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const normalizeRange = (range: string) => {
  const { start, end } = parseRange(range);
  if (!start || !end) return '';
  return `${start} - ${end}`;
};

const sortByTime = (ranges: string[]) => {
  return ranges
    .map(normalizeRange)
    .filter(Boolean)
    .sort((a, b) => toMinutes(parseRange(a).start) - toMinutes(parseRange(b).start));
};

export function ScheduleGrid({ schedule, subjects, groups = [], title = 'Horario', emptyLabel = 'No hay clases registradas.', showGroup }: ScheduleGridProps) {
  const subjectLookup = React.useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((subject) => {
      map[subject.id] = subject.name;
    });
    return map;
  }, [subjects]);

  const groupLookup = React.useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach((group) => {
      map[group.id] = group.name;
    });
    return map;
  }, [groups]);

  const timeSlots = React.useMemo(() => {
    if (schedule.length === 0) return [];
    const unique = Array.from(new Set(schedule.map((entry) => normalizeRange(entry.time)))).filter(Boolean);
    return sortByTime(unique);
  }, [schedule]);

  const cellContent = (day: string, time: string) => {
    const matches = schedule.filter((entry) => entry.day === day && normalizeRange(entry.time) === time);
    if (matches.length === 0) return '--';
    return matches.map((entry) => {
      const subjectName = subjectLookup[entry.subjectId] || 'Materia';
      const groupName = groupLookup[entry.groupId];
      return (
        <div key={entry.id} className="space-y-1">
          <div className="font-semibold text-sm">{subjectName}</div>
          {showGroup && <p className="text-xs text-muted-foreground">{groupName || entry.groupId}</p>}
        </div>
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 || timeSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Hora</TableHead>
                {daysOfWeek.map((day) => (
                  <TableHead key={day} className="text-center">
                    {day}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((time) => (
                <TableRow key={time}>
                  <TableCell className="font-medium">{time}</TableCell>
                  {daysOfWeek.map((day) => (
                    <TableCell key={`${time}-${day}`} className="text-center">
                      {cellContent(day, time)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface StudentScheduleProps {
  schedule: TimetableEntry[];
  subjects: Subject[];
}

export function StudentSchedule({ schedule, subjects }: StudentScheduleProps) {
  return (
    <ScheduleGrid
      schedule={schedule}
      subjects={subjects}
      title="Mi horario de clases"
      emptyLabel="No hay clases registradas para tu grupo."
    />
  );
}
