import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { BackupPayload } from "../backlog/shared";

export async function pushToCloud(uid: string, payload: BackupPayload) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { 
    backup: payload, 
    updatedAt: new Date().toISOString() 
  });
}

export async function pullFromCloud(uid: string): Promise<BackupPayload | null> {
  const userRef = doc(db, "users", uid);
  // Fetch from the server to get the latest synced info across devices
  const snap = await getDoc(userRef);
  if (snap.exists() && snap.data().backup) {
    return snap.data().backup as BackupPayload;
  }
  return null;
}
