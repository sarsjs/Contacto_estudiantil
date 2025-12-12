'use client';

import * as React from 'react';
import type { Grade, Subject } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StudentGradesProps {
  grades: Grade[];
  subjects: Subject[];
}

interface GradeSummary {
    subjectName: string;
    partials: {
        1: number | null;
        2: number | null;
        3: number | null;
    };
    average: number | null;
}

export function StudentGrades({ grades, subjects }: StudentGradesProps) {

  const gradeSummary = React.useMemo(() => {
    const summary: Record<string, GradeSummary> = {};

    subjects.forEach(subject => {
        summary[subject.id] = {
            subjectName: subject.name,
            partials: { 1: null, 2: null, 3: null },
            average: null
        };
    });

    grades.forEach(grade => {
        if (summary[grade.subjectId]) {
            summary[grade.subjectId].partials[grade.partial] = grade.grade;
        }
    });

    Object.values(summary).forEach(item => {
        const validGrades = Object.values(item.partials).filter(g => g !== null) as number[];
        if (validGrades.length > 0) {
            const total = validGrades.reduce((acc, curr) => acc + curr, 0);
            item.average = parseFloat((total / validGrades.length).toFixed(1));
        } 
    });

    return Object.values(summary);
  }, [grades, subjects]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Calificaciones</CardTitle>
        <CardDescription>Aquí puedes ver tu progreso académico en cada materia.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Materia</TableHead>
              <TableHead className="text-center">1er Parcial</TableHead>
              <TableHead className="text-center">2do Parcial</TableHead>
              <TableHead className="text-center">3er Parcial</TableHead>
              <TableHead className="text-center font-bold">Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gradeSummary.map(summaryItem => (
              <TableRow key={summaryItem.subjectName}>
                <TableCell className="font-medium">{summaryItem.subjectName}</TableCell>
                <TableCell className="text-center">{summaryItem.partials[1] ?? '--'}</TableCell>
                <TableCell className="text-center">{summaryItem.partials[2] ?? '--'}</TableCell>
                <TableCell className="text-center">{summaryItem.partials[3] ?? '--'}</TableCell>
                <TableCell className="text-center font-semibold">{summaryItem.average ?? 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
