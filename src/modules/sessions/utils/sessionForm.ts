import { type SessionFormState } from "../../../backlog/shared";
import { getTodayDateInputValue } from "../../../core/utils";

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
