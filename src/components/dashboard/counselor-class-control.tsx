'use client';

import * as React from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    fetchTimetableByGroup,
    fetchSubjects,
    generateAttendanceToken,
    fetchUsers
} from '@/lib/firebase/data';
import { getCurrentSubject } from '@/lib/schedule-utils';
import type { TimetableEntry, Subject, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    BookOpen,
    UserX,
    ShieldCheck,
    Timer,
    KeyRound,
    AlertCircle
} from 'lucide-react';

interface CounselorClassControlProps {
    groupId: string;
    groupName: string;
}

export function CounselorClassControl({ groupId, groupName }: CounselorClassControlProps) {
    const { toast } = useToast();
    const [currentClass, setCurrentClass] = React.useState<TimetableEntry | null>(null);
    const [subjectInfo, setSubjectInfo] = React.useState<Subject | null>(null);
    const [teacherInfo, setTeacherInfo] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const [activeToken, setActiveToken] = React.useState<{ code: string; expiresAt: number } | null>(null);
    const [countdown, setCountdown] = React.useState(0);
    const [isTakingControl, setIsTakingControl] = React.useState(false);

    const loadClassData = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const [tt, allSubjects, allUsers] = await Promise.all([
                fetchTimetableByGroup(groupId),
                fetchSubjects(),
                fetchUsers()
            ]);

            const active = getCurrentSubject(tt);
            setCurrentClass(active);

            if (active) {
                const sub = allSubjects.find(s => s.id === active.subjectId);
                setSubjectInfo(sub || null);
                if (sub) {
                    const teacher = allUsers.find(u => u.id === sub.teacherId);
                    setTeacherInfo(teacher || null);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [groupId]);

    React.useEffect(() => {
        loadClassData();
        const interval = setInterval(loadClassData, 60000); // Re-check every minute
        return () => clearInterval(interval);
    }, [loadClassData]);

    React.useEffect(() => {
        if (countdown <= 0) {
            if (activeToken) setActiveToken(null);
            return;
        }
        const timer = setInterval(() => setCountdown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [countdown, activeToken]);

    const handleStartAttendance = async () => {
        if (!currentClass) return;
        try {
            const token = await generateAttendanceToken(currentClass.subjectId, groupId);
            setActiveToken({ code: token.code, expiresAt: Date.now() + 5 * 60 * 1000 });
            setCountdown(300);
            toast({
                title: "Pase de lista (Suplencia)",
                description: "Has generado un código de asistencia para esta clase."
            });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo generar el código.", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="animate-pulse h-24 bg-slate-100 rounded-xl" />;

    if (!currentClass) {
        return (
            <Card className="border-dashed border-slate-200 bg-slate-50/50">
                <CardContent className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                    <BookOpen className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No hay clases programadas en este momento para {groupName}.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-amber-200 bg-amber-50/30 overflow-hidden shadow-md">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px] font-bold">En Curso</Badge>
                            <CardTitle className="text-lg">{subjectInfo?.name || "Clase actual"}</CardTitle>
                        </div>
                        <CardDescription>{currentClass.time}  Prof. {teacherInfo?.name || "Asignado"}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isTakingControl ? (
                    <div className="flex flex-col gap-3">
                        <div className="p-3 bg-white rounded-lg border border-amber-100 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Si el docente titular no está presente, puedes tomar el control de la clase para realizar el pase de lista y supervisar al grupo.
                            </p>
                        </div>
                        <Button
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => setIsTakingControl(true)}
                        >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Tomar Control de Clase
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-amber-200 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                    <KeyRound className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Control de Asistencia</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Suplencia por {groupName}</p>
                                </div>
                            </div>

                            {activeToken ? (
                                <div className="flex items-center gap-4 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase font-bold text-amber-600/70">Código</span>
                                        <span className="text-2xl font-black tracking-widest text-amber-700">{activeToken.code}</span>
                                    </div>
                                    <div className="border-l border-amber-200 pl-4 flex flex-col items-center">
                                        <span className="text-[10px] uppercase font-bold text-amber-600/70">Expira</span>
                                        <div className="flex items-center gap-1 text-orange-600 font-bold">
                                            <Timer className="h-4 w-4" />
                                            <span>{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleStartAttendance}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Generar Token de Asistencia
                                </Button>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground hover:text-red-600 h-6 text-[10px] uppercase font-bold"
                            onClick={() => {
                                setIsTakingControl(false);
                                setActiveToken(null);
                                setCountdown(0);
                            }}
                        >
                            Finalizar Suplencia de Clase
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Small helper Badge component if not available
function Badge({ children, variant, className }: any) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
            {children}
        </span>
    );
}
