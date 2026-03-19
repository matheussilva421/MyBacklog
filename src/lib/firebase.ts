import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  enableMultiTabIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim().length > 0,
);

const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const cloudDb: Firestore | null = app ? getFirestore(app) : null;

if (cloudDb) {
  enableMultiTabIndexedDbPersistence(cloudDb).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Multiplas abas ativas; persistencia offline mantida apenas na primeira.");
    } else if (err.code === "unimplemented") {
      console.warn("O navegador nao suporta persistencia offline do Firestore.");
    }
  });
}
