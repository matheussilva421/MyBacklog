import { describe, expect, it } from "vitest";
import type { BackupPayload } from "../backlog/shared";
import { buildSyncFingerprint, resolveInitialSyncDecision, stripBackupMeta } from "./useCloudSync";

const baseTables = {
  games: [
    {
      id: 1,
      title: "Cyberpunk 2077",
      normalizedTitle: "cyberpunk 2077",
      genres: "RPG",
      estimatedTime: "48h",
      releaseYear: 2020,
      developer: "CD Projekt Red",
      publisher: "CD Projekt",
      coverUrl: "",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    },
  ],
  libraryEntries: [
    {
      id: 1,
      gameId: 1,
      platform: "PC",
      sourceStore: "Steam",
      format: "digital",
      ownershipStatus: "owned",
      progressStatus: "playing",
      priority: "high",
      completionPercent: 62,
      playtimeMinutes: 1440,
      favorite: false,
      lastSessionAt: "2026-03-10",
      notes: "",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-10T10:00:00.000Z",
    },
  ],
  playSessions: [],
  reviews: [],
  lists: [],
  libraryEntryLists: [],
  tags: [],
  gameTags: [],
  goals: [],
  settings: [],
};

function createPayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: 4,
    exportedAt: "2026-03-19T12:00:00.000Z",
    source: "mybacklog",
    ...baseTables,
    ...overrides,
  };
}

describe("useCloudSync helpers", () => {
  it("ignora exportedAt ao montar fingerprint", () => {
    const first = createPayload({ exportedAt: "2026-03-19T12:00:00.000Z" });
    const second = createPayload({ exportedAt: "2026-03-19T13:00:00.000Z" });

    expect(buildSyncFingerprint(stripBackupMeta(first))).toBe(buildSyncFingerprint(stripBackupMeta(second)));
  });

  it("puxa da nuvem quando a base local esta vazia", () => {
    const decision = resolveInitialSyncDecision(
      { ...baseTables, games: [], libraryEntries: [] },
      createPayload(),
    );

    expect(decision.decision).toBe("pull-cloud");
  });

  it("envia para a nuvem quando nao existe backup remoto", () => {
    const decision = resolveInitialSyncDecision(baseTables, null);

    expect(decision.decision).toBe("push-local");
  });

  it("marca conflito quando local e nuvem divergem", () => {
    const conflict = resolveInitialSyncDecision(
      baseTables,
      createPayload({
        libraryEntries: [
          {
            ...baseTables.libraryEntries[0],
            progressPercent: 80,
          },
        ],
      }),
    );

    expect(conflict.decision).toBe("conflict");
  });
});
