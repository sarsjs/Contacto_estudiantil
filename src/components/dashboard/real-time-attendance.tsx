'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, UserCheck, Clock, UserX } from "lucide-react";
import type { Student } from "@/lib/types";

interface Props {
    students: any[];
}

export function RealTimeAttendance({ students }: Props) {
    const inside = students.filter(s => s.gpsStatus === 'inside');
    const coming = students.filter(s => s.gpsStatus === 'coming');
    const missing = students.filter(s => s.gpsStatus === 'outside' || !s.gpsStatus);

    return (
        <Card className="border-none shadow-lg bg-muted/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Pulso de Asistencia Real
                        </CardTitle>
                        <CardDescription>Estado de ubicación durante el horario escolar.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            {inside.length} En Plantel
                        </Badge>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {coming.length} En Camino
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* EN PLANTEL */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="h-3 w-3" /> Confirmados
                        </h4>
                        <div className="space-y-2">
                            {inside.map(s => (
                                <StatusItem key={s.id} student={s} color="green" />
                            ))}
                            {inside.length === 0 && <EmptyState text="Nadie en el plantel" />}
                        </div>
                    </div>

                    {/* EN CAMINO */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="h-3 w-3" /> En Camino
                        </h4>
                        <div className="space-y-2">
                            {coming.map(s => (
                                <StatusItem key={s.id} student={s} color="orange" />
                            ))}
                            {coming.length === 0 && <EmptyState text="Sin reportes de retraso" />}
                        </div>
                    </div>

                    {/* AUSENTES / DESCONOCIDOS */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <UserX className="h-3 w-3" /> Sin Localizar
                        </h4>
                        <div className="space-y-2">
                            {missing.map(s => (
                                <StatusItem key={s.id} student={s} color="slate" />
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusItem({ student, color }: { student: any, color: string }) {
    const dotColors: any = {
        green: 'bg-green-500',
        orange: 'bg-orange-500',
        slate: 'bg-slate-300'
    };

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${dotColors[color]}`} />
                <Avatar className="h-6 w-6">
                    <AvatarImage src={student.avatarUrl} />
                    <AvatarFallback className="text-[10px]">{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate max-w-[100px]">{student.name}</span>
            </div>
            {student.lastGpsUpdate && (
                <span className="text-[9px] text-muted-foreground">
                    {new Date(student.lastGpsUpdate.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-[10px] text-muted-foreground italic p-2">{text}</p>;
}
