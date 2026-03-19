import { db } from "../../../core/db";
import type { PlaySession, ProgressStatus } from "../../../core/types";

export type SessionMutationInput = {
  sessionId?: number | null;
  libraryEntryId: number;
  date: string;
  durationMinutes: number;
  completionPercent?: number;
  mood?: string;
  note?: string;
};

function sortSessionsByDateDesc(sessions: PlaySession[]) {
  return [...sessions].sort((left, right) => right.date.localeCompare(left.date));
}

function getNextProgressStatus(currentStatus: ProgressStatus, completionPercent?: number): ProgressStatus {
  if (completionPercent === 100) return "finished";
  if (typeof completionPercent === "number" && completionPercent > 0) {
    if (currentStatus === "abandoned" || currentStatus === "archived") return currentStatus;
    return "playing";
  }
  if (currentStatus === "finished" || currentStatus === "completed_100") return "playing";
  if (currentStatus === "not_started" || currentStatus === "paused") return "playing";
  return currentStatus;
}

async function readEntrySessionSnapshot(libraryEntryId: number) {
  const sessions = await db.playSessions.where("libraryEntryId").equals(libraryEntryId).toArray();
  const ordered = sortSessionsByDateDesc(sessions);
  const latestSession = ordered[0];
  const latestCompletion = ordered.find((session) => typeof session.completionPercent === "number")?.completionPercent;
  return {
    latestSession,
    latestCompletion,
  };
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

    await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
      await db.playSessions.update(oldSession.id!, {
        date: input.date,
        durationMinutes,
        completionPercent,
        mood: input.mood?.trim() || undefined,
        note: input.note?.trim() || undefined,
      });

      const { latestSession, latestCompletion } = await readEntrySessionSnapshot(input.libraryEntryId);
      const timeDiff = durationMinutes - oldSession.durationMinutes;
      const nextProgress = latestCompletion ?? completionPercent ?? currentEntry.completionPercent;
      await db.libraryEntries.update(input.libraryEntryId, {
        playtimeMinutes: Math.max(0, currentEntry.playtimeMinutes + timeDiff),
        completionPercent: nextProgress,
        progressStatus: getNextProgressStatus(currentEntry.progressStatus, nextProgress),
        mood: latestSession?.mood?.trim() || currentEntry.mood,
        lastSessionAt: latestSession?.date,
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

      await db.libraryEntries.update(input.libraryEntryId, {
        ownershipStatus: currentEntry.ownershipStatus === "wishlist" ? "owned" : currentEntry.ownershipStatus,
        progressStatus: getNextProgressStatus(currentEntry.progressStatus, completionPercent),
        completionPercent: completionPercent ?? currentEntry.completionPercent,
        playtimeMinutes: currentEntry.playtimeMinutes + durationMinutes,
        mood: input.mood?.trim() || currentEntry.mood,
        lastSessionAt:
          !currentEntry.lastSessionAt || currentEntry.lastSessionAt.localeCompare(input.date) < 0
            ? input.date
            : currentEntry.lastSessionAt,
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
    const { latestSession, latestCompletion } = await readEntrySessionSnapshot(session.libraryEntryId);
    const nextProgress = latestCompletion ?? currentEntry.completionPercent;
    await db.libraryEntries.update(currentEntry.id!, {
      playtimeMinutes: Math.max(0, currentEntry.playtimeMinutes - session.durationMinutes),
      completionPercent: nextProgress,
      progressStatus: getNextProgressStatus(currentEntry.progressStatus, nextProgress),
      mood: latestSession?.mood?.trim() || currentEntry.mood,
      lastSessionAt: latestSession?.date,
      updatedAt: new Date().toISOString(),
    });
  });

  return session.libraryEntryId;
}
