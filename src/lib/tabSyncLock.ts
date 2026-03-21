const LOCK_NAME = "mybacklog-cloud-sync";

type LockCallback<T> = (signal: AbortSignal) => Promise<T>;

export class TabSyncLock {
  private abortController: AbortController | null = null;
  private isHeld = false;

  async acquire<T>(operation: LockCallback<T>): Promise<T | null> {
    if (this.isHeld) {
      // Lock já está adquirido nesta instância
      return operation(new AbortController().signal);
    }

    if (!("locks" in navigator)) {
      // Fallback: lock em memória da aba (sem coordenação entre abas)
      this.isHeld = true;
      this.abortController = new AbortController();
      try {
        return await operation(this.abortController.signal);
      } finally {
        this.isHeld = false;
        this.abortController = null;
      }
    }

    this.abortController = new AbortController();

    try {
      return await navigator.locks.request(
        LOCK_NAME,
        { signal: this.abortController.signal },
        async (lock) => {
          if (!lock) return null;
          this.isHeld = true;
          return operation(this.abortController!.signal);
        }
      ) as T;
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return null;
      }
      throw error;
    } finally {
      this.isHeld = false;
      this.abortController = null;
    }
  }

  release(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isHeld = false;
  }
}

export const tabSyncLock = new TabSyncLock();
