import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc, writeBatch, orderBy, serverTimestamp, getDoc, deleteField, limit } from "firebase/firestore";
import { db, storage } from "./client";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { User, Group, Subject, TimetableEntry, Attendance, Message, Grade, CalendarEvent, SubstitutionRequest, WorkLog, ActivityLog } from "@/lib/types";

const fetchData = async <T>(fetchFunction: () => Promise<T[]>, entityName: string): Promise<T[]> => {
    try {
        return await fetchFunction();
    } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        return []; // Return an empty array on error to prevent crashes
    }
};

// Substitution Requests
export const createSubstitutionRequest = async (request: Omit<SubstitutionRequest, 'id' | 'timestamp'>) => {
    return await addDoc(collection(db, "substitution_requests"), {
        ...request,
        timestamp: serverTimestamp(),
        status: 'pending'
    });
};

export const fetchSubstitutionRequests = async (toCounselorId: string): Promise<SubstitutionRequest[]> => fetchData(async () => {
    const q = query(
        collection(db, "substitution_requests"),
        where("toCounselorId", "==", toCounselorId),
        where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as SubstitutionRequest));
}, 'substitution requests');

export const handleSubstitutionRequest = async (requestId: string, status: 'accepted' | 'declined', requestBody?: SubstitutionRequest) => {
    const requestRef = doc(db, "substitution_requests", requestId);
    await updateDoc(requestRef, { status });

    if (status === 'accepted' && requestBody) {
        // Update all involved groups
        const batch = writeBatch(db);
        requestBody.groupIds.forEach(groupId => {
            const groupRef = doc(db, "groups", groupId);
            batch.update(groupRef, {
                tempCounselorId: requestBody.toCounselorId,
                absenceStatus: {
                    isActive: true,
                    message: requestBody.message || "Encargado por acuerdo entre orientadores."
                }
            });
        });
        await batch.commit();

        // Notify Director
        await addDoc(collection(db, "messages"), {
            content: `Acuerdo de Suplencia: El orientador titular ha cedido el control de sus grupos al orientador suplente por acuerdo mutuo.`,
            recipientFilter: 'director',
            timestamp: serverTimestamp(),
            createdBy: requestBody.fromCounselorId,
            createdByRole: 'orientador'
        });
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

export const fetchUserById = async (id: string): Promise<User | null> => {
    try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as unknown as User;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user by id:", error);
        return null;
    }
};

export const fetchStudentByEmail = async (email: string): Promise<User | null> => {
    const user = await fetchUserByEmail(email);
    if (user && (user.role === 'estudiante' || user.role === 'alumno')) {
        return user;
    }
    return null;
};

export const fetchGroups = async (): Promise<Group[]> => fetchData(async () => {
    const querySnapshot = await getDocs(collection(db, "groups"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));
}, 'groups');

export const fetchGroupsByCounselor = async (counselorId: string): Promise<Group[]> => fetchData(async () => {
    const q1 = query(collection(db, "groups"), where("counselorId", "==", counselorId));
    const q2 = query(collection(db, "groups"), where("tempCounselorId", "==", counselorId));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    const groupsMap = new Map<string, Group>();

    snap1.docs.forEach(doc => {
        groupsMap.set(doc.id, { id: doc.id, ...doc.data() } as unknown as Group);
    });

    snap2.docs.forEach(doc => {
        groupsMap.set(doc.id, { id: doc.id, ...doc.data() } as unknown as Group);
    });

    return Array.from(groupsMap.values());
}, 'groups by counselor');

export const updateGroupAbsence = async (groupId: string, data: { tempCounselorId?: string, isActive: boolean, message?: string }) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        tempCounselorId: data.isActive ? data.tempCounselorId : deleteField(),
        absenceStatus: {
            isActive: data.isActive,
            message: data.message || ""
        }
    });
};

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
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as unknown as CalendarEvent))
        .filter(event => event.date === date);
}, 'events by date');

export const fetchAllEvents = async (): Promise<CalendarEvent[]> => fetchData(async () => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as CalendarEvent));
}, 'all events');

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

// Funciones para obtener destinatarios según roles

// Para profesores: obtener sus estudiantes
export const fetchTeacherStudents = async (teacherId: string): Promise<User[]> => {
    try {
        // Primero obtener las materias del profesor
        const subjects = await fetchSubjectsByTeacher(teacherId);
        const subjectIds = subjects.map(subject => subject.id);

        if (subjectIds.length === 0) {
            return [];
        }

        // Obtener horarios basados en esas materias
        const allTimetables = await fetchAllTimetables();
        const groupIds = [...new Set(allTimetables
            .filter(entry => subjectIds.includes(entry.subjectId))
            .map(entry => entry.groupId))];

        if (groupIds.length === 0) {
            return [];
        }

        // Obtener todos los usuarios y filtrar estudiantes de esos grupos
        const allUsers = await fetchUsers();
        return allUsers.filter(user =>
            user.role === 'estudiante' && groupIds.includes(user.groupId)
        );
    } catch (error) {
        console.error("Error fetching teacher students:", error);
        return [];
    }
};

