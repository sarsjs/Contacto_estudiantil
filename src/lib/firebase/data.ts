import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc, writeBatch, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./client";
import type { User, Group, Student, Subject, TimetableEntry, Attendance, Message, Grade } from "@/lib/types";

const fetchData = async <T>(fetchFunction: () => Promise<T[]>, entityName: string): Promise<T[]> => {
  try {
    return await fetchFunction();
  } catch (error) {
    console.error(`Error fetching ${entityName}:`, error);
    return []; // Return an empty array on error to prevent crashes
  }
};

// Fetch functions
export const fetchUsers = async (): Promise<User[]> => fetchData(async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
}, 'users');

export const fetchUserByEmail = async (email: string): Promise<User | null> => {
    try {
        const normalized = email.trim().toLowerCase();
        const q = query(collection(db, "users"), where("email", "==", normalized));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return { id: userDoc.id, ...userDoc.data() } as unknown as User;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user by email:", error);
        return null;
    }
};

export const fetchGroups = async (): Promise<Group[]> => fetchData(async () => {
  const querySnapshot = await getDocs(collection(db, "groups"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));
}, 'groups');

export const fetchGroupsByCounselor = async (counselorId: string): Promise<Group[]> => fetchData(async () => {
    const q = query(collection(db, "groups"), where("counselorId", "==", counselorId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));
}, 'groups by counselor');

export const fetchGroupsBySubject = async (subjectId: string): Promise<Group[]> => fetchData(async () => {
    const timetableQuery = query(collection(db, "timetables"), where("subjectId", "==", subjectId));
    const timetableSnapshot = await getDocs(timetableQuery);
    const groupIds = [...new Set(timetableSnapshot.docs.map(doc => doc.data().groupId as string))];
    if (groupIds.length === 0) return [];
    const allGroups = await fetchGroups();
    return allGroups.filter(group => groupIds.includes(group.id));
}, 'groups by subject');

export const fetchSubjects = async (): Promise<Subject[]> => fetchData(async () => {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Subject));
}, 'subjects');

export const fetchSubjectsByTeacher = async (teacherId: string): Promise<Subject[]> => fetchData(async () => {
    const q = query(collection(db, "subjects"), where("teacherId", "==", teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Subject));
}, 'subjects by teacher');

export const fetchStudents = async (): Promise<Student[]> => fetchData(async () => {
    const querySnapshot = await getDocs(collection(db, "students"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Student));
}, 'students');

export const fetchStudentsByGroup = async (groupId: string): Promise<Student[]> => fetchData(async () => {
    const q = query(collection(db, "students"), where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Student));
}, 'students by group');

export const fetchStudentByEmail = async (email: string): Promise<Student | null> => {
    try {
        const q = query(collection(db, "students"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const studentDoc = querySnapshot.docs[0];
        return { id: studentDoc.id, ...studentDoc.data() } as unknown as Student;
    } catch (error) {
        console.error('Error fetching student by email:', error);
        return null;
    }
};

export const fetchTimetableByGroup = async (groupId: string): Promise<TimetableEntry[]> => fetchData(async () => {
    const q = query(collection(db, "timetables"), where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TimetableEntry));
}, 'timetable by group');

export const fetchAllTimetables = async (): Promise<TimetableEntry[]> => fetchData(async () => {
    const querySnapshot = await getDocs(collection(db, "timetables"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TimetableEntry));
}, 'all timetables');

export const fetchMessages = async (): Promise<Message[]> => fetchData(async () => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Message));
}, 'messages');

export const fetchAttendanceForDate = async (date: string): Promise<Attendance[]> => fetchData(async () => {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Attendance));
}, 'attendance for date');

export const fetchAttendanceByStudent = async (studentId: string): Promise<Attendance[]> => fetchData(async () => {
    const q = query(collection(db, "attendance"), where("studentId", "==", studentId), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Attendance));
}, 'attendance by student');

export const fetchGradesBySubjectAndGroup = async (subjectId: string, groupId: string): Promise<Grade[]> => fetchData(async () => {
    const q = query(collection(db, "grades"), where("subjectId", "==", subjectId), where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Grade));
}, 'grades by subject and group');

export const fetchGradesByStudent = async (studentId: string): Promise<Grade[]> => fetchData(async () => {
    const q = query(collection(db, "grades"), where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Grade));
}, 'grades by student');

// Add/Update functions
export const addGroup = async (group: Omit<Group, "id">) => await addDoc(collection(db, "groups"), group);
export const updateGroup = async (groupId: string, data: Partial<Group>) => await updateDoc(doc(db, "groups", groupId), data);
export const addStudent = async (student: Omit<Student, "id">) => await addDoc(collection(db, "students"), student);
export const updateStudent = async (studentId: string, data: Partial<Student>) => await updateDoc(doc(db, "students", studentId), data);
export const addSubject = async (subject: Omit<Subject, "id">) => await addDoc(collection(db, "subjects"), subject);
export const updateSubject = async (subjectId: string, data: Partial<Subject>) => await updateDoc(doc(db, "subjects", subjectId), data);
export const addUser = async (user: Omit<User, "id">) => await addDoc(collection(db, "users"), user);
export const updateUser = async (userId: string, data: Partial<User>) => await updateDoc(doc(db, "users", userId), data);
export const addTimetableEntry = async (entry: Omit<TimetableEntry, "id">) => await addDoc(collection(db, "timetables"), entry);
export const addMessage = async (message: Omit<Message, "id">) => await addDoc(collection(db, "messages"), { ...message, timestamp: serverTimestamp() });

export const setAttendanceBatch = async (records: Omit<Attendance, "id">[]) => {
    const batch = writeBatch(db);
    for (const record of records) {
        const docId = `${record.studentId}_${record.date}_${record.subjectId}`;
        const attendanceRef = doc(db, "attendance", docId);
        batch.set(attendanceRef, record, { merge: true });
    }
    await batch.commit();
};

export const setGradeBatch = async (records: Omit<Grade, "id" | "createdAt">[]) => {
    const batch = writeBatch(db);
    for (const record of records) {
        const docId = `${record.studentId}_${record.subjectId}_${record.partial}`;
        const gradeRef = doc(db, "grades", docId);
        batch.set(gradeRef, { ...record, createdAt: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
};


// Delete functions
export const deleteGroup = async (groupId: string) => await deleteDoc(doc(db, "groups", groupId));
export const deleteStudent = async (studentId: string) => await deleteDoc(doc(db, "students", studentId));
export const deleteSubject = async (subjectId: string) => await deleteDoc(doc(db, "subjects", subjectId));
export const deleteUser = async (userId: string) => await deleteDoc(doc(db, "users", userId));
