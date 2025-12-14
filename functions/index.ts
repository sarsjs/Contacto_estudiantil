
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

// Renombramos la función a 'createUser' para que sea más genérica
export const createUser = functions.https.onCall(async (data: CreateUserData, context) => {
  // 1. Verificación de permisos (solo un director puede crear usuarios)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "La función solo puede ser llamada por un usuario autenticado."
    );
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (callerDoc.data()?.role !== 'director') {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo un director puede crear nuevos usuarios."
    );
  }

  const { name, email, role, groupId } = data;
  const emailLower = email.toLowerCase();

  try {
    // 2. Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: emailLower,
      emailVerified: false,
      displayName: name,
      disabled: false,
    });

    // 3. Preparar el documento del usuario para Firestore
    const avatarSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;

    const userData: any = {
      id: userRecord.uid,
      name,
      email: emailLower,
      role,
      avatarUrl,
    };

    // Si el rol es estudiante, añadir campos específicos
    if (role === 'estudiante') {
      const year = new Date().getFullYear().toString().slice(-2);
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
      userData.matricula = `${year}${randomDigits}`;
      if (groupId) {
        userData.groupId = groupId;
      }
    }

    // 4. Crear el documento del usuario en la colección 'users'
    await db.collection("users").doc(userRecord.uid).set(userData);
    
    // 5. Opcional: Enviar correo para restablecer contraseña.
    // Es buena práctica que el usuario establezca su propia contraseña.
    const passwordResetLink = await admin.auth().generatePasswordResetLink(emailLower);
    // (Aquí se podría integrar un servicio de email para enviar el link)

    return { success: true, uid: userRecord.uid, message: `Usuario ${name} creado con éxito.` };

  } catch (error: any) {
    // Si el usuario ya existe en Auth, arrojar un error claro
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        "already-exists",
        "El correo electrónico ya está en uso por otro usuario."
      );
    }
    console.error("Error al crear usuario:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Ocurrió un error interno al crear el usuario.",
      error
    );
  }
});

interface DeleteUserData {
  uid: string;
}

export const deleteUser = functions.https.onCall(async (data: DeleteUserData, context) => {
  // 1. Verificación de permisos (solo un director puede eliminar usuarios)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "La función solo puede ser llamada por un usuario autenticado."
    );
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (callerDoc.data()?.role !== 'director') {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo un director puede eliminar usuarios."
    );
  }

  const { uid } = data;

  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Un director no se puede eliminar a sí mismo."
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
