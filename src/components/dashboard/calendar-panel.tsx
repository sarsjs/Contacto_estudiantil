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
import { Badge } from '@/components/ui/badge';
import { SEP_CALENDAR_2025_2026, getSepEvent } from '@/lib/sep-calendar';
import { fetchEventsByDate, fetchAllEvents, addEvent, deleteEvent } from '@/lib/firebase/data';
import { AlertCircle, Calendar as CalendarIcon, Info } from 'lucide-react';
import type { CalendarEvent, CalendarVisibility, UserRole } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CalendarPanelProps {
  role: UserRole;
  className?: string;
}

export function CalendarPanel({ role, className }: CalendarPanelProps) {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [visibilitySelection, setVisibilitySelection] = React.useState<CalendarVisibility[]>([]);
  const { toast } = useToast();

  const canAdd = true;
  const canSetVisibility = role !== 'estudiante' && role !== 'alumno';
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
      const [fetched, all] = await Promise.all([
        fetchEventsByDate(selectedDateKey),
        fetchAllEvents()
      ]);
      setEvents(fetched);
      setAllEvents(all);
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
    const userEvents = events.filter((event) => {
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
        alumno: 'alumnos',
      };

      const mapped = roleKey[profile.role];
      if (!mapped) return false;
      return audience.includes(mapped);
    });

    return userEvents;
  }, [events, profile?.email, profile?.role]);

  const sepEvent = React.useMemo(() => getSepEvent(selectedDate), [selectedDate]);

  const calendarModifiers = React.useMemo(() => {
    // Filtrar todos los eventos que son visibles para el usuario actual
    const filteredAll = allEvents.filter(event => {
      const audience = event.visibility && event.visibility.length > 0 ? event.visibility : ['todos'];
      if (audience.includes('todos')) return true;
      if (!profile) return false;
      if (audience.includes('personal')) return event.createdBy === profile.email;
      if (profile.role === 'director') return true;

      const roleKey: Record<string, string> = { orientador: 'orientadores', profesor: 'maestros', estudiante: 'alumnos', alumno: 'alumnos' };
      return audience.includes(roleKey[profile.role]);
    });

    const eventDates = filteredAll.map(e => e.date);
    const privateEventDates = filteredAll.filter(e => e.visibility?.includes('personal') || !e.visibility?.length).map(e => e.date);

    return {
      cte: SEP_CALENDAR_2025_2026.filter(e => e.type === 'cte').map(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      }),
      suspension: SEP_CALENDAR_2025_2026.filter(e => e.type === 'suspension').map(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      }),
      vacation: SEP_CALENDAR_2025_2026.filter(e => e.type === 'vacation').map(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      }),
      taller: SEP_CALENDAR_2025_2026.filter(e => e.type === 'taller').map(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      }),
      has_event: eventDates.map(dStr => {
        const [y, m, d] = dStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      }),
      has_private_event: privateEventDates.map(dStr => {
        const [y, m, d] = dStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      })
    };
  }, [allEvents, profile]);

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
      const finalVisibility = canSetVisibility ? visibilitySelection : ['personal'];
      await addEvent({
        title: newTitle.trim(),
        description: newDescription.trim(),
        date: selectedDateKey,
        createdBy: profile.email,
        createdByRole: profile.role,
        visibility: finalVisibility,
      });
      setNewTitle('');
      setNewDescription('');
      setVisibilitySelection(canSetVisibility ? [] : ['personal']);
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
        <CardTitle>Eventos</CardTitle>
        <CardDescription>Consulta y administra eventos importantes.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[340px_1fr] items-start">
        <div className="flex flex-col gap-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(value) => value && setSelectedDate(value)}
            className="rounded-xl border shadow-sm bg-card"
            modifiers={calendarModifiers}
          />

          <div className="bg-muted/30 rounded-xl p-4 border border-muted/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leyenda</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full border-2 border-pink-400 bg-pink-50" />
                <span>Consejo Técnico (CTE)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-zinc-900" />
                <span>Suspensión de labores</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-md bg-zinc-100" />
                <span>Vacaciones / Receso</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Evento escolar</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Evento personal</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {canAdd && (
            <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight">Crear Nuevo Evento</h3>
              </div>

              <div className="grid gap-3">
                <Input
                  className="bg-background border-input focus:ring-primary/20"
                  placeholder="Título del evento"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
                <Textarea
                  className="bg-background border-input focus:ring-primary/20"
                  placeholder="Descripción (opcional)"
                  rows={2}
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                />
              </div>

              {canSetVisibility ? (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Alcance de Visibilidad</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { value: 'orientadores', label: 'Orientadores' },
                      { value: 'maestros', label: 'Maestros' },
                      { value: 'alumnos', label: 'Alumnos' },
                      { value: 'todos', label: 'Todos' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-start gap-2 rounded-xl border border-border bg-background p-3 hover:bg-muted/50 transition-colors shadow-sm cursor-pointer"
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
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight text-slate-700">{option.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic pl-1">
                    * Si no seleccionas nada, el evento será privado.
                  </p>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground font-medium italic pl-1">
                  * Solo puedes crear eventos personales.
                </div>
              )}

              <Button onClick={handleAddEvent} disabled={submitting} className="w-full shadow-lg shadow-primary/20 font-bold uppercase tracking-widest text-[10px] h-10">
                {submitting ? 'Sincronizando...' : 'Publicar Evento'}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Agenda para el {formattedDayLabel}
              </p>
              {sepEvent && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 py-1">
                  <Info className="h-3 w-3" />
                  Calendario SEP
                </Badge>
              )}
            </div>

            {sepEvent && (
              <div className="p-4 rounded-xl border-l-4 border-l-amber-400 bg-amber-50/50 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">{sepEvent.label}</p>
                  <p className="text-xs text-amber-700">Evento marcado en el calendario oficial de la SEP 2025-2026.</p>
                </div>
              </div>
            )}
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
                      className="rounded-xl border border-border p-4 bg-card flex justify-between gap-4 items-start shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-foreground tracking-tight">{event.title}</p>
                          <Badge variant="secondary" className="text-[9px] uppercase font-black bg-muted text-muted-foreground border-none px-2 h-4">
                            {audience.includes('todos')
                              ? ' Público'
                              : audience.includes('personal')
                                ? ' Privado'
                                : ` ${audience
                                  .map((value) => {
                                    if (value === 'orientadores') return 'Orientadores';
                                    if (value === 'maestros') return 'Maestros';
                                    if (value === 'alumnos') return 'Alumnos';
                                    return value;
                                  })
                                  .join(' · ')}`}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed italic">{event.description}</p>
                        )}
                      </div>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {!loading && !error && visibleEvents.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                      <Info className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sin eventos en agenda</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
