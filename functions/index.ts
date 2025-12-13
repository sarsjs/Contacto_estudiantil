
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

interface CreateStaffUserData {
  name: string;
  email: string;
  role: 'orientador' | 'profesor';
}

export const createStaffUser = functions.https.onCall(async (data: CreateStaffUserData, context) => {
  // Verificar que la solicitud proviene de un usuario autenticado y que es un director
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "La función solo puede ser llamada por un usuario autenticado."
    );
  }

  const callerUid = context.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();

  if (callerData?.role !== 'director') {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo un director puede crear nuevo personal."
    );
  }

  const { name, email, role } = data;
  const emailLower = email.toLowerCase();

  try {
    // 1. Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: emailLower,
      emailVerified: false,
      disabled: false,
    });

    // 2. Crear el documento del usuario en Firestore
    const avatarSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email: emailLower,
      role,
      avatarUrl,
      id: userRecord.uid, // Guardar el UID como id para consistencia
    });

    // 3. Enviar correo de restablecimiento de contraseña
    await admin.auth().generatePasswordResetLink(emailLower);

    return { result: `Usuario ${name} creado exitosamente con el rol de ${role}.` };

  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Ocurrió un error al crear el usuario.",
      error
    );
  }
});
