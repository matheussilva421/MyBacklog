import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import type { BackupPayload } from "../backlog/shared";
import { cloudDb } from "./firebase";

function requireCloudDb() {
  if (!cloudDb) {
    throw new Error("Firestore nao configurado.");
  }

  return cloudDb;
}

export async function pushToCloud(uid: string, payload: BackupPayload) {
  const firestore = requireCloudDb();
  const userRef = doc(firestore, "users", uid);

  await setDoc(userRef, {
    backup: payload,
    updatedAt: new Date().toISOString(),
  });
}

export async function pullFromCloud(uid: string): Promise<BackupPayload | null> {
  const firestore = requireCloudDb();
  const userRef = doc(firestore, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists() && snap.data().backup) {
    return snap.data().backup as BackupPayload;
  }

  return null;
}

export async function clearCloudBackup(uid: string) {
  const firestore = requireCloudDb();
  const userRef = doc(firestore, "users", uid);
  await deleteDoc(userRef);
}
