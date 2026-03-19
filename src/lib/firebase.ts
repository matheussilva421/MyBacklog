import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firebase Auth e Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Habilita persistência offline do Firestore e suporte para multicamadas (opcional, útil para PWA)
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Múltiplas abas ativas e este suporte não está disponível
    console.warn("Múltiplas abas ativas, persistência no banco ativada apenas na primeira.")
  } else if (err.code === 'unimplemented') {
    // Browser não suporta IndexedDB
    console.warn("O navegador não suporta persistência offline.")
  }
});
