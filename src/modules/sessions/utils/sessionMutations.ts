import { recalculateLibraryEntryFromSessions } from "../../../core/catalogIntegrity";
import { db } from "../../../core/db";

export type SessionMutationInput = {
  sessionId?: number | null;
  libraryEntryId: number;
  date: string;
  durationMinutes: number;
  completionPercent?: number;
  mood?: string;
  note?: string;
};

async function readEntrySessionSnapshot(libraryEntryId: number, forceActive = false) {
  const entry = await db.libraryEntries.get(libraryEntryId);
  if (!entry?.id) return null;
  const sessions = await db.playSessions.where("libraryEntryId").equals(libraryEntryId).toArray();
  return recalculateLibraryEntryFromSessions(entry, sessions, { forceActive });
}

export async function savePlaySession(input: SessionMutationInput): Promise<{ libraryEntryId: number; mode: "create" | "edit" }> {
  const currentEntry = await db.libraryEntries.get(input.libraryEntryId);
  if (!currentEntry?.id) {
    throw new Error("Jogo da sessão não encontrado.");
  }

  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const completionPercent =
    typeof input.completionPercent === "number" && Number.isFinite(input.completionPercent)
      ? Math.max(0, Math.min(100, Math.round(input.completionPercent)))
      : undefined;
  const mode = input.sessionId != null ? "edit" : "create";

  if (mode === "edit") {
    const oldSession = await db.playSessions.get(input.sessionId!);
    if (!oldSession?.id) {
      throw new Error("Sessão não encontrada para edição.");
    }
    const existingSessionId = oldSession.id;

    await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
      await db.playSessions.update(existingSessionId, {
        date: input.date,
        durationMinutes,
        completionPercent,
        mood: input.mood?.trim() || undefined,
        note: input.note?.trim() || undefined,
      });

      const snapshot = await readEntrySessionSnapshot(input.libraryEntryId);
      if (!snapshot) return;

      await db.libraryEntries.update(input.libraryEntryId, {
        playtimeMinutes: snapshot.playtimeMinutes,
        completionPercent: snapshot.completionPercent,
        progressStatus: snapshot.progressStatus,
        mood: snapshot.latestSession?.mood?.trim() || currentEntry.mood,
        lastSessionAt: snapshot.lastSessionAt,
        completionDate: snapshot.completionDate,
        updatedAt: new Date().toISOString(),
      });
    });
  } else {
    await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
      await db.playSessions.add({
        libraryEntryId: input.libraryEntryId,
        date: input.date,
        platform: currentEntry.platform,
        durationMinutes,
        completionPercent,
        mood: input.mood?.trim() || currentEntry.mood,
        note: input.note?.trim() || undefined,
      });

      const snapshot = await readEntrySessionSnapshot(input.libraryEntryId, true);
      if (!snapshot) return;

      await db.libraryEntries.update(input.libraryEntryId, {
        ownershipStatus: currentEntry.ownershipStatus === "wishlist" ? "owned" : currentEntry.ownershipStatus,
        progressStatus: snapshot.progressStatus,
        completionPercent: snapshot.completionPercent,
        playtimeMinutes: snapshot.playtimeMinutes,
        mood: snapshot.latestSession?.mood?.trim() || input.mood?.trim() || currentEntry.mood,
        lastSessionAt: snapshot.lastSessionAt,
        completionDate: snapshot.completionDate,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return {
    libraryEntryId: input.libraryEntryId,
    mode,
  };
}

export async function deletePlaySession(sessionId: number): Promise<number | null> {
  const session = await db.playSessions.get(sessionId);
  if (!session) return null;

  const currentEntry = await db.libraryEntries.get(session.libraryEntryId);
  if (!currentEntry?.id) {
    await db.playSessions.delete(sessionId);
    return null;
  }

  await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
    await db.playSessions.delete(sessionId);
    const snapshot = await readEntrySessionSnapshot(session.libraryEntryId);
    if (!snapshot) return;

    await db.libraryEntries.update(currentEntry.id!, {
      playtimeMinutes: snapshot.playtimeMinutes,
      completionPercent: snapshot.completionPercent,
      progressStatus: snapshot.progressStatus,
      mood: snapshot.latestSession?.mood?.trim() || currentEntry.mood,
      lastSessionAt: snapshot.lastSessionAt,
      completionDate: snapshot.completionDate,
      updatedAt: new Date().toISOString(),
    });
  });

  return session.libraryEntryId;
}
