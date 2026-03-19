import { describe, expect, it } from "vitest";
import { deriveProgressStatus, recalculateLibraryEntryFromSessions } from "./catalogIntegrity";
import type { LibraryEntry, PlaySession } from "./types";

function createEntry(partial: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    gameId: 1,
    platform: "PC",
    sourceStore: "Steam",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "finished",
    playtimeMinutes: 1800,
    completionPercent: 100,
    priority: "high",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

function createSession(partial: Partial<PlaySession> = {}): PlaySession {
  return {
    libraryEntryId: 1,
    date: "2026-03-18",
    platform: "PC",
    durationMinutes: 90,
    ...partial,
  };
}

describe("catalogIntegrity", () => {
  describe("deriveProgressStatus", () => {
    it("does not keep finished when consolidated progress falls", () => {
      expect(
        deriveProgressStatus({
          currentStatus: "finished",
          completionPercent: 62,
          playtimeMinutes: 1200,
          hasSessions: true,
        }),
      ).toBe("playing");
    });

    it("returns not_started when there is no engagement", () => {
      expect(
        deriveProgressStatus({
          currentStatus: "finished",
          completionPercent: 0,
          playtimeMinutes: 0,
          hasSessions: false,
        }),
      ).toBe("not_started");
    });

    it("preserves paused status during passive reconciliation", () => {
      expect(
        deriveProgressStatus({
          currentStatus: "paused",
          completionPercent: 35,
          playtimeMinutes: 300,
          hasSessions: true,
        }),
      ).toBe("paused");
    });

    it("forces active state when a new session is registered", () => {
      expect(
        deriveProgressStatus({
          currentStatus: "paused",
          completionPercent: 35,
          playtimeMinutes: 300,
          hasSessions: true,
          forceActive: true,
        }),
      ).toBe("playing");
    });
  });

  describe("recalculateLibraryEntryFromSessions", () => {
    it("rebuilds completion, hours and status from session history", () => {
      const recalculated = recalculateLibraryEntryFromSessions(createEntry(), [
        createSession({ date: "2026-03-18", durationMinutes: 120, completionPercent: 62 }),
        createSession({ date: "2026-03-12", durationMinutes: 45 }),
      ]);

      expect(recalculated.playtimeMinutes).toBe(165);
      expect(recalculated.completionPercent).toBe(62);
      expect(recalculated.lastSessionAt).toBe("2026-03-18");
      expect(recalculated.progressStatus).toBe("playing");
    });
  });
});
