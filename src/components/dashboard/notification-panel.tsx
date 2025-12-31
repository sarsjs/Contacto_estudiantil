'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { fetchMessages, deleteMessage } from '@/lib/firebase/data';
import { Trash2 } from 'lucide-react';
import type { Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type TimestampLike = Date | { toDate: () => Date } | string | number | null | undefined;

const toDate = (timestamp: TimestampLike): Date => {
  if (!timestamp) {
    return new Date();
  }
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
};

function getRecipientText(recipient: string) {
  switch (recipient) {
    case 'all':
      return 'Para Todos';
    case 'teachers':
      return 'Solo Maestros';
    case 'counselors':
      return 'Solo Orientadores';
    case 'students':
      return 'Solo Alumnos';
    case 'personal':
      return 'Todo el personal';
    case 'director':
      return 'Solo Director';
    case 'group':
      return 'Grupo específico';
    case 'student':
      return 'Estudiante específico';
    case 'specificTeacher':
      return 'Maestro específico';
    case 'specificCounselor':
      return 'Orientador específico';
    default:
      return 'Desconocido';
  }
}

import { Bell, MapPin, Clock, Info, ShieldAlert } from 'lucide-react';

interface NotificationPanelProps {
  className?: string;
  integrityAlerts?: string[];
}

export function NotificationPanel({ className, integrityAlerts = [] }: NotificationPanelProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const fetchedMessages = await fetchMessages();
        setMessages(fetchedMessages);
      } catch (error) {
        console.error('Error loading messages', error);
        toast({
          title: 'Error al cargar notificaciones',
          description: 'No se pudieron obtener los datos de alertas.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [toast]);

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      toast({ title: 'Notificación eliminada' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la notificación.',
        variant: 'destructive'
      });
    }
  };

  const getAlertIcon = (content: string) => {
    const text = content.toLowerCase();
    if (text.includes('gps') || text.includes('fuera') || text.includes('cerca')) return <MapPin className="h-4 w-4 text-orange-500" />;
    if (text.includes('profesor') || text.includes('clase') || text.includes('tarde')) return <Clock className="h-4 w-4 text-blue-500" />;
    if (text.includes('integrid') || text.includes('🚨')) return <ShieldAlert className="h-4 w-4 text-red-600 animate-pulse" />;
    if (text.includes('error') || text.includes('alerta')) return <ShieldAlert className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className={`border-none shadow-md overflow-hidden h-full flex flex-col ${className}`}>
      <CardHeader className="bg-muted/50 border-b pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">NOTIFICACIONES</CardTitle>
        </div>
        <CardDescription>Alertas automáticas del sistema y avisos importantes.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1 min-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="animate-pulse">Sincronizando notificaciones...</p>
            </div>
          ) : messages.length === 0 && integrityAlerts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Bell className="h-6 w-6 opacity-20" />
              </div>
              <p>No tienes notificaciones pendientes.</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Alertas Sintéticas de Integridad */}
              {integrityAlerts.map((alert, idx) => (
                <div key={`integrity-${idx}`} className="p-6 bg-red-50/50 hover:bg-red-50 transition-colors flex gap-5 border-l-4 border-l-red-600">
                  <div className="mt-1.5 p-2 bg-white rounded-lg border border-red-100 shadow-sm self-start">
                    {getAlertIcon(alert)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-sm font-bold leading-relaxed text-red-900">{alert}</p>
                      <Link href="/dashboard/director/integridad">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-red-600 hover:text-red-700 hover:bg-red-100 p-0 px-2 h-auto">
                          Arreglar
                        </Button>
                      </Link>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-black text-red-400 tracking-wider font-mono">
                        SISTEMA • TIEMPO REAL
                      </span>
                      <Badge className="bg-red-600 text-[9px] uppercase font-black px-2 py-0 h-5">
                        CRÍTICO
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mensajes Normales */}
              {messages.map((msg) => (
                <div key={msg.id} className="p-6 hover:bg-muted/50 transition-colors flex gap-5">
                  <div className="mt-1.5 p-2 bg-card rounded-lg border border-border shadow-sm self-start">
                    {getAlertIcon(msg.content)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-sm font-medium leading-relaxed text-foreground bg-card/50 rounded-lg p-1 -m-1">{msg.content}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-full flex-shrink-0"
                        onClick={() => handleDeleteMessage(msg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-muted-foreground tracking-wider">
                          {format(toDate(msg.timestamp), "d MMM, HH:mm", { locale: es }).toUpperCase()}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] uppercase font-black px-2 py-0 h-5 border-none bg-muted text-muted-foreground tracking-tighter">
                        {msg.recipientLabel ?? getRecipientText(msg.recipientFilter)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
