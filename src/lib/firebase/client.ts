import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

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

// Initialize Firebase only when the config is complete to avoid build-time crashes
const firebase_app = missingKeys.length === 0 ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null;

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

// Optional App Check setup (enforced only when a site key is provided)
let appCheck: AppCheck | undefined;

if (typeof window !== "undefined" && firebase_app) {
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
    console.warn(
      "App Check no está configurado (NEXT_PUBLIC_RECAPTCHA_SITE_KEY ausente). Las funciones protegidas pueden fallar si App Check está habilitado en el proyecto."
    );
  }
}

// Safe accessors that fail lazily when the config is incomplete
const auth: Auth = firebase_app ? getAuth(firebase_app) : buildMissingConfigProxy<Auth>();
const db: Firestore = firebase_app ? getFirestore(firebase_app) : buildMissingConfigProxy<Firestore>();
const storage: FirebaseStorage = firebase_app ? getStorage(firebase_app) : buildMissingConfigProxy<FirebaseStorage>();

// Export the app instance for general use
export default firebase_app;

// Export the auth, db, and storage instances for other files to use
export { auth, db, storage, appCheck };
