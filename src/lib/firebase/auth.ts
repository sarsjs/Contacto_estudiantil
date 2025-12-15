import { auth, firebaseConfigErrorMessage } from './client';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

export async function signInWithEmail(email: string, password: string) {
  if (firebaseConfigErrorMessage) {
    throw new Error(firebaseConfigErrorMessage);
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error("Error signing in with email and password:", error);
    throw error;
  }
}

export async function signOutUser() {
  if (firebaseConfigErrorMessage) {
    throw new Error(firebaseConfigErrorMessage);
  }

  return await signOut(auth);
}

export function fetchCurrentSession() {
  if (firebaseConfigErrorMessage) {
    return Promise.reject(new Error(firebaseConfigErrorMessage));
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        reject(error);
      }
    );
  });
}
