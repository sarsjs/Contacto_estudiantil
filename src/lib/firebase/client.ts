import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  } as const;

  const missingKeys = Object.entries(config)
    .filter(([key, value]) =>
      ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"].includes(key)
        ? !value
        : false
    )
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const missingList = missingKeys.join(", ");
    throw new Error(
      `Faltan variables de entorno de Firebase: ${missingList}. Cárgalas en .env.local o en App Hosting para evitar conectarte a un proyecto incorrecto.`
    );
  }

  return config;
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Optional App Check setup (enforced only when a site key is provided)
let appCheck: AppCheck | undefined;

if (typeof window !== "undefined") {
  const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  // Enable the debug token when provided to simplify local testing without CAPTCHA
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    // @ts-expect-error: Firebase injects this global for debug usage
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
  }

  if (appCheckSiteKey) {
    appCheck = initializeAppCheck(firebase_app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn("App Check no está configurado (NEXT_PUBLIC_RECAPTCHA_SITE_KEY ausente). Las funciones protegidas pueden fallar si App Check está habilitado en el proyecto.");
  }
}

// Get Auth instance
const auth = getAuth(firebase_app);

// Get Firestore instance
const db = getFirestore(firebase_app);

// Get Storage instance
const storage = getStorage(firebase_app);

// Export the app instance for general use
export default firebase_app;

// Export the auth, db, and storage instances for other files to use
export { auth, db, storage, appCheck };
