import { tabSyncLock } from "./tabSyncLock";

/**
 * Wrapper para usar o TabSyncLock de forma compatível com o padrão atual.
 * Retorna um token que deve ser passado para releaseSyncLockWrapper.
 */
export async function acquireSyncLockWrapper(): Promise<symbol | null> {
  const token = Symbol("cloud-sync");

  const result = await tabSyncLock.acquire(async (signal) => {
    if (signal.aborted) {
      return null;
    }
    // Lock adquirido com sucesso
    return token;
  });

  return result;
}

/**
 * Libera o lock de sync.
 */
export function releaseSyncLockWrapper(token: symbol | null): void {
  if (token) {
    tabSyncLock.release();
  }
}
