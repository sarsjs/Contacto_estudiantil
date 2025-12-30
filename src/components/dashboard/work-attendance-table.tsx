'use client';

import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchWorkLogs } from '@/lib/firebase/data';
import type { WorkLog } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, UserCheck, UserX, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WorkAttendanceTableProps {
    userId?: string;
    title?: string;
    className?: string;
}

export function WorkAttendanceTable({ userId, title, className }: WorkAttendanceTableProps) {
    const [logs, setLogs] = React.useState<WorkLog[]>([]);
    const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = React.useState(true);

    const loadLogs = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await fetchWorkLogs(selectedDate, userId);
            setLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, userId]);

    React.useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const formatTimestamp = (ts: any) => {
        if (!ts) return "--:--";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "HH:mm");
    };

    return (
        <Card className={`border-none shadow-md h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        {title || "RELOJ CHECADOR VIRTUAL"}
                    </CardTitle>
                    <CardDescription>Seguimiento de puntualidad y asistencia del personal.</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 w-36 text-xs font-bold"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-bold uppercase text-[10px]">Personal</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Entrada (7:00 AM)</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Salida</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Horas</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground animate-pulse">
                                        Cargando registros del día...
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No hay registros de asistencia para esta fecha.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-bold text-sm text-foreground">{log.userName}</TableCell>
                                        <TableCell className="font-mono text-sm">{formatTimestamp(log.checkIn)}</TableCell>
                                        <TableCell className="font-mono text-sm">{formatTimestamp(log.checkOut)}</TableCell>
                                        <TableCell className="font-mono text-sm">{log.totalHours ? `${log.totalHours}h` : '--'}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`uppercase text-[9px] font-bold px-2 py-0.5 tracking-wider ${log.status === 'present'
                                                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                    }`}
                                                variant="outline"
                                            >
                                                {log.status === 'present' ? (
                                                    <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> Puntual</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Retardo</span>
                                                )}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
