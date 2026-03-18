import { type SessionFormState } from "../../../backlog/shared";
import { getTodayDateInputValue } from "../../../core/utils";
import type { PlaySession } from "../../../core/types";

export function createSessionFormState(gameId?: number): SessionFormState {
  return {
    gameId: gameId ? String(gameId) : "",
    date: getTodayDateInputValue(),
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
    date: session.date ?? getTodayDateInputValue(),
    platform: session.platform ?? "PC",
    durationMinutes: session.durationMinutes ?? 0,
    completionPercent: session.completionPercent,
    mood: session.mood ?? "Normal",
    note: session.note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as PlaySession;
}