// Para orientadores: obtener estudiantes de sus grupos
export const fetchCounselorStudents = async (counselorId: string): Promise<User[]> => {
    try {
        const groups = await fetchGroupsByCounselor(counselorId);
        const groupIds = groups.map(group => group.id);

        if (groupIds.length === 0) {
            return [];
        }

        const allUsers = await fetchUsers();
        return allUsers.filter(user =>
            user.role === 'estudiante' && groupIds.includes(user.groupId)
        );
    } catch (error) {
        console.error("Error fetching counselor students:", error);
        return [];
    }
};

// Para estudiantes: obtener su orientador
export const fetchStudentCounselor = async (student: User): Promise<User | null> => {
    try {
        if (!student.groupId) {
            return null;
        }

        const group = await fetchGroups();
        const studentGroup = group.find(g => g.id === student.groupId);

        if (!studentGroup || !studentGroup.counselorId) {
            return null;
        }

        const counselors = await fetchUsers();
        return counselors.find(user => user.id === studentGroup.counselorId && user.role === 'orientador') || null;
    } catch (error) {
        console.error("Error fetching student counselor:", error);
        return null;
    }
};

// Corrección de la función para obtener profesores de un grupo
export const fetchStudentTeachersByGroupId = async (groupId: string): Promise<User[]> => {
    try {
        // Obtener horarios del grupo
        const timetableEntries = await fetchTimetableByGroup(groupId);
        const subjectIds = [...new Set(timetableEntries.map(entry => entry.subjectId))];

        if (subjectIds.length === 0) {
            return [];
        }

        // Obtener materias y sus profesores
        const allSubjects = await fetchSubjects();
        const teacherIds = [...new Set(
            allSubjects
                .filter(subject => subjectIds.includes(subject.id))
                .map(subject => subject.teacherId)
        )];

        // Obtener profesores
        const allUsers = await fetchUsers();
        return allUsers.filter(user =>
            user.role === 'profesor' &&
            teacherIds.includes(user.id)
        );
    } catch (error) {
        console.error("Error fetching student teachers:", error);
        return [];
    }
};

// Para estudiantes: obtener profesores de su grupo
export const fetchStudentTeachers = async (student: User): Promise<User[]> => {
    if (!student.groupId) {
        return [];
    }
    return await fetchStudentTeachersByGroupId(student.groupId);
};

export const fetchTimetableByTeacher = async (teacherId: string): Promise<TimetableEntry[]> => {
    try {
        // Primero obtener las materias del profesor
        const subjects = await fetchSubjectsByTeacher(teacherId);
        const subjectIds = subjects.map(subject => subject.id);

        if (subjectIds.length === 0) {
            return [];
        }

        // Obtener todos los horarios y filtrar por las materias del profesor
        const allTimetables = await fetchAllTimetables();
        return allTimetables.filter(entry => subjectIds.includes(entry.subjectId));
    } catch (error) {
        console.error("Error fetching timetable by teacher:", error);
        return [];
    }
};

// Functions for the unified user model
export const fetchStudents = async (): Promise<User[]> => {
    const allUsers = await fetchUsers();
    return allUsers.filter(user => user.role === 'estudiante' || user.role === 'alumno');
};

export const fetchStudentsByGroup = async (groupId: string): Promise<User[]> => {
    const allStudents = await fetchStudents();
    return allStudents.filter(student => student.groupId === groupId);
};

// Función para obtener un usuario por ID


// Funciones para manejar imágenes en Firebase Storage
export const uploadStudentPhoto = async (userId: string, file: File): Promise<string> => {
    try {
        // Subir foto al bucket en la carpeta 'fotos'
        const photoRef = ref(storage, `fotos/${userId}/${file.name}`);
        await uploadBytes(photoRef, file);
        const photoUrl = await getDownloadURL(photoRef);

        // Actualizar el avatarUrl del usuario
        await updateDoc(doc(db, "users", userId), {
            avatarUrl: photoUrl
        });

        return photoUrl;
    } catch (error) {
        console.error('Error uploading student photo:', error);
        throw error;
    }
};

export const uploadCredentialImage = async (userId: string, file: File): Promise<string> => {
    try {
        // Subir credencial al bucket en la carpeta 'credenciales'
        const credentialRef = ref(storage, `credenciales/${userId}/${file.name}`);
        await uploadBytes(credentialRef, file);
        const credentialUrl = await getDownloadURL(credentialRef);
        return credentialUrl;
    } catch (error) {
        console.error('Error uploading credential image:', error);
        throw error;
    }
};

