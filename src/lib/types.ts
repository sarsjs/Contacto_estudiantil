import { FieldValue } from "firebase/firestore";

export type UserRole = 'admin' | 'director' | 'orientador' | 'profesor' | 'estudiante' | 'alumno';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    groupId?: string;
    groups?: string[];
    matricula?: string;
    avatarUrl?: string;
    gpsStatus?: 'inside' | 'outside' | 'coming' | 'unknown';
    lastGpsUpdate?: FieldValue;
    xp?: number;
    level?: number;
    badges?: string[];
}

export interface Group {
    id: string;
    name: string;
    semester: number;
    cycleId: string;
    counselorId: string;
    tempCounselorId?: string; // ID del orientador suplente
    absenceStatus?: {
        isActive: boolean;
        message?: string;
    };
}

export interface Student {
    id: string;
    name: string;
    email: string;
    groupId?: string;
    matricula?: string;
    avatarUrl?: string;
    gpsStatus?: 'inside' | 'outside' | 'coming' | 'unknown';
    lastGpsUpdate?: FieldValue;
    xp?: number;
    level?: number;
    badges?: string[];
}

export interface Subject {
    id: string;
    name: string;
    teacherId: string;
}

export interface TimetableEntry {
    id: string;
    groupId: string;
    subjectId: string;
    day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
    time: string; // e.g., "09:00 - 10:00"
}

export interface Attendance {
    id: string;
    studentId: string;
    date: string; // YYYY-MM-DD
    present: boolean;
    subjectId: string;
    groupId: string;
}

export type RecipientFilter =
    | "all"           // Todos los usuarios
    | "personal"      // Todo el personal (director, orientadores, profesores)
    | "teachers"      // Solo profesores
    | "counselors"    // Solo orientadores
    | "students"      // Todos los estudiantes
    | "director"      // Solo director
    | "group"         // Grupo específico
    | "student"       // Estudiante específico
    | "myStudents"    // Solo estudiantes de las materias que imparto
    | "myGroups"      // Solo estudiantes de los grupos de mis materias
    | "myCounselor"   // Solo mi orientador (para estudiantes)
    | "myTeacher"     // Solo profesores de mi grupo (para estudiantes)
    | "specificClass" // Clase específica
    | "specificTeacher" // Profesor específico
    | "specificCounselor" // Orientador específico
    | "specificGroupStudents"; // Solo estudiantes de un grupo específico

export interface Message {
    id: string;
    content: string;
    recipientFilter: RecipientFilter;
    recipientLabel?: string;
    recipientId?: string;
    timestamp: FieldValue;
    createdBy?: string;
    createdByRole?: User['role'];
}

export type CalendarVisibility =
    | 'personal'
    | 'orientadores'
    | 'maestros'
    | 'alumnos'
    | 'todos';


// NUEVO TIPO PARA CALIFICACIONES
export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    grade: number;
    partial: 1 | 2 | 3; // Periodo de evaluación (1er, 2º, 3er parcial)
    createdAt: FieldValue;
}

export interface SubstitutionRequest {
    id: string;
    fromCounselorId: string;
    toCounselorId: string;
    groupIds: string[];
    status: 'pending' | 'accepted' | 'declined';
    message?: string;
    timestamp: FieldValue;
}

export interface AppConfig {
    id: string;
    appName: string;
    appLogoUrl?: string; // Icono de la sidebar
    schoolLogoUrl?: string; // Logo de la pantalla de login
    institutionName: string; // Ej: "Panel Institucional EPO 264"
    terminology: {
        orientador: string; // "Orientador", "Prefecto", etc.
        semestre: string; // "Semestre", "Cuatrimestre", etc.
        grado: string; // "Grado", "Nivel", etc.
        alumno: string; // "Alumno", "Estudiante", etc.
    };
    geofence: {
        enabled: boolean;
        center: { lat: number; lng: number };
        radius: number; // en metros
        points?: { lat: number; lng: number }[]; // Para polígonos
    };
    features: {
        badges: boolean;
        attendanceGps: boolean;
        attendanceQr: boolean;
        grades: boolean;
    };
    theme: {
        primaryColor: string;
    };
}

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    date: string; // YYYY-MM-DD
    createdAt: FieldValue;
    createdBy?: string;
    createdByRole?: User['role'];
    visibility?: CalendarVisibility[];
}

export interface WorkLog {
    id: string;
    userId: string;
    userName: string;
    date: string; // YYYY-MM-DD
    checkIn?: FieldValue;
    checkOut?: FieldValue;
    status: 'present' | 'late' | 'absent';
    totalHours?: number;
}

export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: FieldValue;
}

export interface ActivityLog {
    id: string;
    action: string;      // e.g., "USUARIO_CREADO", "GRUPO_ASIGNADO"
    details: string;     // Descripción legible de la acción
    targetId?: string;   // ID del recurso afectado (ej. ID del alumno)
    targetType?: 'user' | 'group' | 'subject' | 'event' | 'timetable';
    createdBy: string;   // ID del usuario que realizó la acción
    creatorName: string; // Nombre para visualización rápida
    creatorRole: UserRole;
    timestamp: FieldValue;
    ip?: string;         // Opcional: para rastro de seguridad
}
