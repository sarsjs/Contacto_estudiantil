"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  addMessage,
  fetchCounselorStudents,
  fetchGroups,
  fetchStudentCounselor,
  fetchStudentTeachers,
  fetchStudentTeachersByGroupId,
  fetchStudents,
  fetchTeacherStudents,
  fetchTimetableByTeacher,
  fetchUsers,
} from "@/lib/firebase/data";
// import { MessageHistory } from "./message-history"; // Missing file, using NotificationPanel or nothing for now
import type { Group, RecipientFilter, Student, User, UserRole } from "@/lib/types";

interface RecipientOption {
  value: RecipientFilter;
  label: string;
  needsTarget?: "group" | "student" | "teacher" | "counselor";
}

const ROLE_OPTIONS: Record<UserRole, RecipientOption[]> = {
  director: [
    { value: "all", label: "Todos" },
    { value: "personal", label: "Todo el personal" },
    { value: "teachers", label: "Solo maestros" },
    { value: "counselors", label: "Solo orientadores" },
    { value: "students", label: "Todos los alumnos" },
    { value: "group", label: "Grupo específico", needsTarget: "group" },
    { value: "student", label: "Estudiante específico", needsTarget: "student" },
    { value: "specificTeacher", label: "Maestro específico", needsTarget: "teacher" },
    {
      value: "specificCounselor",
      label: "Orientador específico",
      needsTarget: "counselor",
    },
  ],
  orientador: [
    { value: "director", label: "Solo Director" },
    { value: "counselors", label: "Otros orientadores" },
    { value: "teachers", label: "Maestros de mis grupos" },
    { value: "students", label: "Alumnos de mis grupos" },
    { value: "group", label: "Grupo específico", needsTarget: "group" },
    { value: "student", label: "Estudiante específico", needsTarget: "student" },
    { value: "specificTeacher", label: "Maestro específico", needsTarget: "teacher" },
  ],
  profesor: [
    { value: "director", label: "Solo Director" },
    { value: "specificCounselor", label: "Orientadores de mis grupos", needsTarget: "counselor" },
    { value: "students", label: "Mis alumnos" },
    { value: "group", label: "Grupo específico", needsTarget: "group" },
    { value: "student", label: "Estudiante específico", needsTarget: "student" },
  ],
  estudiante: [
    { value: "specificTeacher", label: "Mis profesores", needsTarget: "teacher" },
    { value: "specificCounselor", label: "Mi orientador", needsTarget: "counselor" },
    { value: "director", label: "Director" },
  ],
};

interface ScopedTargets {
  groups: Group[];
  students: Student[];
  teachers: User[];
  counselors: User[];
}

type MessagePanelProps = {
  showHistory?: boolean;
};

