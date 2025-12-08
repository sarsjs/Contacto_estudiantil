import { User, Student, Group, Subject, SchoolCycle, TimetableEntry, Attendance, SecurityAlert } from './types';

export const users: User[] = [
  { id: 'user-1', name: 'Dra. Evelyn Reed', role: 'director', avatarUrl: 'https://picsum.photos/seed/1/100/100', email: 'e.reed@school.com' },
  { id: 'user-2', name: 'Lic. Samuel Chen', role: 'orientador', avatarUrl: 'https://picsum.photos/seed/2/100/100', email: 's.chen@school.com' },
  { id: 'user-3', name: 'Profa. Anya Sharma', role: 'profesor', avatarUrl: 'https://picsum.photos/seed/3/100/100', email: 'a.sharma@school.com' },
  { id: 'user-4', name: 'Alex Johnson', role: 'estudiante', avatarUrl: 'https://picsum.photos/seed/4/100/100', email: 'a.johnson@student.com' },
  { id: 'user-5', name: 'Lic. Marcus Holloway', role: 'orientador', avatarUrl: 'https://picsum.photos/seed/5/100/100', email: 'm.holloway@school.com' },
  { id: 'user-6', name: 'Profa. Olivia Wells', role: 'profesor', avatarUrl: 'https://picsum.photos/seed/6/100/100', email: 'o.wells@school.com' },
  { id: 'user-7', name: 'Prof. David Grant', role: 'profesor', avatarUrl: 'https://picsum.photos/seed/7/100/100', email: 'd.grant@school.com' },
];

export const schoolCycles: SchoolCycle[] = [
  { id: 'cycle-1', name: 'Ciclo Escolar 2023-2024' },
  { id: 'cycle-2', name: 'Ciclo Escolar 2024-2025' },
];

export const groups: Group[] = [
  { id: 'group-1', name: 'Grupo A', cycleId: 'cycle-2', counselorId: 'user-2', semester: 1 },
  { id: 'group-2', name: 'Grupo B', cycleId: 'cycle-2', counselorId: 'user-2', semester: 1 },
  { id: 'group-3', name: 'Grupo A', cycleId: 'cycle-2', counselorId: 'user-5', semester: 3 },
  { id: 'group-4', name: 'Grupo C', cycleId: 'cycle-2', counselorId: 'user-2', semester: 2 },
];

export const subjects: Subject[] = [
  { id: 'subj-1', name: 'Matemáticas', teacherId: 'user-3' },
  { id: 'subj-2', name: 'Física', teacherId: 'user-6' },
  { id: 'subj-3', name: 'Historia', teacherId: 'user-7' },
  { id: 'subj-4', name: 'Literatura', teacherId: 'user-3' },
];

export const students: Student[] = [
  { id: 'student-1', name: 'Alex Johnson', email: 'a.johnson@student.com', avatarUrl: 'https://picsum.photos/seed/4/100/100', groupId: 'group-1', grades: [
    { subjectId: 'subj-1', grade: 88 },
    { subjectId: 'subj-2', grade: 92 },
    { subjectId: 'subj-3', grade: 76 },
  ]},
  { id: 'student-2', name: 'Maria Garcia', email: 'm.garcia@student.com', avatarUrl: 'https://picsum.photos/seed/11/100/100', groupId: 'group-1', grades: [
    { subjectId: 'subj-1', grade: 95 },
    { subjectId: 'subj-2', grade: 89 },
    { subjectId: 'subj-3', grade: 91 },
  ]},
  { id: 'student-3', name: 'Ben Carter', email: 'b.carter@student.com', avatarUrl: 'https://picsum.photos/seed/12/100/100', groupId: 'group-2', grades: [
    { subjectId: 'subj-1', grade: 75 },
    { subjectId: 'subj-2', grade: 82 },
    { subjectId: 'subj-3', grade: 88 },
  ]},
  { id: 'student-4', name: 'Chloe Kim', email: 'c.kim@student.com', avatarUrl: 'https://picsum.photos/seed/13/100/100', groupId: 'group-3', grades: [
    { subjectId: 'subj-1', grade: 91 },
    { subjectId: 'subj-2', grade: null },
    { subjectId: 'subj-3', grade: 85 },
  ]},
];

export const timetable: TimetableEntry[] = [
  { id: 'tt-1', groupId: 'group-1', subjectId: 'subj-1', day: 'Lunes', time: '09:00 - 10:00' },
  { id: 'tt-2', groupId: 'group-1', subjectId: 'subj-2', day: 'Martes', time: '10:00 - 11:00' },
  { id: 'tt-3', groupId: 'group-1', subjectId: 'subj-3', day: 'Miércoles', time: '11:00 - 12:00' },
  { id: 'tt-4', groupId: 'group-1', subjectId: 'subj-4', day: 'Jueves', time: '09:00 - 10:00' },
  { id: 'tt-5', groupId: 'group-2', subjectId: 'subj-1', day: 'Lunes', time: '10:00 - 11:00' },
];

export const attendance: Attendance[] = [
    { studentId: 'student-1', date: '2024-05-20', present: true },
    { studentId: 'student-2', date: '2024-05-20', present: true },
    // student-4 in group-1 has no attendance record for this date, so is absent
];

export const securityAlerts: SecurityAlert[] = [
    { 
        id: 'alert-1', 
        studentId: 'student-2', 
        timestamp: '2024-05-20 10:30:00',
        type: 'unauthorized_exit',
        details: 'Salida no autorizada del plantel. Clases pendientes.'
    },
    { 
        id: 'alert-2', 
        studentId: 'student-4', 
        timestamp: '2024-05-20 11:15:00',
        type: 'authorized_exit',
        details: 'Salida autorizada por Director.',
        authorizationId: 'DIR-2024-05-20-1112'
    },
];
