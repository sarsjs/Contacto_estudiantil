'use client';

import * as React from 'react';
import { fetchUserById, fetchGroups } from '@/lib/firebase/data';
import type { User, Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Search, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function ValidacionPage({ params }: { params: { id: string } }) {
    const [student, setStudent] = React.useState<User | null>(null);
    const [group, setGroup] = React.useState<Group | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const loadData = async () => {
            if (!params.id) return;
            try {
                const user = await fetchUserById(params.id);
                setStudent(user);

                if (user && user.groupId) {
                    const groups = await fetchGroups();
                    const foundGroup = groups.find(g => g.id === user.groupId);
                    setGroup(foundGroup || null);
                }
            } catch (error) {
                console.error("Error loading validation data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Verificando estatus...</p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200 bg-red-50">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h1 className="text-2xl font-bold text-red-900">Estudiante No Encontrado</h1>
                        <p className="text-red-700 mt-2">El código QR escaneado no corresponde a un alumno activo en el sistema.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-green-600" />
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Estudiante Verificado</h2>
                    <p className="mt-1 text-sm text-gray-500 uppercase tracking-widest">Sistema de Control Escolar EPO 264</p>
                </div>

                <Card className="border-t-4 border-green-500 shadow-xl">
                    <CardHeader className="bg-white border-b pb-8">
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="relative">
                                <div className="h-40 w-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg bg-gray-100">
                                    {student.avatarUrl ? (
                                        <img src={student.avatarUrl} alt={student.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                            <Search className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-3 -right-3">
                                    <div className="bg-green-100 text-green-800 p-2 rounded-full border border-green-200">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{student.name}</h3>
                                    <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                                        ALUMNO ACTIVO
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <span className="block text-xs font-bold text-gray-400 uppercase">Matrícula</span>
                                        <span className="font-mono font-medium text-gray-900">{student.matricula || "N/A"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <span className="block text-xs font-bold text-gray-400 uppercase">Grupo</span>
                                        <span className="font-medium text-gray-900">{group?.name || "Sin Asignar"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <span className="block text-xs font-bold text-gray-400 uppercase">Correo Institucional</span>
                                        <span className="font-medium text-gray-900 truncate block">{student.email}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <span className="block text-xs font-bold text-gray-400 uppercase">Ciclo Escolar</span>
                                        <span className="font-medium text-gray-900">2024-2025</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="bg-gray-50/50 p-6">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Datos Académicos del Plantel</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                            <div>
                                <span className="block text-xs font-bold text-gray-500 uppercase">Director Escolar</span>
                                <p className="font-medium text-gray-900 mt-1">Mtro. Juan Pérez (Ejemplo)</p>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-500 uppercase">Orientador del Grupo</span>
                                <p className="font-medium text-gray-900 mt-1">{group?.counselorId ? "Asignado en Sistema" : "Pendiente"}</p>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-500 uppercase">Estatus Administrativo</span>
                                <p className="font-medium text-green-700 mt-1 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-green-500 hover:animate-ping" />
                                    Regular / Inscrito
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
