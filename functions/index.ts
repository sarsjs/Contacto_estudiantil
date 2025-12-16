
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Interface para la data de entrada de la función
interface CreateUserData {
  name: string;
  email: string;
  role: 'director' | 'orientador' | 'profesor' | 'estudiante';
  groupId?: string; // Opcional, principalmente para estudiantes
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
  
  // La lógica original de onCall ahora se maneja dentro de onRequest
  // 1. Verificación de autenticación
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    res.status(401).send('Unauthorized');
    return;
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    res.status(401).send('Unauthorized');
    return;
  }

  const uid = decodedToken.uid;
  const callerDoc = await db.collection("users").doc(uid).get();
  const callerRole = callerDoc.data()?.role;
  
  const data: CreateUserData = req.body;

  // 2. Permisos (la misma lógica que antes)
  if (
    callerRole !== 'director' && !(callerRole === 'orientador' && data.role === 'estudiante')
  ) {
    res.status(403).send('Permission denied');
    return;
  }

  const { name, email, role, groupId } = data;
  const emailLower = email.toLowerCase();

  try {
    // 3. Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: emailLower,
      emailVerified: false,
      displayName: name,
      disabled: false,
    });

    // 4. Preparar el documento del usuario para Firestore
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

    // 5. Crear el documento del usuario en la colección 'users'
    await db.collection("users").doc(userRecord.uid).set(userData);
    
    // 6. Enviar respuesta exitosa
    res.status(200).send({ success: true, uid: userRecord.uid, message: `Usuario ${name} creado con éxito.` });

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      res.status(409).send('El correo electrónico ya está en uso por otro usuario.');
    } else {
      console.error("Error al crear usuario:", error);
      res.status(500).send('Ocurrió un error interno al crear el usuario.');
    }
  }
});

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

  // Permisos:
  // - Director: puede eliminar cualquier usuario (menos a sí mismo).
  // - Orientador: solo puede eliminar estudiantes.
  if (
    callerRole !== 'director' && !(callerRole === 'orientador' && targetRole === 'estudiante')
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo un director o un orientador (para alumnos) puede eliminar usuarios."
    );
  }

  try {
    // 2. Eliminar el usuario de Firebase Authentication
    await admin.auth().deleteUser(uid);

    // 3. Eliminar el documento del usuario de Firestore
    await db.collection("users").doc(uid).delete();

    // 4. Opcional: Podrías aquí también limpiar otros datos relacionados, 
    // como sus registros en la colección 'students' si aún la usas, etc.

    return { success: true, message: `Usuario ${uid} eliminado con éxito.` };

  } catch (error: any) {
    console.error(`Error al eliminar usuario ${uid}:`, error);
    if (error.code === 'auth/user-not-found') {
      // Si el usuario no existe en Auth, intenta borrarlo de Firestore de todas formas
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
