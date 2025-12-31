'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Users, BookOpen, Calendar, Clock } from 'lucide-react';
import { fetchUsers, fetchGroups, fetchSubjects } from '@/lib/firebase/data';
import type { User, Group, Subject } from '@/lib/types';

interface IntegrityIssue {
    type: 'warning' | 'error' | 'info';
    category: string;
    message: string;
    count?: number;
    details?: string[];
}

export default function IntegrityDashboard() {
    const [issues, setIssues] = React.useState<IntegrityIssue[]>([]);
    const [metrics, setMetrics] = React.useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalCounselors: 0,
        totalGroups: 0,
        totalSubjects: 0,
    });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        analyzeSystem();
    }, []);

    const analyzeSystem = async () => {
        setLoading(true);
        try {
            const [users, groups, subjects] = await Promise.all([
                fetchUsers(),
                fetchGroups(),
                fetchSubjects(),
            ]);

            const students = users.filter(u => u.role === 'estudiante' || u.role === 'alumno');
            const teachers = users.filter(u => u.role === 'profesor');
            const counselors = users.filter(u => u.role === 'orientador');

            setMetrics({
                totalStudents: students.length,
                totalTeachers: teachers.length,
                totalCounselors: counselors.length,
                totalGroups: groups.length,
                totalSubjects: subjects.length,
            });

            const foundIssues: IntegrityIssue[] = [];

            // 1. Alumnos sin grupo
            const studentsWithoutGroup = students.filter(s => !s.groupId);
            if (studentsWithoutGroup.length > 0) {
                foundIssues.push({
                    type: 'warning',
                    category: 'Alumnos',
                    message: `${studentsWithoutGroup.length} alumno(s) sin grupo asignado`,
                    count: studentsWithoutGroup.length,
                    details: studentsWithoutGroup.map(s => s.name),
                });
            }

            // 2. Grupos sin orientador
            const groupsWithoutCounselor = groups.filter(g => !g.counselorId);
            if (groupsWithoutCounselor.length > 0) {
                foundIssues.push({
                    type: 'error',
                    category: 'Grupos',
                    message: `${groupsWithoutCounselor.length} grupo(s) sin orientador asignado`,
                    count: groupsWithoutCounselor.length,
                    details: groupsWithoutCounselor.map(g => g.name),
                });
            }

            // 3. Materias sin profesor
            const subjectsWithoutTeacher = subjects.filter(s => !s.teacherId);
            if (subjectsWithoutTeacher.length > 0) {
                foundIssues.push({
                    type: 'warning',
                    category: 'Materias',
                    message: `${subjectsWithoutTeacher.length} materia(s) sin profesor asignado`,
                    count: subjectsWithoutTeacher.length,
                    details: subjectsWithoutTeacher.map(s => s.name),
                });
            }

            // 4. Profesores sin materias
            const teachersWithSubjects = new Set(subjects.map(s => s.teacherId));
            const teachersWithoutSubjects = teachers.filter(t => !teachersWithSubjects.has(t.id));
            if (teachersWithoutSubjects.length > 0) {
                foundIssues.push({
                    type: 'info',
                    category: 'Profesores',
                    message: `${teachersWithoutSubjects.length} profesor(es) sin materias asignadas`,
                    count: teachersWithoutSubjects.length,
                    details: teachersWithoutSubjects.map(t => t.name),
                });
            }

            // 5. Carga horaria por profesor (estimación)
            const teacherWorkload = teachers.map(teacher => {
                const teacherSubjects = subjects.filter(s => s.teacherId === teacher.id);
                // Estimación: cada materia = 5 horas semanales (ajustable)
                const hoursPerWeek = teacherSubjects.length * 5;
                return { name: teacher.name, subjects: teacherSubjects.length, hours: hoursPerWeek };
            });

            const overloadedTeachers = teacherWorkload.filter(t => t.hours > 30);
            if (overloadedTeachers.length > 0) {
                foundIssues.push({
                    type: 'warning',
                    category: 'Carga Horaria',
                    message: `${overloadedTeachers.length} profesor(es) con carga excesiva (>30 hrs/semana)`,
                    count: overloadedTeachers.length,
                    details: overloadedTeachers.map(t => `${t.name}: ${t.hours} hrs/semana`),
                });
            }

            // 6. Grupos sin alumnos
            const groupsWithStudents = new Set(students.map(s => s.groupId).filter(Boolean));
            const emptyGroups = groups.filter(g => !groupsWithStudents.has(g.id));
            if (emptyGroups.length > 0) {
                foundIssues.push({
                    type: 'info',
                    category: 'Grupos',
                    message: `${emptyGroups.length} grupo(s) sin alumnos inscritos`,
                    count: emptyGroups.length,
                    details: emptyGroups.map(g => g.name),
                });
            }

            setIssues(foundIssues);
        } catch (error) {
            console.error('Error analyzing system:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
            case 'info': return <AlertTriangle className="h-5 w-5 text-blue-500" />;
            default: return <CheckCircle className="h-5 w-5 text-green-500" />;
        }
    };

    const getBadgeVariant = (type: string) => {
        switch (type) {
            case 'error': return 'destructive';
            case 'warning': return 'default';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Métricas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Alumnos</p>
                                <p className="text-2xl font-bold">{metrics.totalStudents}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500 opacity-75" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Profesores</p>
                                <p className="text-2xl font-bold">{metrics.totalTeachers}</p>
                            </div>
                            <Users className="h-8 w-8 text-green-500 opacity-75" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Orientadores</p>
                                <p className="text-2xl font-bold">{metrics.totalCounselors}</p>
                            </div>
                            <Users className="h-8 w-8 text-purple-500 opacity-75" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Grupos</p>
                                <p className="text-2xl font-bold">{metrics.totalGroups}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-orange-500 opacity-75" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Materias</p>
                                <p className="text-2xl font-bold">{metrics.totalSubjects}</p>
                            </div>
                            <BookOpen className="h-8 w-8 text-indigo-500 opacity-75" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Panel de Integridad */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Panel de Integridad del Sistema
                    </CardTitle>
                    <CardDescription>
                        Detecta automáticamente inconsistencias y áreas que requieren atención
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Analizando sistema...</div>
                    ) : issues.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            <p className="text-lg font-semibold text-green-700">¡Sistema en perfecto estado!</p>
                            <p className="text-sm text-muted-foreground mt-1">No se detectaron inconsistencias</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {issues.map((issue, idx) => (
                                <div
                                    key={idx}
                                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        {getIcon(issue.type)}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={getBadgeVariant(issue.type) as any}>
                                                    {issue.category}
                                                </Badge>
                                                <span className="font-medium">{issue.message}</span>
                                            </div>
                                            {issue.details && issue.details.length > 0 && (
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                                        Ver detalles ({issue.details.length})
                                                    </summary>
                                                    <ul className="mt-2 ml-4 space-y-1 text-sm">
                                                        {issue.details.slice(0, 10).map((detail, i) => (
                                                            <li key={i} className="text-muted-foreground">• {detail}</li>
                                                        ))}
                                                        {issue.details.length > 10 && (
                                                            <li className="text-muted-foreground italic">
                                                                ... y {issue.details.length - 10} más
                                                            </li>
                                                        )}
                                                    </ul>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
