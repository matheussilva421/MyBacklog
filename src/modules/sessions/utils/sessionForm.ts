import type { PlaySession } from "../../../core/types";
import { type SessionFormState } from "../../../backlog/shared";

export function createSessionFormState(gameId?: number): SessionFormState {
  return {
    gameId: gameId ? String(gameId) : "",
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: "60",
    completionPercent: "",
    note: "",
    mood: "",
  };
}

export function defaultSessionToDbSession(session: Partial<PlaySession>, _index: number): PlaySession {
  return {
    libraryEntryId: session.libraryEntryId ?? 1,
    date: session.date ?? new Date().toISOString().slice(0, 10),
    platform: session.platform ?? "PC",
    durationMinutes: session.durationMinutes ?? 0,
    completionPercent: session.completionPercent,
    mood: session.mood ?? "Normal",
    note: session.note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as PlaySession;
}