export function MessagePanel({ showHistory = true }: MessagePanelProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = React.useState("");
  const [recipient, setRecipient] = React.useState<RecipientOption | null>(null);
  const [targetId, setTargetId] = React.useState("");
  const [availableStudents, setAvailableStudents] = React.useState<Student[]>([]);
  const [availableGroups, setAvailableGroups] = React.useState<Group[]>([]);
  const [teacherTargets, setTeacherTargets] = React.useState<User[]>([]);
  const [counselorTargets, setCounselorTargets] = React.useState<User[]>([]);
  const [loadingTargets, setLoadingTargets] = React.useState(false);
  const [historyKey, setHistoryKey] = React.useState(0);

  React.useEffect(() => {
    const loadOptions = async () => {
      if (!profile) return;

      setLoadingTargets(true);
      try {
        const [studentsData, groupsData, usersData] = await Promise.all([
          fetchStudents(),
          fetchGroups(),
          fetchUsers(),
        ]);

        const teacherList = usersData.filter((user) => user.role === "profesor");
        const counselorList = usersData.filter((user) => user.role === "orientador");

        const scoped = await hydrateByRole(profile, {
          students: studentsData,
          groups: groupsData,
          teachers: teacherList,
          counselors: counselorList,
        });

        setAvailableStudents(scoped.students);
        setAvailableGroups(scoped.groups);
        setTeacherTargets(scoped.teachers);
        setCounselorTargets(scoped.counselors);
      } catch (error) {
        console.error("load message options", error);
        toast({
          title: "Error al cargar opciones",
          description: "No se pudieron obtener los datos para enviar mensajes.",
          variant: "destructive",
        });
      } finally {
        setLoadingTargets(false);
      }
    };

    loadOptions().catch((error) => console.error("load message options", error));
  }, [profile, toast]);

  if (!profile) {
    return null;
  }

  const roleKey = (profile.role ?? "estudiante") as UserRole;
  const options = React.useMemo(
    () => ROLE_OPTIONS[roleKey] ?? [{ value: "all", label: "Todos" }],
    [roleKey]
  );
  React.useEffect(() => {
    if (!recipient && options.length) {
      setRecipient(options[0]);
      setTargetId("");
    }
  }, [recipient, options]);
  const canSendMessages = Boolean(roleKey);

  const canTargetStudents = recipient?.needsTarget === "student";
  const canTargetGroups = recipient?.needsTarget === "group";
  const canTargetTeachers = recipient?.needsTarget === "teacher";
  const canTargetCounselors = recipient?.needsTarget === "counselor";

  React.useEffect(() => {
    if (!recipient?.needsTarget || !targetId) return;
    if (
      (canTargetGroups && !availableGroups.some((group) => group.id === targetId)) ||
      (canTargetStudents && !availableStudents.some((student) => student.id === targetId)) ||
      (canTargetTeachers && !teacherTargets.some((teacher) => teacher.id === targetId)) ||
      (canTargetCounselors && !counselorTargets.some((counselor) => counselor.id === targetId))
    ) {
      setTargetId("");
    }
  }, [recipient, availableGroups, availableStudents, teacherTargets, counselorTargets, targetId, canTargetGroups, canTargetStudents, canTargetTeachers, canTargetCounselors]);

  const resolveTargetLabel = () => {
    if (canTargetGroups) {
      return availableGroups.find((group) => group.id === targetId)?.name || targetId;
    }
    if (canTargetStudents) {
      return availableStudents.find((student) => student.id === targetId)?.name || targetId;
    }
    if (canTargetTeachers) {
      return teacherTargets.find((teacher) => teacher.id === targetId)?.name || targetId;
    }
    if (canTargetCounselors) {
      return counselorTargets.find((user) => user.id === targetId)?.name || targetId;
    }
    return undefined;
  };

  const handleSend = async () => {
    if (!canSendMessages) {
      toast({
        title: "Sin permisos para enviar",
        description: "Tu rol no permite enviar comunicados.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: "Mensaje vacío", description: "Escribe un mensaje." });
      return;
    }
    if (!recipient) {
      toast({ title: "Selecciona destinatario", description: "Elige una opción." });
      return;
    }
    if (recipient.needsTarget && !targetId) {
      toast({ title: "Selecciona un destinatario", variant: "destructive" });
      return;
    }

    try {
      const targetLabel = resolveTargetLabel();

      await addMessage({
        content: trimmed,
        recipientFilter: recipient?.value || "all",
        recipientLabel:
          recipient?.label +
          (targetLabel ? ` · ${targetLabel}` : ""),
        recipientId: targetId,
        createdBy: profile.email,
        createdByRole: profile.role,
      });

      setMessage("");
      setTargetId("");
      setHistoryKey((prev) => prev + 1);
      toast({ title: "Mensaje enviado" });
    } catch (error) {
      console.error("send message", error);
      const description = error instanceof Error ? error.message : "Intenta de nuevo.";
      toast({
        title: "Error al enviar",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Comunicados</CardTitle>
          <CardDescription>Envía mensajes a la comunidad escolar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe tu mensaje..."
          />
          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={recipient?.value ?? ""}
              onValueChange={(value) => {
                const option = options.find((opt) => opt.value === value) ?? null;
                setRecipient(option);
                setTargetId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona destinatario" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canTargetGroups && (
              <Select
                value={targetId}
                onValueChange={(value) => setTargetId(value)}
                disabled={availableGroups.length === 0 || loadingTargets}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona grupo" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canTargetStudents && (
              <Select
                value={targetId}
                onValueChange={(value) => setTargetId(value)}
                disabled={availableStudents.length === 0 || loadingTargets}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canTargetTeachers && (
              <Select
                value={targetId}
                onValueChange={(value) => setTargetId(value)}
                disabled={teacherTargets.length === 0 || loadingTargets}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona maestro" />
                </SelectTrigger>
                <SelectContent>
                  {teacherTargets.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canTargetCounselors && (
              <Select
                value={targetId}
                onValueChange={(value) => setTargetId(value)}
                disabled={counselorTargets.length === 0 || loadingTargets}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona orientador" />
                </SelectTrigger>
                <SelectContent>
                  {counselorTargets.map((counselor) => (
                    <SelectItem key={counselor.id} value={counselor.id}>
                      {counselor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button className="w-full" onClick={handleSend} disabled={!canSendMessages}>
            {canSendMessages ? "Enviar mensaje" : "Solo lectura"}
          </Button>
          {!canSendMessages && (
            <p className="text-xs text-muted-foreground">
              Tu rol no permite enviar comunicados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* {showHistory && <MessageHistory key={historyKey} />} */}
    </div>
  );
}

async function hydrateByRole(profile: User, base: ScopedTargets): Promise<ScopedTargets> {
  const scoped: ScopedTargets = {
    groups: base.groups,
    students: base.students,
    teachers: base.teachers,
    counselors: base.counselors,
  };

  if (profile.role === "director") {
    return scoped;
  }

  if (profile.role === "orientador" && profile.id) {
    const counselorGroups = base.groups.filter((group) => group.counselorId === profile.id);
    const students = await fetchCounselorStudents(profile.id);
    const teacherSets = await Promise.all(
      counselorGroups.map((group) => fetchStudentTeachersByGroupId(group.id))
    );

    scoped.groups = counselorGroups;
    scoped.students = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      groupId: student.groupId,
    }));
    scoped.teachers = dedupeUsers(teacherSets.flat(), "profesor");
    return scoped;
  }

  if (profile.role === "profesor" && profile.id) {
    const [teacherStudents, timetable] = await Promise.all([
      fetchTeacherStudents(profile.id),
      fetchTimetableByTeacher(profile.id),
    ]);
    const groupIds = Array.from(new Set(timetable.map((entry) => entry.groupId)));
    const teacherGroups = base.groups.filter((group) => groupIds.includes(group.id));
    const counselorsFromGroups = teacherGroups
      .map((group) => base.counselors.find((counselor) => counselor.id === group.counselorId))
      .filter(Boolean) as User[];

    scoped.groups = teacherGroups;
    scoped.students = teacherStudents.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      groupId: student.groupId,
    }));
    scoped.counselors = dedupeUsers(counselorsFromGroups, "orientador");
    return scoped;
  }

  if (profile.role === "estudiante") {
    const [teachers, counselor] = await Promise.all([
      fetchStudentTeachers(profile),
      fetchStudentCounselor(profile),
    ]);

    scoped.teachers = dedupeUsers(teachers, "profesor");
    scoped.counselors = counselor ? [counselor] : [];

    if (profile.groupId) {
      const group = base.groups.find((item) => item.id === profile.groupId);
      scoped.groups = group ? [group] : [];
    }

    return scoped;
  }

  return scoped;
}

function dedupeUsers(users: User[], role: UserRole) {
  const seen = new Set<string>();
  const filtered: User[] = [];

  for (const user of users) {
    if (user.role !== role) continue;
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    filtered.push(user);
  }

  return filtered;
}
