import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// test
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Configuración pública del proyecto de Firebase. Se usa como respaldo
const fallbackFirebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCWiMV9980JadNny5X9EJcQAo9rClM9uck",
  authDomain: "contacto-estudiantil.firebaseapp.com",
  projectId: "contacto-estudiantil",
  storageBucket: "contacto-estudiantil.firebasestorage.app",
  messagingSenderId: "1054384089954",
  appId: "1:1054384089954:web:8898446e0c65214b039a3b",
  measurementId: "G-109KM3955D",
};

// Use environment variables when available, else fallback config.
// Use logical OR (||) to support empty strings as missing values.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackFirebaseConfig.measurementId,
};

// Only require minimal set of keys (measurementId is optional)
const requiredKeys: (keyof FirebaseOptions)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

export const firebaseConfigErrorMessage = missingKeys.length
  ? `Faltan variables de entorno de Firebase: ${missingKeys.join(", ")}. Cárgalas en .env.local o en App Hosting para evitar conectarte a un proyecto incorrecto.`
  : null;

// Initialize Firebase only when config is complete
const firebase_app = missingKeys.length === 0
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

// Build proxy to throw error when trying to access Firebase services if config missing
const buildMissingConfigProxy = <T extends object>(): T =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(firebaseConfigErrorMessage ?? "Firebase no está configurado.");
      },
      apply() {
        throw new Error(firebaseConfigErrorMessage ?? "Firebase no está configurado.");
      },
    }
  ) as T;

let appCheck: AppCheck | undefined;
if (typeof window !== "undefined" && firebase_app) {
  const siteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "").trim();
  const flag = (process.env.NEXT_PUBLIC_ENABLE_APPCHECK || "").toLowerCase();
  const explicitlyOff = flag === "false";
  const explicitlyOn = flag === "true";
  const shouldInit = !!siteKey && !explicitlyOff;
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    // @ts-expect-error: debug token injection
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
  }
  if (shouldInit) {
    if (!explicitlyOn && siteKey) {
      console.info("App Check habilitado automáticamente al detectar NEXT_PUBLIC_RECAPTCHA_SITE_KEY.");
    }
    appCheck = initializeAppCheck(firebase_app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (explicitlyOn && !siteKey) {
    console.warn(
      "App Check está habilitado pero falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY. Agrega la clave pública para emitir tokens válidos."
    );
  }
}

// Safe accessors
const auth: Auth = firebase_app ? getAuth(firebase_app) : buildMissingConfigProxy<Auth>();
const db: Firestore = firebase_app ? getFirestore(firebase_app) : buildMissingConfigProxy<Firestore>();
const storage: FirebaseStorage = firebase_app ? getStorage(firebase_app) : buildMissingConfigProxy<FirebaseStorage>();

export default firebase_app;
export { auth, db, storage, appCheck };
const firebaseConfig = {
      apiKey: "AIzaSyCWiMV9980JadNny5X9EJcQAo9rClM9uck",
      authDomain: "contacto-estudiantil.firebaseapp.com",
      projectId: "contacto-estudiantil",
      storageBucket: "contacto-estudiantil.appspot.com",
      messagingSenderId: "1054384089954",
      appId: "1:1054384089954:web:8898446e0c65214b039a3b",
      measurementId: "G-109KM3955D"
    };

// Initialize Firebase
const firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Auth instance
const auth = getAuth(firebase_app);

// Get Firestore instance
const db = getFirestore(firebase_app);

// Export the app instance for general use
export default firebase_app;

// Export the auth and db instances for other files to use
export { auth, db };