export const deleteStudentPhoto = async (userId: string, photoUrl: string): Promise<void> => {
    try {
        // Extraer el nombre del archivo de la URL para eliminarlo de storage
        const photoPath = photoUrl.split('/fotos/')[1].split('?')[0]; // Extraer parte del path
        const photoRef = ref(storage, `fotos/${userId}/${photoPath}`);
        await deleteObject(photoRef);

        // Remover la referencia de la base de datos
        await updateDoc(doc(db, "users", userId), {
            avatarUrl: null
        });
    } catch (error) {
        console.error('Error deleting student photo:', error);
        throw error;
    }
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
// Función para enviar mensajes a múltiples destinatarios según filtros
export const addMessage = async (message: Omit<Message, "id" | "timestamp">) => {
    // Para mantener compatibilidad con la estructura actual, primero guardamos el mensaje general
    const docRef = await addDoc(collection(db, "messages"), {
        ...message,
        timestamp: serverTimestamp()
    });

    // Aquí es donde expandiríamos la funcionalidad para enviar a múltiples destinatarios
    // según el filtro de destinatarios, pero por ahora guardamos el mensaje base
    return docRef;
};
export const addEvent = async (event: Omit<CalendarEvent, "id" | "createdAt">) => {
    const docRef = await addDoc(collection(db, "events"), {
        ...event,
        visibility: event.visibility && event.visibility.length > 0 ? event.visibility : ['personal'],
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


export const deleteTimetableEntry = async (entryId: string) => await deleteDoc(doc(db, "timetables", entryId));

export const deleteMessage = async (messageId: string) => await deleteDoc(doc(db, "messages", messageId));

// Delete functions
export const deleteGroup = async (groupId: string) => await deleteDoc(doc(db, "groups", groupId));
export const deleteSubject = async (subjectId: string) => await deleteDoc(doc(db, "subjects", subjectId));
// This function is for deleting a user doc directly, but the callable cloud function is preferred.
export const deleteUser = async (userId: string) => await deleteDoc(doc(db, "users", userId));

export const sendMessage = async (message: Omit<Message, "id" | "timestamp">) => {
    return await addDoc(collection(db, "messages"), {
        ...message,
        timestamp: serverTimestamp()
    });
};

export const updateUserStatus = async (userId: string, status: 'inside' | 'outside' | 'coming' | 'unknown', userName?: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        gpsStatus: status,
        lastGpsUpdate: serverTimestamp()
    });

    // Check-in logic for staff
    if (userName && (status === 'inside' || status === 'outside')) {
        await registerWorkCheck(userId, userName, status);
    }
};

const registerWorkCheck = async (userId: string, userName: string, status: 'inside' | 'outside') => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
        collection(db, "work_logs"),
        where("userId", "==", userId),
        where("date", "==", today)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty && status === 'inside') {
        const now = new Date();
        const isLate = now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() > 15);

        await addDoc(collection(db, "work_logs"), {
            userId,
            userName,
            date: today,
            checkIn: serverTimestamp(),
            status: isLate ? 'late' : 'present'
        });
    } else if (!snapshot.empty && status === 'outside') {
        const logDoc = snapshot.docs[0];
        const logId = logDoc.id;
        const logData = logDoc.data();

        let hours = 0;
        if (logData.checkIn) {
            const checkInDate = logData.checkIn.toDate ? logData.checkIn.toDate() : new Date(logData.checkIn);
            const now = new Date();
            hours = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
        }

        await updateDoc(doc(db, "work_logs", logId), {
            checkOut: serverTimestamp(),
            totalHours: Number(hours.toFixed(2))
        });
    }
};

export const fetchWorkLogs = async (date?: string, userId?: string): Promise<WorkLog[]> => fetchData(async () => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    let q = query(
        collection(db, "work_logs"),
        where("date", "==", targetDate)
    );

    if (userId) {
        q = query(q, where("userId", "==", userId));
    }

    q = query(q, orderBy("checkIn", "desc"));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as WorkLog));
}, 'work logs');


/**
 * Generates a temporary 4-digit code for a class session.
 */
export const generateAttendanceToken = async (subjectId: string, groupId: string) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const tokenData = {
        subjectId,
        groupId,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes validity
        createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "attendance_tokens"), tokenData);
    return { id: docRef.id, code };
};

/**
 * Verifies if a code is valid for a specific student's class.
 */
export const verifyAttendanceToken = async (groupId: string, code: string) => {
    const now = new Date();
    const q = query(
        collection(db, "attendance_tokens"),
        where("groupId", "==", groupId),
        where("code", "==", code)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const tokenDoc = querySnapshot.docs[0].data();
    const expiresAt = tokenDoc.expiresAt.toDate();

    if (now > expiresAt) return null; // Token expired

    return tokenDoc;
};

/**
 * Registers an activity in the system audit log.
 */
export const logActivity = async (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    try {
        await addDoc(collection(db, "activity_logs"), {
            ...activity,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

export const fetchActivityLogs = async (limitCount = 100): Promise<ActivityLog[]> => {
    try {
        const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(limitCount));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ActivityLog));
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return [];
    }
};
