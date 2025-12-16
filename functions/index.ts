
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Interface for the data coming from the client
interface CreateUserData {
  name: string;
  email: string;
  role: 'director' | 'orientador' | 'profesor' | 'estudiante';
  groupId?: string; // Optional, mainly for students
}

export const createUser = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', 'https://fir08121146--contacto-estudiantil.us-east4.hosted.app');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // 1. Authentication check
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    res.status(401).json({
        error: 'unauthenticated',
        message: 'El token de autorización no fue provisto.'
    });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    res.status(401).json({
        error: 'invalid-token',
        message: 'El token de autorización es inválido.'
    });
    return;
  }

  const uid = decodedToken.uid;
  const callerDoc = await db.collection("users").doc(uid).get();
  const callerRole = callerDoc.data()?.role;

  const data: CreateUserData = req.body;

  // 2. Permission check
  if (
    callerRole !== 'director' && !(callerRole === 'orientador' && data.role === 'estudiante')
  ) {
    res.status(403).json({
        error: 'permission-denied',
        message: 'No tienes permisos para realizar esta acción.'
    });
    return;
  }

  const { name, email, role, groupId } = data;
  const emailLower = email.toLowerCase();
  
  // Generate a temporary password if not provided
  const tempPassword = `Tmp!${Math.random().toString(36).slice(2)}A9#${Date.now().toString(36)}`;


  try {
    // 3. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: emailLower,
      emailVerified: false,
      password: tempPassword,
      displayName: name,
      disabled: false,
    });

    // 4. Prepare user document for Firestore
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

    // 5. Create user document in 'users' collection
    await db.collection("users").doc(userRecord.uid).set(userData);
    
    // 6. Send successful response
    res.status(201).json({ success: true, uid: userRecord.uid, message: `Usuario ${name} creado con éxito.` });

  } catch (error: any) {
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
            console.error("Error creating user:", error);
            res.status(500).json({
                error: 'internal-error',
                message: 'Ocurrió un error interno al crear el usuario.',
                code: error.code
            });
            break;
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

  // Permissions:
  // - Director: can delete any user (except themselves).
  // - Counselor: can only delete students.
  if (
    callerRole !== 'director' && !(callerRole === 'orientador' && targetRole === 'estudiante')
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo un director o un orientador (para alumnos) puede eliminar usuarios."
    );
  }

  try {
    // 2. Delete the user from Firebase Authentication
    await admin.auth().deleteUser(uid);

    // 3. Delete the user's document from Firestore
    await db.collection("users").doc(uid).delete();

    // 4. Optional: Clean up other related data here
    // e.g., their records in the 'students' collection if you still use it, etc.

    return { success: true, message: `Usuario ${uid} eliminado con éxito.` };

  } catch (error: any) {
    console.error(`Error al eliminar usuario ${uid}:`, error);
    if (error.code === 'auth/user-not-found') {
      // If the user doesn't exist in Auth, try to delete from Firestore anyway
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
