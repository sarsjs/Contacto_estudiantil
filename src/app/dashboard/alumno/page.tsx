'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import {
  fetchStudentByEmail,
  fetchTimetableByGroup,
  fetchSubjects,
  fetchGradesByStudent,
  uploadStudentPhoto,
  deleteStudentPhoto,
  fetchGroups,
  fetchUsers,
  verifyAttendanceToken
} from '@/lib/firebase/data';
import type { Student, TimetableEntry, Subject, Grade, Group, User } from '@/lib/types';
import { StudentSchedule } from '@/components/dashboard/student-schedule';
import { StudentGrades } from '@/components/dashboard/student-grades';
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
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function AlumnoPage() {
  const { profile: user } = useAuth();
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

      const gpsResult = await verifyUserLocation(position);
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

  const handleDownloadCard = async () => {
    if (student) {
      try {
        toast({
          title: "Generando imágenes...",
          description: "La descarga de ambas caras iniciará en un momento.",
        });

        // Opciones de configuración para mejor calidad
        const options = { cacheBust: true, pixelRatio: 3 };

        // 1. Capturar Frente
        const frontUrl = await toPng(document.getElementById('credential-front') as HTMLElement, options);
        const linkFront = document.createElement('a');
        linkFront.download = `EPO264_Credencial_Frente_${student.matricula || 'Alumno'}.png`;
        linkFront.href = frontUrl;
        document.body.appendChild(linkFront);
        linkFront.click();
        document.body.removeChild(linkFront);

        // Pequeña pausa para evitar bloqueo de popups
        await new Promise(resolve => setTimeout(resolve, 800));

        // 2. Capturar Reverso
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
          description: "No se pudieron generar las imágenes. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePhotoUpdate = async (photoUrl: string) => {
    if (student) {
      setStudent({
        ...student,
        avatarUrl: photoUrl
      });

      toast({
        title: "Foto actualizada",
        description: "La foto de tu credencial ha sido actualizada.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Hola, {student?.name?.split(' ')[0] || 'Estudiante'} 👋</h1>
          <p className="text-muted-foreground font-medium">Panel Académico Institucional EPO 264</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-xs font-black uppercase text-primary">{group?.name || 'Sin Grupo'}</span>
        </div>
      </div>

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
        student && (
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

            <Card className="border-none shadow-xl overflow-hidden bg-transparent">
              <CardHeader className="px-0 pt-0">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Tu Credencial Oficial</CardTitle>
                    <CardDescription className="text-xs font-medium">Validación Digital EPO 264</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadCard} className="h-8 text-[10px] font-black uppercase tracking-widest bg-background">
                    <Download className="h-3 w-3 mr-2" />
                    Descargar
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto pb-6">
                <div className="flex flex-col xl:flex-row gap-8 justify-center items-center">

                  {/* FRONT SIDE */}
                  <div id="credential-front" className="w-[325px] h-[205px] bg-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col border border-gray-200 select-none">

                    {/* Official Decoration Background */}
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-[#8B1A2B]/10 to-transparent rounded-full -mr-10 -mt-10 z-0" />
                    <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-gradient-to-tr from-gray-200/50 to-transparent rounded-full -ml-10 -mb-10 z-0" />

                    {/* Header Strip with Logos */}
                    <div className="h-[45px] w-full flex items-center justify-between px-3 pt-2 relative z-10 border-b border-gray-100/50 bg-white/80 backdrop-blur-sm">
                      <img src="/edomex.png" alt="Edomex" className="h-8 object-contain" />
                      <div className="flex-1 border-r border-gray-300 mx-2 h-6" />
                      <img src="/edu.png" alt="Secretaría de Educación" className="h-8 object-contain" />
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex p-3 gap-3 relative z-10">

                      {/* Left Column: Photo & Role */}
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
                          <p className="text-[6px] font-black uppercase tracking-widest">Estudiante</p>
                        </div>
                      </div>

                      {/* Right Column: Info */}
                      <div className="flex-1 flex flex-col">
                        {/* School Header */}
                        <div className="mb-1 relative">
                          <div className="absolute -right-2 -top-2 opacity-[0.08] pointer-events-none">
                            <img src="/logo-epo264.png" alt="Watermark" className="h-24 w-24 object-contain grayscale" />
                          </div>

                          <h3 className="text-[6px] font-bold text-gray-500 uppercase tracking-widest">Educación Media Superior</h3>
                          <h2 className="text-[11px] font-black text-gray-900 leading-tight uppercase font-serif">Escuela Preparatoria Oficial Núm. 264</h2>
                          <div className="h-0.5 w-10 bg-[#8B1A2B] mt-0.5 rounded-full" />
                        </div>

                        {/* Student Data Grid */}
                        <div className="space-y-1 mt-0.5">
                          <div>
                            <p className="text-[5px] text-gray-400 font-bold uppercase mb-[1px]">Nombre del Alumno</p>
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

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[5px] text-gray-400 font-bold uppercase mb-[1px]">C.U.R.P.</p>
                              <p className="text-[7px] font-bold text-gray-600 uppercase tracking-tight">{student.curp || "NO REGISTRADA"}</p>
                            </div>
                            <img src="/escudomex.png" alt="Escudo Edomex" className="h-8 w-8 object-contain opacity-80" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Strip */}
                    <div className="h-4 bg-[#F2F2F2] border-t border-gray-200 w-full flex items-center justify-between px-3">
                      <span className="text-[4px] font-bold text-gray-400 uppercase tracking-widest">Identificación Oficial Escolar</span>
                      <span className="text-[5px] font-bold text-[#8B1A2B] uppercase">C.C.T. 15EBH0264W</span>
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div id="credential-back" className="w-[325px] h-[205px] bg-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col border border-gray-200 select-none">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-50" />

                    <div className="relative p-5 flex gap-5 h-full items-center z-10">
                      {/* QR Code Section */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-[90px] h-[90px] bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm relative">
                          <div className="absolute inset-0 border-[3px] border-[#8B1A2B] rounded-lg opacity-10"></div>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${typeof window !== 'undefined' ? window.location.origin : ''}/validacion/${student.id}`}
                            alt="QR Validación"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[5px] font-bold text-gray-400 uppercase tracking-wider">Escanear para Validar</span>
                      </div>

                      {/* Info & Legal */}
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
                            Esta credencial es personal e intransferible y acredita al portador como alumno de la <span className="text-[#8B1A2B] font-bold">EPO 264</span>.
                            En caso de extravío, favor de reportarlo inmediatamente a la dirección escolar.
                          </p>
                        </div>

                        <div className="space-y-1 mt-auto">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                              <img src="/logo-epo264.png" className="h-5 w-5 object-contain opacity-80" />
                            </div>
                            <div className="flex-1">
                              <div className="h-px w-full bg-gray-300 mb-0.5"></div>
                              <p className="text-[5px] font-bold text-gray-400 uppercase text-center">Autoridad Escolar</p>
                            </div>
                          </div>
                          <div className="text-right pt-1">
                            <p className="text-[4px] font-mono text-gray-300">ID: {student.id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto bg-gradient-to-r from-gray-900 to-[#8B1A2B] h-2 w-full" />
                  </div>

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
