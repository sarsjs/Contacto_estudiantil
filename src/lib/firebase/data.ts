import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc, writeBatch, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./client";
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User, Group, Subject, TimetableEntry, Attendance, Message, Grade, CalendarEvent } from "@/lib/types";

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
    const normalizedEmail = email.trim().toLowerCase();
    
    const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn(`No user profile found in Firestore for email: ${normalizedEmail}`);
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as unknown as User;

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

export const fetchEventsByDate = async (date: string): Promise<CalendarEvent[]> => fetchData(async () => {
    const q = query(
        collection(db, "events"),
        where("date", "==", date),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as CalendarEvent));
}, 'events by date');

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

// Functions for the unified user model
export const fetchStudents = async (): Promise<User[]> => {
    const allUsers = await fetchUsers();
    return allUsers.filter(user => user.role === 'estudiante');
};

export const fetchStudentsByGroup = async (groupId: string): Promise<User[]> => {
    const allStudents = await fetchStudents();
    return allStudents.filter(student => student.groupId === groupId);
};

// Add/Update functions
export const addGroup = async (group: Omit<Group, "id">) => await addDoc(collection(db, "groups"), group);
export const updateGroup = async (groupId: string, data: Partial<Group>) => await updateDoc(doc(db, "groups", groupId), data);
// Renamed updateStudent to updateUser and targeting 'users' collection
// Enhanced for unified user model compatibility
export const updateUser = async (userId: string, data: Partial<User>) => {
  // Prepare update data, ensuring we don't accidentally change the role field unless explicitly allowed
  const updateData = { ...data };

  // Remove the id field if present as it should not be updated
  if (updateData.id) {
    delete updateData.id;
  }

  // Ensure role field is not accidentally changed in regular updates
  if (updateData.role !== undefined) {
    // In a production environment, role changes should likely be restricted
    // and performed only through specific administrative functions
    console.warn(`Updating role for user ${userId}. Ensure this is intentional.`);
  }

  // Perform the update
  return await updateDoc(doc(db, "users", userId), updateData);
};
export const addSubject = async (subject: Omit<Subject, "id">) => await addDoc(collection(db, "subjects"), subject);
export const updateSubject = async (subjectId: string, data: Partial<Subject>) => await updateDoc(doc(db, "subjects", subjectId), data);
export const addTimetableEntry = async (entry: Omit<TimetableEntry, "id">) => await addDoc(collection(db, "timetables"), entry);
export const addMessage = async (message: Omit<Message, "id">) => await addDoc(collection(db, "messages"), { ...message, timestamp: serverTimestamp() });
export const addEvent = async (event: Omit<CalendarEvent, "id" | "createdAt">) => {
    const docRef = await addDoc(collection(db, "events"), {
        ...event,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

// Function to add a student using Cloud Functions for unified user model
export const addStudent = async (studentData: Omit<User, "id" | "role"> & { groupId?: string }) => {
    const functions = getFunctions();
    const createUser = httpsCallable(functions, 'createUser');

    const result = await createUser({
        ...studentData,
        role: 'estudiante' as const,
        groupId: studentData.groupId
    });

    return result;
};

export const deleteEvent = async (eventId: string) => {
    await deleteDoc(doc(db, "events", eventId));
};

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
export const deleteSubject = async (subjectId: string) => await deleteDoc(doc(db, "subjects", subjectId));
// This function is for deleting a user doc directly, but the callable cloud function is preferred.
export const deleteUser = async (userId: string) => await deleteDoc(doc(db, "users", userId));