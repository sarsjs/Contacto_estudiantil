'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/client';
import { doc, setDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';

const COUNSELORS = ['orientador1@epo264.com', 'orientador2@epo264.com', 'orientador3@epo264.com'];
const SUBJECTS_LIST = [
    "Lengua Materna", "Inglés", "Álgebra", "Química", "Física",
    "Computación", "Educación Física", "Sociales", "Taller"
];

// Generar un profesor por materia
const TEACHERS = SUBJECTS_LIST.map((subj, i) => ({
    name: `Profesor ${subj}`,
    email: `profe.${subj.toLowerCase().replace(/ /g, '')}@epo264.com`,
    subject: subj,
    id: `teacher_${i + 1}`
}));

const SEMESTERS = 6;
const GROUPS_PER_SEMESTER = 2;

export default function SeederPage() {
    const [loading, setLoading] = React.useState(false);
    const [logs, setLogs] = React.useState<string[]>([]);
    const [progress, setProgress] = React.useState(0);

    const log = (msg: string) => setLogs(prev => [...prev, msg]);

    const runSeed = async () => {
        if (!confirm('¿Estás seguro de generar datos masivos? Esto escribirá en la base de datos.')) return;

        setLoading(true);
        setLogs([]);
        setProgress(0);
        log('Iniciando simulación de Escenario Real Complejo...');

        try {
            const batchSize = 400;
            let batch = writeBatch(db);
            let operationCount = 0;

            const commitBatch = async () => {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
            };

            const addToBatch = async (ref: any, data: any) => {
                batch.set(ref, data);
                operationCount++;
                if (operationCount >= batchSize) {
                    await commitBatch();
                }
            };

            // 1. Personal Escolar
            log('--> Creando Director y Orientadores...');
            await addToBatch(doc(db, 'users', 'director_demo'), {
                id: 'director_demo', name: 'Director General', email: 'director@epo264.com', role: 'director', createdAt: serverTimestamp()
            });

            const counselorIds: string[] = [];
            for (let i = 0; i < COUNSELORS.length; i++) {
                const id = `counselor_${i + 1}`;
                counselorIds.push(id);
                await addToBatch(doc(db, 'users', id), {
                    id, name: `Orientador ${i + 1}`, email: COUNSELORS[i], role: 'orientador', createdAt: serverTimestamp()
                });
            }

            log('--> Creando Claustro Docente (1 por materia)...');
            for (const t of TEACHERS) {
                await addToBatch(doc(db, 'users', t.id), {
                    id: t.id, name: t.name, email: t.email, role: 'profesor', subjectSpecialty: t.subject, createdAt: serverTimestamp()
                });
                // Crear Materia en Firestore
                const subjectId = `subj_${t.subject.replace(/ /g, '_')}`;
                await addToBatch(doc(db, 'subjects', subjectId), {
                    id: subjectId, name: t.subject, teacherId: t.id
                });
            }

            // 2. Grupos y Asignación de Orientadores
            log('--> Estructurando Grupos y Horarios...');
            const groupIds: string[] = [];
            let totalStudentsCreated = 0;

            for (let sem = 1; sem <= SEMESTERS; sem++) {
                // Asignar Orientador: Sem 1-2 -> C1, Sem 3-4 -> C2, Sem 5-6 -> C3
                let counselorIndex = 0;
                if (sem >= 3 && sem <= 4) counselorIndex = 1;
                if (sem >= 5) counselorIndex = 2;
                const assignedCounselorId = counselorIds[counselorIndex];

                for (let g = 1; g <= GROUPS_PER_SEMESTER; g++) {
                    const groupId = `${sem}0${g}`;
                    groupIds.push(groupId);

                    // Definir Horario Especial para 5to y 6to
                    let scheduleDescription = "07:00 - 14:00"; // Default
                    if (sem >= 5) {
                        if (g === 1) scheduleDescription = "08:00 - 13:00 (Turno Especial A)";
                        if (g === 2) scheduleDescription = "09:00 - 14:00 (Turno Especial B)";
                    }

                    await addToBatch(doc(db, 'groups', groupId), {
                        id: groupId,
                        name: `GRADO ${sem} - GRUPO ${g}`,
                        semester: sem,
                        cycleId: '2024-2025',
                        counselorId: assignedCounselorId,
                        schedule: scheduleDescription
                    });

                    // 3. Generar Alumnos Variables (28 a 35)
                    const studentCount = Math.floor(Math.random() * (35 - 28 + 1)) + 28;
                    log(`    Grupo ${sem}-${g}: Generando ${studentCount} alumnos (${scheduleDescription})...`);

                    for (let s = 0; s < studentCount; s++) {
                        totalStudentsCreated++;
                        const studentId = `student_${groupId}_${s + 1}`; // ID único predecible
                        const matricula = `2024${sem}${g}${s.toString().padStart(3, '0')}`;

                        const firstName = ['Sofia', 'Valentina', 'Isabella', 'Camila', 'Mariana', 'Santiago', 'Mateo', 'Sebastian', 'Leonardo', 'Emiliano'][Math.floor(Math.random() * 10)];
                        const lastName = ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Rodriguez', 'Sanchez', 'Ramirez', 'Cruz'][Math.floor(Math.random() * 10)];

                        // Generar avatar aleatorio usando Picsum
                        const avatarSeed = Math.floor(Math.random() * 1000);
                        const avatarUrl = `https://picsum.photos/seed/${studentId}/200/200`;

                        await addToBatch(doc(db, 'users', studentId), {
                            id: studentId,
                            name: `${firstName} ${lastName}`,
                            email: `a${matricula}@epo264.com`,
                            role: 'estudiante',
                            groupId: groupId,
                            matricula: matricula,
                            curp: `CURP${matricula}MX`,
                            avatarUrl: avatarUrl, //  Foto para credencial
                            status: 'activo',
                            valid_from: '2024-08-01',
                            valid_to: '2025-07-31',
                            createdAt: serverTimestamp()
                        });

                        // Asignar Calificaciones Iniciales (Aleatorio)
                        const randomSubjects = TEACHERS.sort(() => 0.5 - Math.random()).slice(0, 5); // 5 materias random
                        for (const subj of randomSubjects) {
                            const gradeId = `${studentId}_${subj.id}`;
                            await addToBatch(doc(db, 'grades', gradeId), {
                                id: gradeId,
                                studentId: studentId,
                                subjectId: `subj_${subj.subject.replace(/ /g, '_')}`,
                                grade: 5 + Math.floor(Math.random() * 6), // 5 a 10
                                partial: 1,
                                createdAt: serverTimestamp()
                            });
                        }
                    }

                    setProgress(Math.round((totalStudentsCreated / 360) * 100)); // Aprox 360 alumnos
                }
            }

            await commitBatch();

            log('¡ESCENARIO COMPLETO GENERADO!');
            log('Resumen de Infraestructura:');
            log(`- Total Alumnos: ${totalStudentsCreated}`);
            log(`- Grupos: ${groupIds.length}`);
            log(`- Docentes: ${TEACHERS.length}`);
            log(`- Orientadores: ${COUNSELORS.length}`);

            toast({
                title: "Escenario Realista Creado",
                description: `Se han registrado ${totalStudentsCreated} alumnos con horarios personalizados.`,
                className: "bg-green-50 border-green-200 text-green-900"
            });

        } catch (error) {
            console.error(error);
            log('ERROR CRÍTICO: ' + JSON.stringify(error));
            toast({ title: "Error", description: "Falló la simulación.", variant: "destructive" });
        } finally {
            setLoading(false);
            setProgress(100);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
            <Card className="max-w-2xl w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-black text-[#8B1A2B] uppercase">Generador de Escenario Escolar Realista</CardTitle>
                    <CardDescription>
                        Esta herramienta poblará la base de datos con un escenario completo y realista.
                        <br />
                        <strong>ADVERTENCIA:</strong> Escribirá múltiples registros en Firestore.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white border rounded-lg p-4 text-sm font-mono space-y-2">
                        <p> 1 Director</p>
                        <p> {COUNSELORS.length} Orientadores</p>
                        <p> {TEACHERS.length} Profesores (1 por materia)</p>
                        <p> {SEMESTERS * GROUPS_PER_SEMESTER} Grupos (1-1 a 6-2)</p>
                        <p> ~360 Estudiantes (28-35 por grupo)</p>
                        <p> Horarios Especiales: Sem 5-6 con turnos variables</p>
                        <p className="text-xs text-gray-500 mt-2">Materias: {SUBJECTS_LIST.join(', ')}</p>
                    </div>

                    {loading && (
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#8B1A2B] transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-gray-400 font-bold">{progress}%</p>
                        </div>
                    )}

                    <div className="h-64 bg-black text-green-400 font-mono text-xs p-4 rounded-md overflow-y-auto">
                        {logs.length === 0 ? <p className="opacity-50">// Esperando inicio...</p> : logs.map((l, i) => <p key={i}>{l}</p>)}
                    </div>

                    <Button
                        onClick={runSeed}
                        disabled={loading}
                        className="w-full bg-[#8B1A2B] hover:bg-[#7A1625] text-white font-bold h-12 text-lg"
                    >
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        {loading ? 'Generando...' : 'EJECUTAR SIMULACIÓN'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
