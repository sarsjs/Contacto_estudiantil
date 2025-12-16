
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

interface CreateUserData {
  name: string;
  email: string;
  role: 'director' | 'orientador' | 'profesor' | 'estudiante';
  password?: string; // La contraseña es opcional
  groupId?: string; 
}

export const createUser = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', 'https://fir08121146--contacto-estudiantil.us-east4.hosted.app');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // 1. Verificación de autenticación
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    res.status(401).json({
        error: 'unauthenticated',
        message: 'El token de autorización no fue provisto.',
        code: 'auth/unauthenticated'
    });
    return;
  }

  try {
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    res.status(401).json({
        error: 'invalid-token',
        message: 'El token de autorización es inválido.',
        code: 'auth/invalid-token'
    });
    return;
  }

  // Ajuste para leer el cuerpo de la solicitud, incluso si está anidado
  const body: CreateUserData = req.body?.data ?? req.body;
  const { name, email, role, groupId, password } = body;

  // 2. Validar que el email exista
  if (!email) {
    res.status(400).json({
        error: 'invalid-argument',
        message: 'El correo electrónico es obligatorio.',
        code: 'auth/invalid-email'
    });
    return;
  }

  // 3. Generar contraseña temporal si no se proporciona
  const tempPassword = password || `Tmp!${Math.random().toString(36).slice(2)}A9#${Date.now().toString(36)}`;

  try {
    const emailLower = email.toLowerCase();
    // 4. Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: emailLower,
      emailVerified: false,
      password: tempPassword,
      displayName: name,
      disabled: false,
    });

    // 5. Preparar el documento del usuario para Firestore
    const avatarSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;

    const userData: any = {
      id: userRecord.uid,
      name,
      email: emailLower,
      role,
      avatarUrl,
    };

    if (role === 'estudiante') {
      const year = new Date().getFullYear().toString().slice(-2);
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
      userData.matricula = `${year}${randomDigits}`;
      if (groupId) {
        userData.groupId = groupId;
      }
    }

    // 6. Crear el documento del usuario en la colección 'users'
    await db.collection("users").doc(userRecord.uid).set(userData);
    
    // 7. Enviar respuesta exitosa
    res.status(201).json({ success: true, uid: userRecord.uid, message: `Usuario ${name} creado con éxito.` });

  } catch (error: any) {
    // 8. Manejo de errores
    switch (error.code) {
        case 'auth/email-already-exists':
            res.status(409).json({
                error: 'email-already-exists',
                message: 'El correo electrónico ya está en uso por otro usuario.',
                code: 'auth/email-already-exists'
            });
            break;
        case 'auth/invalid-email':
            res.status(400).json({
                error: 'invalid-email',
                message: 'El formato del correo electrónico no es válido.',
                code: 'auth/invalid-email'
            });
            break;
        case 'auth/weak-password':
             res.status(400).json({
                error: 'weak-password',
                message: 'La contraseña no es lo suficientemente segura.',
                code: 'auth/weak-password'
            });
            break;
        default:
            console.error("Error al crear usuario:", error);
            res.status(500).json({
                error: 'internal-error',
                message: 'Ocurrió un error interno al crear el usuario.',
                code: error.code || 'unknown'
            });
            break;
    }
  }
});

// ... (el resto del archivo permanece igual)

interface DeleteUserData {
  uid: string;
}

export const deleteUser = functions
  .region('us-central1')
  .https.onCall(async (data: DeleteUserData, context: functions.https.CallableContext) => {
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
      "Un director no se puede eliminar a sí mismo."
    );
  }

  const targetDoc = await db.collection("users").doc(uid).get();
  const targetRole = targetDoc.data()?.role;

  if (
    callerRole !== 'director' && !(callerRole === 'orientador' && targetRole === 'estudiante')
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo un director o un orientador (para alumnos) puede eliminar usuarios."
    );
  }

  try {
    await admin.auth().deleteUser(uid);
    await db.collection("users").doc(uid).delete();
    return { success: true, message: `Usuario ${uid} eliminado con éxito.` };

  } catch (error: any) {
    console.error(`Error al eliminar usuario ${uid}:`, error);
    if (error.code === 'auth/user-not-found') {
      try {
        await db.collection("users").doc(uid).delete();
        return { success: true, message: `Usuario ${uid} no encontrado en Auth, pero eliminado de Firestore.` };
      } catch (dbError) {
        throw new functions.https.HttpsError("internal", `El usuario no se encontró en Auth y tampoco se pudo eliminar de Firestore.`);
      }
    }
    throw new functions.https.HttpsError(
      "internal",
      `Ocurrió un error interno al eliminar el usuario ${uid}.`,
      error
    );
  }
});
