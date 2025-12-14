'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  fetchEventsByDate,
  addEvent,
  deleteEvent,
} from '@/lib/firebase/data';
import type { CalendarEvent, UserRole } from '@/lib/types';

interface CalendarPanelProps {
  role: UserRole;
  className?: string;
}

export function CalendarPanel({ role, className }: CalendarPanelProps) {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const { toast } = useToast();

  const canAdd = role !== 'estudiante';
  const canDelete = role === 'director' || role === 'orientador';

  const formatDateKey = React.useCallback((target?: Date) => {
    const normalized = target ?? new Date();
    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    const day = String(normalized.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const selectedDateKey = React.useMemo(() => formatDateKey(selectedDate), [selectedDate, formatDateKey]);
  const formattedDayLabel = React.useMemo(
    () =>
      selectedDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [selectedDate]
  );

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchEventsByDate(selectedDateKey);
      setEvents(fetched);
    } catch (err) {
      console.error('Error loading events', err);
      setError('No se pudieron cargar los eventos para esta fecha.');
    } finally {
      setLoading(false);
    }
  }, [selectedDateKey]);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents, reloadKey]);

  const handleAddEvent = async () => {
    if (!newTitle.trim()) {
      toast({
        title: 'Título requerido',
        description: 'Agrega un nombre para el evento.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.email) {
      toast({
        title: 'Sesión requerida',
        description: 'Inicia sesión para registrar eventos.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await addEvent({
        title: newTitle.trim(),
        description: newDescription.trim(),
        date: selectedDateKey,
        createdBy: profile.email,
      });
      setNewTitle('');
      setNewDescription('');
      setReloadKey((prev) => prev + 1);
      toast({
        title: 'Evento agregado',
        description: 'El evento se guardó correctamente.',
      });
    } catch (err) {
      console.error('Error adding event', err);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el evento.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setReloadKey((prev) => prev + 1);
      toast({ title: 'Evento eliminado' });
    } catch (err) {
      console.error('Error deleting event', err);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el evento.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Calendario Escolar</CardTitle>
        <CardDescription>Consulta y administra eventos importantes.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] items-start">
        <div className="flex w-full justify-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(value) => value && setSelectedDate(value)}
            className="rounded-md border w-full max-w-[240px]"
          />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Eventos del día {formattedDayLabel}
          </p>
          {loading ? (
            <p>Cargando eventos...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay eventos agendados.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border p-3 bg-muted/50 flex justify-between gap-4 items-start"
                >
                  <div>
                    <p className="font-semibold text-sm">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canAdd && (
            <div className="space-y-2 pt-4 border-t border-muted/60">
              <h3 className="text-base font-semibold">Agregar evento</h3>
              <Input
                placeholder="Título del evento"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
              <Textarea
                placeholder="Descripción (opcional)"
                rows={3}
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
              <Button onClick={handleAddEvent} disabled={submitting} className="w-full">
                {submitting ? 'Guardando...' : 'Agregar evento'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
