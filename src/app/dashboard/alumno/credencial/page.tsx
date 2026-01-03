'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import {
    fetchStudentByEmail,
    fetchGroups,
    fetchUserById,
} from '@/lib/firebase/data';
import type { Student, Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Download,
    UserCircle,
    ShieldCheck,
    GraduationCap,
    Contact
} from 'lucide-react';
import { useAppConfig } from '@/context/config-context';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function CredencialPage() {
    const { profile: user } = useAuth();
    const [student, setStudent] = React.useState<Student | null>(null);
    const [group, setGroup] = React.useState<Group | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { config } = useAppConfig();
    const { toast } = useToast();

    React.useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                let currentStudent = user.email ? await fetchStudentByEmail(user.email) : null;
                if (!currentStudent && user.id) {
                    const fallback = await fetchUserById(user.id);
                    if (fallback && (fallback.role === 'estudiante' || fallback.role === 'alumno')) {
                        currentStudent = fallback;
                    }
                }
                if (currentStudent) {
                    setStudent(currentStudent);
                    if (currentStudent.groupId) {
                        const allGroups = await fetchGroups();
                        const studentGroup = allGroups.find(g => g.id === currentStudent.groupId);
                        if (studentGroup) setGroup(studentGroup);
                    }
                }
            } catch (error) {
                console.error("Error loading credential data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user]);

    const handleDownloadCard = async () => {
        if (!student) return;
        try {
            toast({
                title: "Generando imágenes...",
                description: "La descarga de ambas caras iniciará en un momento.",
            });

            const options = { cacheBust: true, pixelRatio: 3 };

            // Frente
            const frontUrl = await toPng(document.getElementById('credential-front') as HTMLElement, options);
            const linkFront = document.createElement('a');
            linkFront.download = `EPO264_Credencial_Frente_${student.matricula || 'Alumno'}.png`;
            linkFront.href = frontUrl;
            document.body.appendChild(linkFront);
            linkFront.click();
            document.body.removeChild(linkFront);

            await new Promise(resolve => setTimeout(resolve, 800));

            // Reverso
            const backUrl = await toPng(document.getElementById('credential-back') as HTMLElement, options);
            const linkBack = document.createElement('a');
            linkBack.download = `EPO264_Credencial_Reverso_${student.matricula || 'Alumno'}.png`;
            linkBack.href = backUrl;
            document.body.appendChild(linkBack);
            linkBack.click();
            document.body.removeChild(linkBack);

            toast({
                title: "Descarga completada",
                description: "Se han guardado las dos caras de tu credencial.",
            });
        } catch (error) {
            console.error('Error downloading card:', error);
            toast({
                title: "Error de descarga",
                description: "No se pudieron generar las imágenes.",
                variant: "destructive",
            });
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground uppercase font-black tracking-widest animate-pulse">Cargando Identificación...</div>;

    if (!student) return <div className="p-8 text-center text-destructive font-bold uppercase">No se encontró el perfil del estudiante.</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">Mi Identificación Oficial </h1>
                    <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest">
                        Credencial Digital del {config?.terminology.alumno || 'Estudiante'} {config?.appName !== 'EduChain' ? config?.appName : 'EPO 264'}
                    </p>
                </div>
                <Button onClick={handleDownloadCard} className="shadow-lg shadow-primary/20 uppercase font-black tracking-widest text-xs">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar para Impresión
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-12 justify-items-center py-8">
                {/* FRONT SIDE */}
                <div className="space-y-4">
                    <h3 className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Vista Frontal</h3>
                    <div id="credential-front" className="w-[325px] h-[205px] bg-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col border border-gray-200 select-none">
                        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-[#8B1A2B]/10 to-transparent rounded-full -mr-10 -mt-10 z-0" />
                        <div className="h-[45px] w-full flex items-center justify-between px-3 pt-2 relative z-10 border-b border-gray-100/50 bg-white/80 backdrop-blur-sm">
                            <img src="/edomex.png" alt="Edomex" className="h-8 object-contain" />
                            <img src="/edu.png" alt="Secretaría de Educación" className="h-8 object-contain" />
                        </div>
                        <div className="flex-1 flex p-3 gap-3 relative z-10">
                            <div className="w-[85px] flex flex-col gap-1.5 pt-1">
                                <div className="w-full h-[100px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm p-0.5">
                                    <div className="w-full h-full rounded-md overflow-hidden relative bg-gray-50">
                                        {student.avatarUrl ? (
                                            <img src={student.avatarUrl} alt="Foto" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><UserCircle className="h-10 w-10" /></div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-[#8B1A2B] text-white py-0.5 text-center rounded-full shadow-sm">
                                    <p className="text-[6px] font-black uppercase tracking-widest">{config?.terminology.alumno || 'Estudiante'}</p>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="mb-1">
                                    <h3 className="text-[6px] font-bold text-gray-500 uppercase tracking-widest">Educación Media Superior</h3>
                                    <h2 className="text-[11px] font-black text-gray-900 leading-tight uppercase font-serif">Escuela Preparatoria Oficial Núm. 264</h2>
                                    <div className="h-0.5 w-10 bg-[#8B1A2B] mt-0.5 rounded-full" />
                                </div>
                                <div className="space-y-1 mt-0.5">
                                    <div>
                                        <p className="text-[5px] text-gray-400 font-bold uppercase mb-[1px]">Nombre del {config?.terminology.alumno || 'Alumno'}</p>
                                        <p className="text-[10px] font-black text-gray-800 leading-tight uppercase">{student.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                        <div>
                                            <p className="text-[5px] text-gray-400 font-bold uppercase mb-[1px]">Matrícula</p>
                                            <p className="text-[9px] font-mono font-bold text-[#8B1A2B]">{student.matricula || "--------"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[5px] text-gray-400 font-bold uppercase mb-[1px]">Grupo</p>
                                            <p className="text-[9px] font-bold text-gray-800 uppercase bg-gray-100 inline-block px-1.5 rounded-sm">{group?.name || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="h-4 bg-[#F2F2F2] border-t border-gray-200 w-full flex items-center justify-between px-3">
                            <span className="text-[4px] font-bold text-gray-400 uppercase tracking-widest">Identificación Oficial Escolar</span>
                            <span className="text-[5px] font-bold text-[#8B1A2B] uppercase">C.C.T. 15EBH0264W</span>
                        </div>
                    </div>
                </div>

                {/* BACK SIDE */}
                <div className="space-y-4">
                    <h3 className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Vista Posterior</h3>
                    <div id="credential-back" className="w-[325px] h-[205px] bg-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col border border-gray-200 select-none">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-50" />
                        <div className="relative p-5 flex gap-5 h-full items-center z-10">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-[90px] h-[90px] bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm relative">
                                    <div className="absolute inset-0 border-[3px] border-[#8B1A2B] rounded-lg opacity-10"></div>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${typeof window !== 'undefined' ? window.location.origin : ''}/validar/${student.id}`}
                                        alt="QR Validación"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="text-[5px] font-bold text-gray-400 uppercase tracking-wider">Escanear para Validar</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-between h-[100px] border-l border-gray-100 pl-4 py-1">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1 bg-[#8B1A2B]/5 rounded-md">
                                            <ShieldCheck className="h-3 w-3 text-[#8B1A2B]" />
                                        </div>
                                        <div>
                                            <h4 className="text-[7px] font-black uppercase text-gray-900 leading-none">Vigencia 2024 - 2025</h4>
                                            <p className="text-[5px] text-gray-400 font-bold uppercase">Ciclo Escolar Actual</p>
                                        </div>
                                    </div>
                                    <p className="text-[5px] text-justify text-gray-500 leading-relaxed font-medium">
                                        Esta credencial es personal e intransferible y acredita al portador como {config?.terminology.alumno.toLowerCase() || 'alumno'} de la <span className="text-[#8B1A2B] font-bold">{config?.appName !== 'EduChain' ? config?.appName : 'EPO 264'}</span>.
                                        En caso de extravío, favor de reportarlo inmediatamente a la dirección escolar.
                                    </p>
                                </div>
                                <div className="text-right pt-1">
                                    <p className="text-[4px] font-mono text-gray-300">ID: {student.id}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-auto bg-gradient-to-r from-gray-900 to-[#8B1A2B] h-2 w-full" />
                    </div>
                </div>
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm uppercase">Soporte Escolar</h4>
                        <p className="text-xs text-muted-foreground">Si tus datos son incorrectos o necesitas actualizar tu fotografía, dirígete al departamento de control escolar con tu {config?.terminology.orientador.toLowerCase() || 'orientador'}.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
