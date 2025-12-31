'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Search, ShieldCheck, AlertCircle } from 'lucide-react';

interface ValidationResponse {
    status: 'VALID' | 'INVALID';
    message?: string;
    student?: {
        name: string;
        matricula: string;
        group: string;
        photoUrl: string | null;
        grade: string;
    };
    school?: {
        name: string;
        cct: string;
        address: string;
        logoUrl: string;
    };
    timestamp?: string;
}

export default function PublicValidationPage({ params }: { params: { id: string } }) {
    const [data, setData] = React.useState<ValidationResponse | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const validate = async () => {
            if (!params.id) return;
            try {
                // Fetch to the public Cloud Function
                // In local dev, this might need full URL if rewrite isn't active on port 3000
                // Use relative path '/api/validacion' which works if hosted or proxy setup
                const res = await fetch(`/api/validacion?public_id=${params.id}`);

                if (!res.ok) {
                    if (res.status === 404) {
                        setData({ status: 'INVALID', message: 'Credencial no encontrada.' });
                    } else {
                        throw new Error('Error en el servidor de validación');
                    }
                    return;
                }

                const json = await res.json();
                setData(json);

            } catch (err) {
                console.error("Validation error:", err);
                setError("No se pudo conectar con el servidor de validación.");
            } finally {
                setLoading(false);
            }
        };
        validate();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B1A2B] border-t-transparent" />
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Validando credencial...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200 bg-red-50">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h1 className="text-2xl font-bold text-red-900">Error de Conexión</h1>
                        <p className="text-red-700 mt-2">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (data?.status === 'INVALID') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200 bg-red-50 shadow-xl">
                    <CardContent className="flex flex-col items-center py-12 text-center p-6">
                        <div className="bg-red-100 p-4 rounded-full mb-6">
                            <XCircle className="h-16 w-16 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-black uppercase text-red-900 mb-2">Credencial No Válida</h1>
                        <p className="text-red-700 font-medium px-4 leading-relaxed">
                            {data.message || "El código QR escaneado no corresponde a un alumno activo o vigente."}
                        </p>
                        <div className="mt-8 pt-6 border-t border-red-200 w-full">
                            <p className="text-xs text-red-500 font-bold uppercase tracking-widest">Reportar incidencia a Dirección</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Valid Case
    const student = data?.student;
    const school = data?.school;

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center">
                    <ShieldCheck className="mx-auto h-16 w-16 text-green-600" />
                    <h2 className="mt-4 text-3xl font-black text-gray-900 tracking-tight">VALIDACIÓN EXITOSA</h2>
                    <p className="mt-2 text-sm text-gray-500 uppercase tracking-[0.2em] font-bold">Credencial Oficial Vigente</p>
                </div>

                <Card className="border-t-[6px] border-green-600 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-white border-b border-gray-100 pb-8 pt-8">
                        <div className="flex flex-col md:flex-row gap-8 items-center">

                            {/* Photo Section */}
                            <div className="relative group">
                                <div className="h-48 w-36 rounded-lg overflow-hidden border-4 border-white shadow-xl bg-gray-200 relative z-10">
                                    {student?.photoUrl ? (
                                        <img src={student.photoUrl} alt="Foto Alumno" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-100">
                                            <Search className="h-12 w-12 opacity-20" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-4 -right-4 z-20">
                                    <div className="bg-green-100 text-green-700 p-2 rounded-full border-4 border-white shadow-sm">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 text-center md:text-left space-y-2 w-full">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Alumno</h3>
                                    <h2 className="text-3xl font-black text-gray-900 leading-none uppercase">{student?.name}</h2>
                                    <Badge className="mt-3 bg-green-100 text-green-800 hover:bg-green-100 border border-green-200 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                                        Estatus: Activo
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                                    <div>
                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Matrícula</span>
                                        <span className="font-mono text-lg font-bold text-[#8B1A2B]">{student?.matricula}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Grupo</span>
                                        <span className="text-lg font-bold text-gray-800 uppercase">{student?.group}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="bg-gray-50/80 p-6 md:p-8">
                        <div className="flex items-center gap-4 opacity-80">
                            {school?.logoUrl && <img src={school.logoUrl} className="h-12 w-12 object-contain grayscale" />}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 uppercase">{school?.name}</h4>
                                <p className="text-xs text-gray-500 font-medium">C.C.T. {school?.cct}</p>
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <p className="text-[10px] text-gray-400 font-mono">Validado el: {new Date().toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
