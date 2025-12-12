'use client';

import * as React from 'react';
import { School, Users, User as UserIcon, FolderKanban, Send } from 'lucide-react';
import { StatCard } from './stat-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { MessageHistory } from './message-history'; 
import type { Group, User, Student, RecipientFilter } from '@/lib/types';
import { fetchUsers, fetchGroups, fetchStudents, addMessage } from "@/lib/firebase/data";
import { serverTimestamp } from 'firebase/firestore';

export function DirectorView() {
  const [staffList, setStaffList] = React.useState<User[]>([]);
  const [studentList, setStudentList] = React.useState<Student[]>([]);
  const [groupList, setGroupList] = React.useState<Group[]>([]);
  const [cycleList, setCycleList] = React.useState<string[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [recipientFilter, setRecipientFilter] = React.useState<RecipientFilter>("all");
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [reloadKey, setReloadKey] = React.useState(0);

  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    try {
      const [users, groupsData, studentsData] = await Promise.all([fetchUsers(), fetchGroups(), fetchStudents()]);
      setStaffList(users);
      setGroupList(groupsData);
      setStudentList(studentsData);
    } catch (error) {
      console.error("Error loading Firebase data", error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los datos del servidor.",
        variant: "destructive",
      });
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const uniqueCycles = Array.from(new Set(groupList.map((group) => group.cycleId))).filter(Boolean);
    setCycleList(uniqueCycles);
  }, [groupList]);

  const totalCycles = cycleList.length;
  const totalGroups = groupList.length;
  const counselorsList = staffList.filter((u) => u.role === "orientador");

  const handleSendMessage = async () => {
      if (!message) {
        toast({
            title: "Mensaje vacío",
            description: "No puedes enviar un mensaje vacío.",
        });
        return;
      }
      
      setIsSending(true);

      try {
        await addMessage({
          content: message,
          recipientFilter: recipientFilter,
          timestamp: serverTimestamp(),
        });

        toast({
            title: "Mensaje enviado",
            description: `Tu mensaje ha sido enviado a ${recipientFilter}.`,
        });
        setMessage("");
        setReloadKey(prevKey => prevKey + 1);

      } catch (error) {
          console.error("Error sending message:", error);
          toast({
              title: "Error al enviar mensaje",
              description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
              variant: "destructive",
          });
      } finally {
          setIsSending(false);
      }
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    toast({
        title: "Calendario Interactivo",
        description: "Funcionalidad para añadir eventos próximamente.",
    });
  };

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total del Personal"
            value={staffList.length.toString()}
            icon={Users}
            description="Profesores y Orientadores"
          />
          <StatCard
            title="Grupos Activos"
            value={totalGroups.toString()}
            icon={School}
            description="En todos los ciclos"
          />
          <StatCard
            title="Orientadores"
            value={counselorsList.length.toString()}
            icon={UserIcon}
            description="Gestionando grupos de estudiantes"
          />
          <StatCard
            title="Ciclos Escolares"
            value={totalCycles.toString()}
            icon={FolderKanban}
            description="Actuales y próximos"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Comunicados</CardTitle>
                        <CardDescription>Envía mensajes a toda la comunidad escolar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            placeholder="Escribe tu mensaje aquí..."
                            disabled={isSending}
                        />
                        <div className="flex items-center gap-4">
                            <Select value={recipientFilter} onValueChange={(value) => setRecipientFilter(value as RecipientFilter)} disabled={isSending}>
                                <SelectTrigger className="w-full md:w-1/2">
                                    <SelectValue placeholder="Enviar a..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="teachers">Solo Maestros</SelectItem>
                                    <SelectItem value="counselors">Solo Orientadores</SelectItem>
                                    <SelectItem value="students">Solo Alumnos</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSendMessage} disabled={isSending} className="w-full md:w-auto">
                                {isSending ? "Enviando..." : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Enviar
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <MessageHistory key={reloadKey} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Calendario Escolar</CardTitle>
                    <CardDescription>Gestiona los eventos y fechas importantes.</CardDescription>
                </CardHeader>
                <CardContent>
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
