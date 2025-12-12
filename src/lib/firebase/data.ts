import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc, writeBatch, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./client";
import type { User, Group, Student, Subject, TimetableEntry, SecurityAlert, Attendance, Message, Grade } from "@/lib/types";

// Fetch functions
export const fetchUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
};

export const fetchUserByEmail = async (email: string): Promise<User | null> => {
    const normalized = email.trim().toLowerCase();
    const q = query(collection(db, "users"), where("email", "==", normalized));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as unknown as User;
    }
    const allSnapshot = await getDocs(collection(db, "users"));
    const match = allSnapshot.docs.find((docSnap) => {
        const docEmail = (docSnap.data() as { email?: string }).email;
        return docEmail?.toLowerCase() === normalized;
    });
    if (!match) return null;
    return { id: match.id, ...match.data() } as unknown as User;
};

export const fetchGroups = async (): Promise<Group[]> => {
  const querySnapshot = await getDocs(collection(db, "groups"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));
};

export const fetchGroupsByCounselor = async (counselorId: string): Promise<Group[]> => {
    const q = query(collection(db, "groups"), where("counselorId", "==", counselorId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));
};

export const fetchGroupsBySubject = async (subjectId: string): Promise<Group[]> => {
    const timetableQuery = query(collection(db, "timetables"), where("subjectId", "==", subjectId));
    const timetableSnapshot = await getDocs(timetableQuery);
    const groupIds = [...new Set(timetableSnapshot.docs.map(doc => doc.data().groupId as string))];
    if (groupIds.length === 0) return [];
    const allGroups = await fetchGroups();
    return allGroups.filter(group => groupIds.includes(group.id));
};

export const fetchSubjects = async (): Promise<Subject[]> => {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Subject));
};

export const fetchSubjectsByTeacher = async (teacherId: string): Promise<Subject[]> => {
    const q = query(collection(db, "subjects"), where("teacherId", "==", teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Subject));
};

export const fetchStudents = async (): Promise<Student[]> => {
    const querySnapshot = await getDocs(collection(db, "students"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Student));
};

export const fetchStudentsByGroup = async (groupId: string): Promise<Student[]> => {
    const q = query(collection(db, "students"), where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Student));
};

export const fetchStudentByEmail = async (email: string): Promise<Student | null> => {
    const q = query(collection(db, "students"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const studentDoc = querySnapshot.docs[0];
    return { id: studentDoc.id, ...studentDoc.data() } as unknown as Student;
};

export const fetchTimetableByGroup = async (groupId: string): Promise<TimetableEntry[]> => {
    const q = query(collection(db, "timetables"), where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TimetableEntry));
};

export const fetchAllTimetables = async (): Promise<TimetableEntry[]> => {
    const querySnapshot = await getDocs(collection(db, "timetables"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TimetableEntry));
};

export const fetchMessages = async (): Promise<Message[]> => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Message));
};

export const fetchAttendanceForDate = async (date: string): Promise<Attendance[]> => {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Attendance));
}

export const fetchAttendanceByStudent = async (studentId: string): Promise<Attendance[]> => {
    const q = query(collection(db, "attendance"), where("studentId", "==", studentId), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Attendance));
};

export const fetchGradesBySubjectAndGroup = async (subjectId: string, groupId: string): Promise<Grade[]> => {
    const q = query(collection(db, "grades"), where("subjectId", "==", subjectId), where("groupId", "==", groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Grade));
};

export const fetchGradesByStudent = async (studentId: string): Promise<Grade[]> => {
    const q = query(collection(db, "grades"), where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Grade));
};

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
