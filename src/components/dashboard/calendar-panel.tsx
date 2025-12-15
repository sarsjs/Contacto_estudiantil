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
import type { CalendarEvent, CalendarVisibility, UserRole } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
  const [visibilitySelection, setVisibilitySelection] = React.useState<CalendarVisibility[]>([]);
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

  const visibleEvents = React.useMemo(() => {
    return events.filter((event) => {
      const audience = event.visibility && event.visibility.length > 0 ? event.visibility : ['todos'];
      if (audience.includes('todos')) return true;
      if (!profile) return false;
      if (audience.includes('personal')) {
        return event.createdBy === profile.email;
      }

      if (profile.role === 'director') {
        return true;
      }

      const roleKey: Record<UserRole, CalendarVisibility | null> = {
        director: null,
        orientador: 'orientadores',
        profesor: 'maestros',
        estudiante: 'alumnos',
      };

      const mapped = roleKey[profile.role];
      if (!mapped) return false;
      return audience.includes(mapped);
    });
  }, [events, profile?.email, profile?.role]);

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
        createdByRole: profile.role,
        visibility: visibilitySelection,
      });
      setNewTitle('');
      setNewDescription('');
      setVisibilitySelection([]);
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
      <CardContent className="grid gap-6 lg:grid-cols-[340px_1fr] items-start">
        <div className="flex flex-col">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(value) => value && setSelectedDate(value)}
            className="rounded-md border"
          />
        </div>
        <div className="space-y-6">
          {canAdd && (
            <div className="space-y-3 pt-4 border-t border-muted/60">
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">Visibilidad</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: 'orientadores', label: 'Orientadores' },
                    { value: 'maestros', label: 'Maestros' },
                    { value: 'alumnos', label: 'Alumnos' },
                    { value: 'todos', label: 'Todos' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted"
                    >
                      <Checkbox
                        checked={visibilitySelection.includes(option.value as CalendarVisibility)}
                        onCheckedChange={(checked) => {
                          setVisibilitySelection((prev) => {
                            const value = option.value as CalendarVisibility;
                            if (checked) {
                              return prev.includes(value) ? prev : [...prev, value];
                            }
                            return prev.filter((item) => item !== value);
                          });
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium leading-tight">{option.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.value === 'todos'
                            ? 'Será visible para toda la comunidad.'
                            : 'Solo visible para el rol seleccionado y quien lo crea.'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Si no marcas ninguna casilla, el evento quedará como personal (solo tú lo verás).
                </p>
              </div>

              <Button onClick={handleAddEvent} disabled={submitting} className="w-full">
                {submitting ? 'Guardando...' : 'Agregar evento'}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Eventos del día {formattedDayLabel}
            </p>
            {loading ? (
              <p>Cargando eventos...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="space-y-3">
                {visibleEvents.map((event) => {
                  const audience = event.visibility && event.visibility.length > 0 ? event.visibility : ['todos'];
                  return (
                    <div
                      key={event.id}
                      className="rounded-lg border p-3 bg-muted/50 flex justify-between gap-4 items-start"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-sm">{event.title}</p>
                          <Badge variant="secondary" className="text-[11px]">
                            {audience.includes('todos')
                              ? 'Todos'
                              : audience.includes('personal')
                                ? 'Solo quien lo creó'
                                : audience
                                    .map((value) => {
                                      if (value === 'orientadores') return 'Orientadores';
                                      if (value === 'maestros') return 'Maestros';
                                      if (value === 'alumnos') return 'Alumnos';
                                      return value;
                                    })
                                    .join(' · ')}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground leading-snug">{event.description}</p>
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
                  );
                })}
                {!loading && !error && visibleEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay eventos agendados para mostrar.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
