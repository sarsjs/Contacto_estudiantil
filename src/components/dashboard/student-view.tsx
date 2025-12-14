"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { IdCard } from "@/components/dashboard/id-card";
import { MessagePanel } from "@/components/dashboard/message-panel";
import { CalendarPanel } from "@/components/dashboard/calendar-panel";
import {
  fetchStudentByEmail,
  fetchSubjects,
  fetchTimetableByGroup,
} from "@/lib/firebase/data";
import type { Student, TimetableEntry } from "@/lib/types";

const daysOfWeek: TimetableEntry["day"][] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

export function StudentView() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [timetable, setTimetable] = React.useState<TimetableEntry[]>([]);
  const [subjectsMap, setSubjectsMap] = React.useState<Record<string, string>>({});
  const [fetching, setFetching] = React.useState(false);
  const [attendedClasses, setAttendedClasses] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const loadSubjects = async () => {
      const subjects = await fetchSubjects();
      const map: Record<string, string> = {};
      subjects.forEach((subject) => {
        map[subject.id] = subject.name;
      });
      setSubjectsMap(map);
    };
    loadSubjects().catch((error) => console.error("load subjects", error));
  }, []);

  React.useEffect(() => {
    if (!profile || profile.role !== "estudiante" || !profile.email) {
      setStudent(null);
      setTimetable([]);
      return;
    }

    setFetching(true);
    fetchStudentByEmail(profile.email)
      .then(async (record) => {
        if (!record) {
          toast({
            title: "Perfil incompleto",
            description: "No encontramos tu ficha estudiantil en la base de datos.",
          });
          setStudent(null);
          setTimetable([]);
          return;
        }
        setStudent(record);
        const entries = await fetchTimetableByGroup(record.groupId);
        setTimetable(entries);
      })
      .catch((error) => {
        console.error("load student data", error);
        toast({
          title: "Error al cargar datos",
          description: "Intenta nuevamente más tarde.",
        });
      })
      .finally(() => setFetching(false));
  }, [profile, toast]);

  const handleAttendance = (entryId: string, subjectName: string) => {
    toast({
      title: "Verificación exitosa",
      description: `Asistencia registrada para ${subjectName}.`,
    });
    setAttendedClasses((prev) => new Set(prev).add(entryId));
  };

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando tu panel...</p>
      </div>
    );
  }

  if (!profile || profile.role !== "estudiante") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <CardTitle>Acceso restringido</CardTitle>
          <CardDescription>
            Este panel está disponible únicamente para estudiantes registrados.
          </CardDescription>
        </Card>
        <Button variant="secondary" onClick={() => signOut()}>
          Cerrar sesión
        </Button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No encontramos tu expediente. Contacta al orientador para actualizar tus datos.
        </p>
      </div>
    );
  }

  const subjectGrades = student.grades.map((gradeEntry) => ({
    ...gradeEntry,
    subjectName: subjectsMap[gradeEntry.subjectId] ?? "Materia",
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificación digital</CardTitle>
          <CardDescription>Guarda o comparte tu credencial oficial.</CardDescription>
        </CardHeader>
        <CardContent>
          <IdCard
            name={student.name}
            role="Estudiante"
            cycle={student.groupId}
            avatarUrl={student.avatarUrl}
            idLabel={student.id.slice(0, 6).toUpperCase()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis calificaciones</CardTitle>
          <CardDescription>Tu desempeño académico actual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materia</TableHead>
                <TableHead className="text-right">Calificación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectGrades.map((grade) => (
                <TableRow key={grade.subjectId}>
                  <TableCell className="font-medium">{grade.subjectName}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={`text-base ${
                        grade.grade
                          ? grade.grade >= 90
                            ? "bg-green-100 text-green-800"
                            : grade.grade >= 80
                              ? "bg-blue-100 text-blue-800"
                              : grade.grade >= 70
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {grade.grade ?? "N/A"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mi horario</CardTitle>
          <CardDescription>Planifica tu semana escolar.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {daysOfWeek.map((day) => (
              <div key={day} className="space-y-2">
                <h3 className="font-semibold text-center pb-2 border-b">{day}</h3>
                <div className="space-y-3 min-h-24">
                  {timetable
                    .filter((entry) => entry.day === day)
                    .map((entry) => {
                      const subjectName = subjectsMap[entry.subjectId] ?? "Materia";
                      const hasAttended = attendedClasses.has(entry.id);
                      return (
                        <div
                          key={entry.id}
                          className="p-3 rounded-lg bg-muted text-sm flex flex-col gap-2"
                        >
                          <div>
                            <p className="font-semibold">{subjectName}</p>
                            <p className="text-xs text-muted-foreground">{entry.time}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={hasAttended ? "secondary" : "default"}
                            onClick={() => handleAttendance(entry.id, subjectName)}
                            disabled={hasAttended}
                          >
                            {hasAttended ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" /> Presente
                              </>
                            ) : (
                              "Pase de lista"
                            )}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MessagePanel />
        <CalendarPanel role="estudiante" />
      </div>
    </div>
  );
}
