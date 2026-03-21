import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import type { BackupPayload } from "../backlog/shared";
import { cloudDb } from "./firebase";
import { logger } from "./logger";

function requireCloudDb() {
  if (!cloudDb) {
    throw new Error("Firestore nao configurado.");
  }

  return cloudDb;
}

/**
 * Delay promissificado para uso em retry com backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa uma operação assíncrona com retry e exponential backoff.
 * @param operation - Operação assíncrona a ser executada
 * @param maxAttempts - Número máximo de tentativas (padrão: 3)
 * @param baseDelayMs - Delay base em ms para backoff (padrão: 1000ms)
 * @param onRetry - Callback opcional chamado em cada retry com (error, attempt, remainingAttempts)
 * @returns Resultado da operação
 * @throws Lança o último erro se todas as tentativas falharem
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
  onRetry?: (error: unknown, attempt: number, remainingAttempts: number) => void,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const remainingAttempts = maxAttempts - attempt;

      if (onRetry) {
        onRetry(error, attempt, remainingAttempts);
      }

      if (remainingAttempts > 0) {
        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

export async function pushToCloud(uid: string, payload: BackupPayload) {
  const firestore = requireCloudDb();
  const userRef = doc(firestore, "users", uid);

  await retryWithBackoff(
    async () => {
      await setDoc(userRef, {
        backup: payload,
        updatedAt: new Date().toISOString(),
      });
    },
    3,
    1000,
    (error, attempt, remaining) => {
      logger.warn(`pushToCloud: tentativa ${attempt} falhou, ${remaining} restantes`, error);
    },
  );
}

export async function pullFromCloud(uid: string): Promise<BackupPayload | null> {
  const firestore = requireCloudDb();
  const userRef = doc(firestore, "users", uid);

  return retryWithBackoff(
    async (): Promise<BackupPayload | null> => {
      const snap = await getDoc(userRef);

      if (snap.exists() && snap.data().backup) {
        return snap.data().backup as BackupPayload;
      }

      return null;
    },
    3,
    1000,
    (error, attempt, remaining) => {
      logger.warn(`pullFromCloud: tentativa ${attempt} falhou, ${remaining} restantes`, error);
    },
  );
}

export async function clearCloudBackup(uid: string) {
  const firestore = requireCloudDb();
  const userRef = doc(firestore, "users", uid);

  await retryWithBackoff(
    async () => {
      await deleteDoc(userRef);
    },
    3,
    1000,
    (error, attempt, remaining) => {
      logger.warn(`clearCloudBackup: tentativa ${attempt} falhou, ${remaining} restantes`, error);
    },
  );
}
