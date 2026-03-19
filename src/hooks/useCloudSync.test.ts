import { describe, expect, it } from "vitest";
import type { BackupPayload } from "../backlog/shared";
import {
  buildSyncFingerprint,
  resolveInitialSyncDecision,
  stripBackupMeta,
} from "../modules/sync-center/utils/syncEngine";

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
  stores: [
    {
      id: 1,
      name: "Steam",
      normalizedName: "steam",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    },
  ],
  libraryEntryStores: [
    {
      id: 1,
      libraryEntryId: 1,
      storeId: 1,
      isPrimary: true,
      createdAt: "2026-03-01T10:00:00.000Z",
    },
  ],
  platforms: [
    {
      id: 1,
      name: "PC",
      normalizedName: "pc",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    },
  ],
  gamePlatforms: [{ id: 1, gameId: 1, platformId: 1, createdAt: "2026-03-01T10:00:00.000Z" }],
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
    version: 5,
    exportedAt: "2026-03-19T12:00:00.000Z",
    source: "mybacklog",
    ...baseTables,
    ...overrides,
  };
}

describe("syncEngine helpers", () => {
  it("ignora exportedAt ao montar fingerprint", () => {
    const first = createPayload({ exportedAt: "2026-03-19T12:00:00.000Z" });
    const second = createPayload({ exportedAt: "2026-03-19T13:00:00.000Z" });

    expect(buildSyncFingerprint(stripBackupMeta(first))).toBe(
      buildSyncFingerprint(stripBackupMeta(second)),
    );
  });

  it("ignora settings operacionais locais no fingerprint", () => {
    const withSyncMeta = createPayload({
      settings: [
        {
          id: 1,
          key: "app.lastSuccessfulSyncAt",
          value: "2026-03-19T14:00:00.000Z",
          updatedAt: "2026-03-19T14:00:00.000Z",
        },
      ],
    });

    expect(buildSyncFingerprint(stripBackupMeta(withSyncMeta))).toBe(
      buildSyncFingerprint(stripBackupMeta(createPayload())),
    );
  });

  it("puxa da nuvem quando a base local está vazia", () => {
    const decision = resolveInitialSyncDecision(
      {
        games: [],
        libraryEntries: [],
        stores: [],
        libraryEntryStores: [],
        platforms: [],
        gamePlatforms: [],
        playSessions: [],
        reviews: [],
        lists: [],
        libraryEntryLists: [],
        tags: [],
        gameTags: [],
        goals: [],
        settings: [],
      },
      createPayload(),
    );

    expect(decision.decision).toBe("pull-cloud");
  });

  it("envia para a nuvem quando não existe backup remoto", () => {
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
            completionPercent: 80,
          },
        ],
      }),
    );

    expect(conflict.decision).toBe("conflict");
  });
});
