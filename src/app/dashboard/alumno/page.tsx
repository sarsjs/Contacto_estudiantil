'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import {
  fetchStudentByEmail,
  fetchTimetableByGroup,
  fetchSubjects,
  fetchGradesByStudent,
  fetchUsers,
  verifyAttendanceToken,
  logActivity
} from '@/lib/firebase/data';
import type { Student, TimetableEntry, Subject, Grade, Group, User } from '@/lib/types';
import { StudentSchedule } from '@/components/dashboard/student-schedule';
import { StudentGrades } from '@/components/dashboard/student-grades';
import { useAppConfig } from '@/context/config-context';
import { verifyUserLocation } from '@/lib/gps-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Camera,
  AlertCircle,
  UserCircle,
  ShieldCheck,
  KeyRound,
  MapPin,
  GraduationCap,
  CheckCircle2,
  MessageSquare,
  BookOpen,
  Trophy
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { AchievementShowcase } from '@/components/dashboard/achievement-showcase';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function AlumnoPage() {
  const { profile: user } = useAuth();
  const { config } = useAppConfig();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [schedule, setSchedule] = React.useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [tempCounselor, setTempCounselor] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [validationCode, setValidationCode] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const { toast } = useToast();

  const handleVerifyAttendance = async () => {
    if (validationCode.length !== 4) {
      toast({ title: "Código incompleto", description: "Debes ingresar los 4 dígitos." });
      return;
    }

    setIsVerifying(true);
    try {
      // 1. Verificar GPS primero
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const gpsResult = await verifyUserLocation(position, config?.geofence ? {
        latitude: config.geofence.center.lat,
        longitude: config.geofence.center.lng,
        radius: config.geofence.radius
      } : undefined);
      if (!gpsResult.isInside) {
        toast({
          title: "Fuera de rango",
          description: "Debes estar dentro del plantel para marcar asistencia.",
          variant: "destructive"
        });
        return;
      }

      // 2. Verificar Token Dinámico
      const token = await verifyAttendanceToken(student?.groupId || "", validationCode);
      if (token) {
        // REGISTRO DE LOG
        await logActivity({
          action: 'ASISTENCIA_ALUMNO',
          details: `El alumno validó su asistencia en el plantel mediante código GPS.`,
          targetId: student?.id || 'unknown',
          targetType: 'user',
          createdBy: user?.id || 'system',
          creatorName: user?.name || 'Alumno',
          creatorRole: 'estudiante'
        });

        toast({ title: "Asistencia Confirmada", description: "¡Qué tengas una excelente clase!" });
        setValidationCode("");
        // Podríamos disparar un reload o actualizar el estado de asistencias si tuviéramos uno local
      } else {
        toast({ title: "Código inválido", description: "El código es incorrecto o ya expiró.", variant: "destructive" });
      }

    } catch (err) {
      console.error("Verification error:", err);
      toast({ title: "Error", description: "Permiso de GPS denegado o error de conexión.", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };
  React.useEffect(() => {
    const loadStudentData = async () => {
      if (!user || !user.email) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const currentStudent = await fetchStudentByEmail(user.email);
        if (!currentStudent) {
          setError('No se encontró tu perfil de estudiante.');
          return;
        }
        setStudent(currentStudent);

        const allSubjects = await fetchSubjects();
        setSubjects(allSubjects);

        if (currentStudent.groupId) {
          const [timetableData, gradesData, allGroups, allUsers] = await Promise.all([
            fetchTimetableByGroup(currentStudent.groupId),
            fetchGradesByStudent(currentStudent.id),
            fetchGroups(),
            fetchUsers()
          ]);
          setSchedule(timetableData);
          setGrades(gradesData);

          const studentGroup = allGroups.find(g => g.id === currentStudent.groupId);
          if (studentGroup) {
            setGroup(studentGroup);
            if (studentGroup.tempCounselorId) {
              const counselor = allUsers.find(u => u.id === studentGroup.tempCounselorId);
              setTempCounselor(counselor || null);
            }
          }
        } else {
          setSchedule([]);
          setGrades([]);
        }

      } catch (err) {
        console.error('Error loading student data:', err);
        setError('Ocurrió un error al cargar tu perfil. Verifica tu conexión o contacta a soporte.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [user]);

  // Cálculos para el Panel Principal
  const stats = React.useMemo(() => {
    if (!student) return null;

    const validGrades = grades.filter(g => g.grade !== null);
    const avg = validGrades.length > 0
      ? (validGrades.reduce((acc, curr) => acc + curr.grade!, 0) / validGrades.length).toFixed(1)
      : '0.0';

    return {
      average: avg,
      completedSubjects: validGrades.length,
      totalSubjects: subjects.length,
      attendanceRate: '92%' // Mock para visualización
    };
  }, [student, grades, subjects]);



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Hola, {student?.name?.split(' ')[0] || 'Estudiante'} 👋</h1>
          <p className="text-muted-foreground font-medium">{config?.institutionName || 'Panel Académico Institucional EPO 264'}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-xs font-black uppercase text-primary">{group?.name || 'Sin Grupo'}</span>
        </div>
      </div>

      {/* Sistema de Gamificación - Vistazo Premium */}
      {config?.features.badges && (
        <AchievementShowcase
          xp={student?.xp || 750}
          level={student?.level || 3}
          unlockedBadges={student?.badges || ['reloj_precision', 'buscador_oro']}
          userName={student?.name?.split(' ')[0]}
        />
      )}

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Promedio General"
          value={stats?.average || '0.0'}
          icon={Trophy}
          description="Rendimiento actual"
        />
        <StatCard
          title="Materias"
          value={`${stats?.completedSubjects || 0}/${stats?.totalSubjects || 0}`}
          icon={BookOpen}
          description="Progreso de ciclo"
        />
        <StatCard
          title="Asistencia"
          value={stats?.attendanceRate || '0%'}
          icon={CheckCircle2}
          description="Presencia en plantel"
        />
        <StatCard
          title="Mensajes"
          value="0"
          icon={MessageSquare}
          description="Nuevas notificaciones"
        />
      </div>

      {group?.absenceStatus?.isActive && (
        <Card className="border-blue-500/20 bg-blue-500/5 shadow-lg overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="h-24 w-24 text-blue-500" />
            </div>
            <div className="flex items-start gap-5 relative z-10">
              <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-blue-500 uppercase tracking-widest text-xs flex items-center gap-2">
                  Aviso de Suplencia Activa
                  <span className="animate-ping flex h-2 w-2 rounded-full bg-blue-500"></span>
                </h4>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {group.absenceStatus.message || "Tu orientador titular ha notificado una ausencia temporal."}
                </p>
                {tempCounselor && (
                  <div className="pt-2">
                    <span className="text-[10px] font-black uppercase bg-blue-500 text-white px-2 py-1 rounded">
                      Suplente: {tempCounselor.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {
        student && config?.features.attendanceGps && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">CÓDIGO DE ASISTENCIA</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Validación de Presencia en Clase</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <KeyRound className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="0000"
                      className="pl-12 h-12 text-2xl tracking-[0.6em] font-black uppercase text-center bg-background border-border focus:ring-primary/20"
                      maxLength={4}
                      value={validationCode}
                      onChange={(e) => setValidationCode(e.target.value)}
                    />
                  </div>
                  <Button
                    className="h-12 px-10 w-full sm:w-auto font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                    onClick={handleVerifyAttendance}
                    disabled={isVerifying || validationCode.length < 4}
                  >
                    {isVerifying ? "Verificando..." : "Validar Asistencia"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span>Para validar, debes estar físicamente dentro del plantel.</span>
                </div>
              </CardContent>
            </Card>

          </div>
        )
      }

      {
        isLoading ? (
          <p>Cargando tu información...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : student?.groupId ? (
          <div className="space-y-6">
            <StudentSchedule schedule={schedule} subjects={subjects} />
            <StudentGrades grades={grades} subjects={subjects} />
          </div>
        ) : (
          <p>Aún no estás asignado a un grupo. Tu horario y calificaciones aparecerán aquí cuando se te asigne uno.</p>
        )
      }



    </div >
  );
}
