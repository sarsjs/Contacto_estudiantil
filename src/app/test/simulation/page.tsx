'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchUsers, fetchGradesByStudent, fetchGroups, fetchUserById } from '@/lib/firebase/data';
import { Play, Pause, AlertTriangle, CheckCircle, XCircle, Activity, Server, Users } from 'lucide-react';

interface SimulationLog {
    id: number;
    timestamp: string;
    actor: string;
    action: string;
    status: 'success' | 'error' | 'warning';
    details: string;
    latency: number;
}

const AGENTS = [
    { role: 'Estudiante', color: 'bg-blue-100 text-blue-800' },
    { role: 'Profesor', color: 'bg-yellow-100 text-yellow-800' },
    { role: 'Orientador', color: 'bg-green-100 text-green-800' },
    { role: 'Sistema', color: 'bg-gray-100 text-gray-800' }
];

export default function SimulationDashboard() {
    const [isRunning, setIsRunning] = React.useState(false);
    const [logs, setLogs] = React.useState<SimulationLog[]>([]);
    const [stats, setStats] = React.useState({ success: 0, error: 0, total: 0, avgLatency: 0 });
    const [dbSnapshot, setDbSnapshot] = React.useState<any>({ students: [], teachers: [], groups: [] });
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Load initial "Virtual World" data
    React.useEffect(() => {
        const initWorld = async () => {
            // We try to fetch some real simulation seed data
            try {
                const allUsers = await fetchUsers();
                const groups = await fetchGroups();
                setDbSnapshot({
                    students: allUsers.filter(u => u.role === 'estudiante'),
                    teachers: allUsers.filter(u => u.role === 'profesor'),
                    counselors: allUsers.filter(u => u.role === 'orientador'),
                    groups: groups
                });
            } catch (e) {
                console.error("Failed to load world", e);
            }
        };
        initWorld();
    }, []);

    // Auto-scroll logs
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // The Simulation Loop
    React.useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning) {
            interval = setInterval(async () => {
                await runRandomScenario();
            }, 800); // 1 action every 800ms
        }

        return () => clearInterval(interval);
    }, [isRunning, dbSnapshot]);

    const addLog = async (actor: string, action: string, status: 'success' | 'error' | 'warning', details: string, startTime: number) => {
        const latency = Date.now() - startTime;
        const newLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            actor,
            action,
            status,
            details,
            latency
        };

        setLogs(prev => [...prev, newLog].slice(-50));

        setStats(prev => ({
            total: prev.total + 1,
            success: status === 'success' ? prev.success + 1 : prev.success,
            error: status === 'error' ? prev.error + 1 : prev.error,
            avgLatency: Math.round((prev.avgLatency * prev.total + latency) / (prev.total + 1))
        }));

        // Fire and forget logging to local file via API
        try {
            fetch('/api/test/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ log: newLog })
            });
        } catch (e) {
            console.error("Logging failed", e);
        }
    };

    const runRandomScenario = async () => {
        const startTime = Date.now();
        const scenario = Math.floor(Math.random() * 5); // 0-4 scenarios

        try {
            // Scenario 0: Public Credential Validation (High Traffic)
            if (scenario === 0) {
                if (dbSnapshot.students.length === 0) throw new Error("No hay estudiantes para simular");
                const randomStudent = dbSnapshot.students[Math.floor(Math.random() * dbSnapshot.students.length)];

                // Call the actual API endpoint
                const res = await fetch(`/api/validacion?public_id=${randomStudent.id}`);
                const data = await res.json();

                if (res.ok && data.status === 'VALID') {
                    addLog('Público', 'Escaneo QR', 'success', `Validado: ${randomStudent.name}`, startTime);
                } else {
                    addLog('Público', 'Escaneo QR', 'error', `Fallo validación: ${randomStudent.name}`, startTime);
                }
            }

            // Scenario 1: Student Checks Grades (Read Firestore)
            else if (scenario === 1) {
                if (dbSnapshot.students.length === 0) return;
                const student = dbSnapshot.students[Math.floor(Math.random() * dbSnapshot.students.length)];

                const grades = await fetchGradesByStudent(student.id);
                addLog('Estudiante', 'Consultar Boleta', 'success', `ID: ${student.matricula} revisó ${grades.length} materias`, startTime);
            }

            // Scenario 2: Teacher Lists Students (Group Query)
            else if (scenario === 2) {
                if (dbSnapshot.groups.length === 0) return;
                const group = dbSnapshot.groups[Math.floor(Math.random() * dbSnapshot.groups.length)];
                const studentsInGroup = dbSnapshot.students.filter((s: any) => s.groupId === group.id);

                // Artificial delay to simulate processing
                await new Promise(r => setTimeout(r, 100));

                addLog('Profesor', 'Pasar Lista', 'success', `Grupo ${group.name}: ${studentsInGroup.length} alumnos cargados`, startTime);
            }

            // Scenario 3: System Health Check (Auth/Admin)
            else if (scenario === 3) {
                // Simulate generic user load
                const user = await fetchUserById('director_demo'); // User from seed
                if (user) {
                    addLog('Director', 'Panel Admin', 'success', 'Sesión verificada activamente', startTime);
                } else {
                    addLog('Sistema', 'Integridad', 'warning', 'Usuario Director no encontrado (¿Seed corrido?)', startTime);
                }
            }

            // Scenario 4: Random Error Simulation (Network / 404)
            else if (scenario === 4) {
                // 10% chance of random chaos
                if (Math.random() > 0.8) {
                    await fetch('/api/non-existent-endpoint');
                    addLog('Red', 'Conexión', 'error', 'Error 404: Endpoint no encontrado (Simulado)', startTime);
                } else {
                    addLog('Sistema', 'Heartbeat', 'success', 'Servicios estables', startTime);
                }
            }

        } catch (error: any) {
            addLog('Sistema', 'CRASH', 'error', error.message || 'Error desconocido', startTime);
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="border-b border-green-900 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
                        <Activity className="h-6 w-6 text-green-400" />
                        MATRIX: Simulación de Entorno
                    </h1>
                    <p className="text-xs text-green-700 mt-1">EPO 264 - SISTEMA DE CONTROL ESCOLAR - MODO OBSERVADOR</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="text-right">
                        <p className="text-xs text-green-700 uppercase">Estado del Motor</p>
                        <p className={`text-xl font-bold ${isRunning ? 'text-green-400 animate-pulse' : 'text-red-500'}`}>
                            {isRunning ? 'EJECUTANDO' : 'DETENIDO'}
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`h-12 w-12 rounded-full border-2 ${isRunning ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20' : 'border-green-500 bg-green-500/10 hover:bg-green-500/20'}`}
                    >
                        {isRunning ? <Pause className="text-red-500" /> : <Play className="text-green-500" />}
                    </Button>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-black border border-green-900 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-green-700 font-bold">Peticiones Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="bg-black border border-green-900 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-green-700 font-bold">Latencia Promedio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white flex items-baseline gap-2">
                            {stats.avgLatency} <span className="text-sm text-green-600">ms</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black border border-green-900 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-green-700 font-bold">Tasa de Éxito</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-400">
                            {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 100}%
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black border border-green-900 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-green-700 font-bold">Actores Activos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white flex items-center gap-2">
                            <Users className="h-6 w-6 text-green-700" />
                            {dbSnapshot.students.length + dbSnapshot.teachers.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Log Terminal */}
            <Card className="flex-1 bg-black border border-green-800 shadow-inner overflow-hidden flex flex-col relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-20 animate-scan" />
                <CardHeader className="py-3 px-4 border-b border-green-900 bg-green-900/10 flex flex-row justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <Server className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-bold uppercase text-green-600">Terminal de Salida en Tiempo Real</span>
                    </div>
                </CardHeader>
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm scroll-smooth"
                >
                    {logs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-green-900 italic">
                            [ Sistema en espera. Inicie la simulación para recibir telemetría... ]
                        </div>
                    )}
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 items-start border-l-2 border-green-900 pl-3 hover:bg-green-900/10 p-1 transition-colors">
                            <span className="text-xs text-green-700 whitespace-nowrap min-w-[70px]">{log.timestamp}</span>
                            <span className="uppercase font-bold text-xs min-w-[80px]" style={{ color: log.actor === 'Sistema' ? '#6b7280' : log.actor === 'Estudiante' ? '#60a5fa' : log.actor === 'Profesor' ? '#facc15' : '#4ade80' }}>
                                [{log.actor}]
                            </span>
                            <div className="flex-1">
                                <span className={`uppercase text-xs font-bold mr-2 ${log.status === 'success' ? 'text-green-500' : log.status === 'error' ? 'text-red-500' : 'text-orange-500'}`}>
                                    {log.action}:
                                </span>
                                <span className="text-green-100/80">{log.details}</span>
                            </div>
                            <span className="text-xs text-green-800 w-[60px] text-right">{log.latency}ms</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
