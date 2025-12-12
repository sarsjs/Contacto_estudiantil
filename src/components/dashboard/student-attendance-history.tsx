'use client';

import * as React from 'react';
import type { Attendance, Subject } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StudentAttendanceHistoryProps {
  attendanceRecords: Attendance[];
  subjects: Subject[];
}

export function StudentAttendanceHistory({ attendanceRecords, subjects }: StudentAttendanceHistoryProps) {
  
  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Materia Desconocida';
  };

  const totalAbsences = attendanceRecords.filter(record => !record.present).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Asistencia</CardTitle>
        <CardDescription>
            Total de Faltas Registradas: <span className="font-bold text-red-500">{totalAbsences}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attendanceRecords.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Materia</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {attendanceRecords.map(record => (
                        <TableRow key={record.id}>
                            <TableCell>{format(new Date(record.date), "d 'de' MMMM, yyyy", { locale: es })}</TableCell>
                            <TableCell>{getSubjectName(record.subjectId)}</TableCell>
                            <TableCell className="text-right">
                                {record.present ? (
                                    <Badge variant="default">Presente</Badge>
                                ) : (
                                    <Badge variant="destructive">Ausente</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        ) : (
            <p className="text-center text-muted-foreground">No hay registros de asistencia para este alumno.</p>
        )}
      </CardContent>
    </Card>
  );
}
