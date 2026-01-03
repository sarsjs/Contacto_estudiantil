'use client';

import * as React from 'react';
import { db } from '@/lib/firebase/client';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    writeBatch,
    query,
    limit
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, AlertTriangle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MaintenancePage() {
    const [loading, setLoading] = React.useState<Record<string, boolean>>({});
    const { toast } = useToast();

    // Función genérica para borrar una colección (por lotes de 500)
    const deleteCollection = async (collectionName: string) => {
        if (!confirm(`¿Estás seguro de borrar TODA la colección "${collectionName}"?`)) return;

        setLoading(prev => ({ ...prev, [collectionName]: true }));
        try {
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            toast({ title: "Limpieza completada", description: `Colección ${collectionName} eliminada.` });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: `No se pudo borrar ${collectionName}`, variant: "destructive" });
        } finally {
            setLoading(prev => ({ ...prev, [collectionName]: false }));
        }
    };

    // Función para borrar registros específicos (test data)
    const cleanupTestData = async (collectionName: string, pattern: string) => {
        if (!confirm(`¿Borrar registros de "${collectionName}" que coincidan con "${pattern}"?`)) return;

        setLoading(prev => ({ ...prev, [collectionName + '_test']: true }));
        try {
            const snapshot = await getDocs(collection(db, collectionName));
            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach((d) => {
                // Si el ID contiene el patrón (ej: "student_") o es corto (ej: "tt-1")
                if (d.id.includes(pattern) || (pattern === 'id_corto' && d.id.length < 10)) {
                    batch.delete(d.ref);
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                toast({ title: "Limpieza selectiva", description: `Se eliminaron ${count} registros de prueba.` });
            } else {
                toast({ title: "Nada que borrar", description: "No se encontraron registros de prueba." });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Fallo en la limpieza selectiva.", variant: "destructive" });
        } finally {
            setLoading(prev => ({ ...prev, [collectionName + '_test']: false }));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center">
            <Card className="max-w-3xl w-full border-2 border-orange-100 shadow-xl">
                <CardHeader className="bg-orange-50/50 border-b">
                    <div className="flex items-center gap-3">
                        <Database className="h-8 w-8 text-orange-600" />
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight">Mantenimiento de Base de Datos</CardTitle>
                            <CardDescription className="font-medium text-orange-800/60">
                                Herramientas para eliminar datos obsoletos y registros de prueba.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">

                    {/* Sección 1: Colecciones Obsoletas */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Colecciones Obsoletas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="p-4 border-dashed bg-white">
                                <p className="text-sm font-bold mb-1">Colección: <code className="text-red-500">students</code></p>
                                <p className="text-xs text-slate-500 mb-4">Redundante. Todos los alumnos ahora están en la colección "users".</p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full uppercase font-bold text-[10px]"
                                    onClick={() => deleteCollection('students')}
                                    disabled={loading['students']}
                                >
                                    {loading['students'] ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Trash2 className="h-3 w-3 mr-2" />}
                                    Borrar Colección Completa
                                </Button>
                            </Card>

                            <Card className="p-4 border-dashed bg-white">
                                <p className="text-sm font-bold mb-1">Colección: <code className="text-blue-500">activity_logs</code></p>
                                <p className="text-xs text-slate-500 mb-4">Esta colección registra todas las acciones. **No la borres**, es vital para la auditoría.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full uppercase font-bold text-[10px] opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    Protegido por el Sistema
                                </Button>
                            </Card>
                        </div>
                    </div>

                    {/* Sección 2: Limpieza de Basura en Colecciones Activas */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Database className="h-4 w-4" /> Limpieza de Datos de Prueba
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-tight">Calificaciones de Prueba</p>
                                    <p className="text-xs text-slate-500 italic">IDs formato: "student_..." o "user_..." antigua</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 font-bold uppercase text-[10px]"
                                    onClick={() => cleanupTestData('grades', 'student_')}
                                    disabled={loading['grades_test']}
                                >
                                    Limpiar Basura
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-tight">Horarios Genéricos (tt-1, tt-2...)</p>
                                    <p className="text-xs text-slate-500 italic">IDs cortos manuales de las primeras pruebas</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 font-bold uppercase text-[10px]"
                                    onClick={() => cleanupTestData('timetables', 'tt-')}
                                    disabled={loading['timetables_test']}
                                >
                                    Limpiar Basura
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mt-6 space-y-2">
                        <p className="text-[10px] text-blue-700 leading-relaxed italic">
                            <strong>Nota:</strong> Estas acciones son permanentes.
                        </p>
                        <p className="text-[10px] text-blue-700 leading-relaxed italic">
                             <strong>Estatus de colecciones críticas:</strong>
                            <br /> <strong>securityAlerts:</strong> MANTENER (Usada para alertas de GPS y seguimiento de permanencia).
                            <br /> <strong>activity_logs:</strong> MANTENER (Sistema de auditoría universal que acabamos de implementar).
                            <br /> <strong>users:</strong> PROTEGIDO (Contiene a todos los alumnos, profesores y directivos).
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
