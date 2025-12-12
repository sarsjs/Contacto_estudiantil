import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
