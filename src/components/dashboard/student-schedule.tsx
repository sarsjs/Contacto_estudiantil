'use client';

import * as React from 'react';
import type { TimetableEntry, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StudentScheduleProps {
  schedule: TimetableEntry[];
  subjects: Subject[];
}

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const timeSlots = ['07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00'];

export function StudentSchedule({ schedule, subjects }: StudentScheduleProps) {
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Descanso';
  };

  const scheduleMatrix = timeSlots.map(time => {
    return daysOfWeek.map(day => {
      const entry = schedule.find(s => s.dayOfWeek === day && s.timeSlot === time);
      return entry ? getSubjectName(entry.subjectId) : '--';
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Horario de Clases</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Hora</TableHead>
              {daysOfWeek.map(day => (
                <TableHead key={day} className="text-center">{day}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeSlots.map((time, timeIndex) => (
              <TableRow key={time}>
                <TableCell className="font-medium">{time}</TableCell>
                {daysOfWeek.map((_, dayIndex) => (
                  <TableCell key={`${time}-${dayIndex}`} className="text-center">
                    {scheduleMatrix[timeIndex][dayIndex]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
