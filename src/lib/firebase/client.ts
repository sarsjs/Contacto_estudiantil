import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyCWiMV9980JadNny5X9EJcQAo9rClM9uck",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "contacto-estudiantil.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "contacto-estudiantil",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "contacto-estudiantil.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    "1054384089954",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:1054384089954:web:8898446e0c65214b039a3b",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-109KM3955D",
};

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
