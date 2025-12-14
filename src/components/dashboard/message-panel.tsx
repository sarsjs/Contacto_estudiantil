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
import { fetchGroups, fetchStudents, addMessage } from "@/lib/firebase/data";
import { MessageHistory } from "./message-history";
import type { RecipientFilter, UserRole } from "@/lib/types";

type RecipientOption = {
  value: RecipientFilter;
  label: string;
  needsTarget?: "group" | "student";
};

const ROLE_OPTIONS: Record<UserRole, RecipientOption[]> = {
  director: [
    { value: "all", label: "Todos" },
    { value: "teachers", label: "Maestros" },
    { value: "counselors", label: "Orientadores" },
    { value: "students", label: "Alumnos" },
  ],
  orientador: [
    { value: "director", label: "Solo Director" },
    { value: "teachers", label: "Maestros" },
    { value: "students", label: "Alumnos" },
    { value: "group", label: "Grupo específico", needsTarget: "group" },
    { value: "student", label: "Estudiante específico", needsTarget: "student" },
  ],
  profesor: [
    { value: "director", label: "Solo Director" },
    { value: "counselors", label: "Orientadores" },
    { value: "group", label: "Grupo específico", needsTarget: "group" },
    { value: "student", label: "Estudiante específico", needsTarget: "student" },
  ],
  estudiante: [
    { value: "teachers", label: "Maestros" },
    { value: "counselors", label: "Orientador" },
    { value: "director", label: "Director" },
  ],
};

export function MessagePanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = React.useState("");
  const [recipient, setRecipient] = React.useState<RecipientOption | null>(null);
  const [targetId, setTargetId] = React.useState("");
  const [students, setStudents] = React.useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = React.useState<{ id: string; name: string }[]>([]);
  const [historyKey, setHistoryKey] = React.useState(0);

  React.useEffect(() => {
    const loadOptions = async () => {
      const [studentsData, groupsData] = await Promise.all([fetchStudents(), fetchGroups()]);
      setStudents(studentsData.map((student) => ({ id: student.id, name: student.name })));
      setGroups(groupsData.map((group) => ({ id: group.id, name: group.name })));
    };
    loadOptions().catch((error) => console.error("load message options", error));
  }, []);

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
  }, [options, recipient]);

  const canTargetStudents = recipient?.needsTarget === "student";
  const canTargetGroups = recipient?.needsTarget === "group";

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: "Mensaje vacío", description: "Escribe un mensaje." });
      return;
    }
    if (!recipient) {
      toast({ title: "Selecciona destinatario", description: "Elige una opción." });
      return;
    }
    if ((canTargetGroups || canTargetStudents) && !targetId) {
      toast({ title: "Selecciona un objetivo", variant: "destructive" });
      return;
    }

    try {
      const targetLabel =
        recipient?.needsTarget === "group"
          ? groups.find((group) => group.id === targetId)?.name || targetId
          : recipient?.needsTarget === "student"
          ? students.find((student) => student.id === targetId)?.name || targetId
          : undefined;

      await addMessage({
        content: trimmed,
        recipientFilter: recipient?.value || "all",
        recipientLabel:
          recipient?.label +
          (targetLabel ? ` · ${targetLabel}` : ""),
        recipientId: targetId || undefined,
      });

      setMessage("");
      setTargetId("");
      setHistoryKey((prev) => prev + 1);
      toast({ title: "Mensaje enviado" });
    } catch (error) {
      console.error("send message", error);
      toast({
        title: "Error al enviar",
        description: "Intenta de nuevo.",
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
              <Select value={targetId} onValueChange={(value) => setTargetId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canTargetStudents && (
              <Select value={targetId} onValueChange={(value) => setTargetId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button className="w-full" onClick={handleSend}>
            Enviar mensaje
          </Button>
        </CardContent>
      </Card>

      <MessageHistory key={historyKey} />
    </div>
  );
}
