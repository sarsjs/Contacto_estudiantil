
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

interface CreateUserData {
  name: string;
  email: string;
  role: 'director' | 'orientador' | 'profesor' | 'estudiante';
  password?: string;
  groupId?: string;
}

// Función Callable para crear usuarios (Personal o Alumnos)
export const createUser = functions.region('us-central1').https.onCall(async (data: CreateUserData, context) => {
  // 1. Verificación de autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para realizar esta acción.'
    );
  }

  // 2. Verificación de permisos (Solo Director puede crear personal, Orientador solo alumnos)
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  const callerRole = callerData?.role;

  const { name, email, role, groupId, password } = data;

  if (callerRole !== 'director') {
    // Si no es director, solo puede crear alumnos si es orientador
    if (callerRole === 'orientador' && role === 'estudiante') {
      // Permitido
    } else {
      throw new functions.https.HttpsError(
        'permission-denied',
        'No tienes permisos suficientes para crear este tipo de usuario.'
      );
    }
  }

  // 3. Validar datos mínimos
  if (!email || !name || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan datos obligatorios (nombre, email o rol).'
    );
  }

  // 4. Generar contraseña temporal si no se proporciona
  const tempPassword = password || `Edu${Math.random().toString(36).slice(2, 8).toUpperCase()}!${Date.now().toString(36).slice(-3)}`;

  try {
    const emailLower = email.toLowerCase();

    // 5. Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: emailLower,
      emailVerified: false,
      password: tempPassword,
      displayName: name,
      disabled: false,
    });

    // 6. Preparar el documento del usuario para Firestore
    const avatarSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;

    const userData: any = {
      id: userRecord.uid,
      name,
      email: emailLower,
      role,
      avatarUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (role === 'estudiante') {
      const year = new Date().getFullYear().toString().slice(-2);
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
      userData.matricula = `${year}${randomDigits}`;
      if (groupId) {
        userData.groupId = groupId;
      }
    }

    // 7. Crear el documento del usuario en la colección 'users'
    await db.collection("users").doc(userRecord.uid).set(userData);

    return {
      success: true,
      uid: userRecord.uid,
      message: `Usuario ${name} creado con éxito.`
    };

  } catch (error: any) {
    console.error("Error al crear usuario:", error);

    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'El correo electrónico ya está en uso por otro usuario.'
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Ocurrió un error interno al crear el usuario.'
    );
  }
});

interface DeleteUserData {
  uid: string;
}

// Función Callable para eliminar usuarios
export const deleteUser = functions.region('us-central1').https.onCall(async (data: DeleteUserData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "La función solo puede ser llamada por un usuario autenticado."
    );
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  const callerRole = callerDoc.data()?.role;

  const { uid } = data;

  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Un usuario no se puede eliminar a sí mismo."
    );
  }

  const targetDoc = await db.collection("users").doc(uid).get();
  const targetData = targetDoc.data();
  const targetRole = targetData?.role;

  // Solo director puede borrar a cualquiera. Orientador solo alumnos.
  if (callerRole !== 'director') {
    if (callerRole === 'orientador' && targetRole === 'estudiante') {
      // Permitido
    } else {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo un director o un orientador (para alumnos) puede eliminar usuarios."
      );
    }
  }

  try {
    // 1. Eliminar de Auth
    await admin.auth().deleteUser(uid);
    // 2. Eliminar de Firestore
    await db.collection("users").doc(uid).delete();

    return { success: true, message: `Usuario ${uid} eliminado con éxito.` };

  } catch (error: any) {
    console.error(`Error al eliminar usuario ${uid}:`, error);

    // Si no está en Auth, intentar borrar de Firestore de todos modos
    if (error.code === 'auth/user-not-found') {
      await db.collection("users").doc(uid).delete();
      return { success: true, message: `Usuario eliminado de Firestore (no existía en Auth).` };
    }

    throw new functions.https.HttpsError(
      "internal",
      `Ocurrió un error interno al eliminar el usuario. ${error.message}`
    );
  }
});

// Función HTTP pública para validar credenciales
export const validateCredential = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Habilitar CORS
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const publicId = req.query.public_id as string;

  if (!publicId) {
    res.status(400).json({ status: "INVALID", message: "Falta el parámetro public_id." });
    return;
  }

  try {
    // Buscar estudiante en la colección 'users' (asumiendo que ahí están los alumnos)
    const userDoc = await db.collection("users").doc(publicId).get();

    if (!userDoc.exists) {
      res.status(404).json({ status: "INVALID", message: "La credencial no existe en el sistema." });
      return;
    }

    const userData = userDoc.data();

    // Validación de Rol
    if (userData?.role !== 'estudiante') {
      res.status(400).json({ status: "INVALID", message: "El identificador no corresponde a un estudiante." });
      return;
    }

    // Validación de Estatus (Si no tiene campo status, se asume activo por compatibilidad, o se puede restringir)
    // Asumimos 'activo' por defecto si no existe campo para evitar bloqueo masivo en demo.
    const status = userData?.status || 'activo';
    if (status !== 'activo') {
      res.json({ status: "INVALID", message: "El estudiante no se encuentra ACTIVO en el ciclo escolar actual." });
      return;
    }

    // Validación de Fechas
    const now = new Date();
    const validFrom = userData?.valid_from ? new Date(userData.valid_from) : new Date('2024-08-01'); // Default start 
    const validTo = userData?.valid_to ? new Date(userData.valid_to) : new Date('2025-07-31');     // Default end 

    if (now < validFrom || now > validTo) {
      res.json({ status: "INVALID", message: "La credencial ha expirado o aún no es vigente." });
      return;
    }

    // Obtener datos de la escuela
    // Si existe schoolId en el usuario se usa, si no, se busca un default o hardcode para la EPO 264
    let schoolData = {
      name: "Escuela Preparatoria Oficial Núm. 264",
      cct: "15EBH0264W",
      address: "Metepec, Estado de México",
      logoUrl: "https://contacto-estudiantil.web.app/escudomex.png"
    };

    if (userData?.schoolId) {
      const schoolDoc = await db.collection("schools").doc(userData.schoolId).get();
      if (schoolDoc.exists) {
        schoolData = { ...schoolData, ...schoolDoc.data() };
      }
    }

    // Respuesta VÁLIDA con datos públicos
    res.json({
      status: "VALID",
      student: {
        name: userData?.name,
        matricula: userData?.matricula || "S/M",
        group: userData?.groupId || "Sin Asignar",
        photoUrl: userData?.avatarUrl || null,
        grade: userData?.grade || "N/A"
      },
      school: schoolData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error validando credencial:", error);
    res.status(500).json({ status: "INVALID", message: "Error interno del servidor de validación." });
  }
});
