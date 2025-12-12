import { FieldValue } from "firebase/firestore";

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'director' | 'orientador' | 'profesor';
}

export interface Group {
    id: string;
    name: string;
    semester: number;
    cycleId: string;
    counselorId: string; 
}

export interface Student {
    id: string;
    name: string;
    email: string;
    groupId: string;
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
    dayOfWeek: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
    timeSlot: string; // e.g., "09:00-10:00"
}

export interface Attendance {
    id: string;
    studentId: string;
    date: string; // YYYY-MM-DD
    present: boolean;
    subjectId: string;
    groupId: string;
}

export type RecipientFilter = "all" | "teachers" | "counselors" | "students";

export interface Message {
    id: string;
    content: string;
    recipientFilter: RecipientFilter;
    timestamp: FieldValue;
}


// NUEVO TIPO PARA CALIFICACIONES
export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    grade: number;
    partial: 1 | 2 | 3; // Periodo de evaluación (1er, 2º, 3er parcial)
    createdAt: FieldValue;
}
