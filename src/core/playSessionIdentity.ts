import type { PlaySession } from "./types";
import { normalizeToken } from "./utils";

export function buildPlaySessionDedupKey(
  libraryEntryId: number,
  session: Pick<
    PlaySession,
    "date" | "platform" | "durationMinutes" | "note" | "completionPercent"
  >,
): string {
  const normalizedPlatform = normalizeToken(session.platform || "");
  const normalizedNote = normalizeToken(session.note || "");

  return `${libraryEntryId}::${session.date}::${normalizedPlatform}::${session.durationMinutes}::${normalizedNote}::${session.completionPercent ?? ""}`;
}
