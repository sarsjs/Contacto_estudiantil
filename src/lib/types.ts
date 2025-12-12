export type UserRole = "director" | "orientador" | "profesor" | "estudiante";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  email: string;
  curp?: string;
  matricula?: string;
}

export interface Group {
  id: string;
  name: string;
  cycleId: string;
  counselorId: string;
  semester: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  groupId: string;
  grades: { subjectId: string; grade: number | null }[];
  curp?: string;
  matricula?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
}

export interface SchoolCycle {
  id: string;
  name: string;
}

export interface TimetableEntry {
  id: string;
  groupId: string;
  subjectId: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
  time: string;
}

export interface Attendance {
    studentId: string;
    date: string; // YYYY-MM-DD
    present: boolean;
}

export interface SecurityAlert {
  id: string;
  studentId: string;
  timestamp: string;
  type: 'unauthorized_exit' | 'authorized_exit';
  details: string;
  authorizationId?: string;
}
