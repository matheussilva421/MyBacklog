import { db } from "../../../core/db";

const REVISION_KEY = "localRevision";

export async function getLocalRevision(): Promise<number> {
  const row = await db.settings.get({ key: REVISION_KEY });
  if (!row) return 0;
  return parseInt(row.value, 10) || 0;
}

export async function incrementLocalRevision(): Promise<number> {
  const now = new Date().toISOString();
  let next: number;

  await db.transaction("rw", db.settings, db.pendingMutations, db.settings, async () => {
    const existing = await db.settings.get({ key: REVISION_KEY });
    const current = existing ? parseInt(existing.value, 10) || 0 : 0;
    next = current + 1;

    if (existing?.id) {
      await db.settings.update(existing.id, {
        value: String(next),
        updatedAt: now,
      });
    } else {
      await db.settings.add({
        key: REVISION_KEY,
        value: String(next),
        updatedAt: now,
      });
    }
  });

  return next!;
}

export function createRevisionWatcher(callback: (revision: number) => void): () => void {
  let lastRevision: number | null = null;
  let cancelled = false;

  const check = async () => {
    if (cancelled) return;
    const revision = await getLocalRevision();
    if (revision !== lastRevision) {
      lastRevision = revision;
      callback(revision);
    }
    if (!cancelled) {
      setTimeout(check, 1000);
    }
  };

  check();

  return () => {
    cancelled = true;
  };
}
