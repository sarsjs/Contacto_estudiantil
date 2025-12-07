import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./client";
import type { User, Group, Student, Subject, TimetableEntry, SecurityAlert, Attendance } from "@/lib/types";

// Fetch functions
export const fetchUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
};

export const fetchGroups = async (): Promise<Group[]> => {
  const querySnapshot = await getDocs(collection(db, "groups"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));
};

export const fetchSubjects = async (): Promise<Subject[]> => {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Subject));
};

export const fetchStudents = async (): Promise<Student[]> => {
    const querySnapshot = await getDocs(collection(db, "students"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Student));
};

export const fetchStudentByEmail = async (email: string): Promise<Student | null> => {
    const q = query(collection(db, "students"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
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

export const fetchSecurityAlerts = async (): Promise<SecurityAlert[]> => {
    const querySnapshot = await getDocs(collection(db, "securityAlerts"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as SecurityAlert));
};

export const fetchAttendanceForDate = async (date: string): Promise<Attendance[]> => {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Attendance));

}

// Add/Update functions
export const addUser = async (user: Omit<User, "id">) => {
  const docRef = await addDoc(collection(db, "users"), user);
  return docRef.id;
};

export const addGroup = async (group: Omit<Group, "id">) => {
  const docRef = await addDoc(collection(db, "groups"), group);
  return docRef.id;
};

export const addStudent = async (student: Omit<Student, "id">) => {
    const docRef = await addDoc(collection(db, "students"), student);
    return docRef.id;
};

export const addTimetableEntry = async (entry: Omit<TimetableEntry, "id">) => {
    const docRef = await addDoc(collection(db, "timetables"), entry);
    return docRef.id;
};

export const updateStudent = async (studentId: string, data: Partial<Student>) => {
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, data);
};

export const setAttendanceBatch = async (records: {studentId: string, date: string, present: boolean}[]) => {
    const batch = writeBatch(db);
    
    for (const record of records) {
        // Since we can't easily query within a batch, we'll create a predictable ID
        const docId = `${record.studentId}_${record.date}`;
        const attendanceRef = doc(db, "attendance", docId);
        batch.set(attendanceRef, record);
    }
    
    await batch.commit();
};


// Delete functions
export const deleteUser = async (userId: string) => {
  await deleteDoc(doc(db, "users", userId));
};
