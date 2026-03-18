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

export function defaultSessionToDbSession(session: Partial<PlaySession>): PlaySession {
  if (!session.libraryEntryId) throw new Error("libraryEntryId é obrigatório para criar uma sessão.");
  return {
    libraryEntryId: session.libraryEntryId,
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
