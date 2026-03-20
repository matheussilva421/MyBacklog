import { describe, expect, it } from "vitest";
import type { BackupPayload } from "../backlog/shared";
import { shouldBlockPushBecauseOfConflict } from "./useCloudSync";
import {
  buildSyncFingerprint,
  mergeSyncTables,
  resolveInitialSyncDecision,
  stripBackupMeta,
} from "../modules/sync-center/utils/syncEngine";
import { syncSettingsKeys } from "../modules/sync-center/utils/syncStorage";

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
  savedViews: [],
};

function createPayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: 6,
    exportedAt: "2026-03-19T12:00:00.000Z",
    source: "mybacklog",
    ...baseTables,
    ...overrides,
  };
}

describe("syncEngine helpers", () => {
  it("permite manual push mesmo quando a comparacao aponta conflito", () => {
    expect(shouldBlockPushBecauseOfConflict("manual-push", "conflict")).toBe(false);
    expect(shouldBlockPushBecauseOfConflict("auto-push", "conflict")).toBe(true);
  });

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
        savedViews: [],
      },
      createPayload(),
    );

    expect(decision.decision).toBe("pull-cloud");
  });

  it("ignora marcadores locais de fresh start ao decidir se existe dado para sync", () => {
    const decision = resolveInitialSyncDecision(
      {
        ...createPayload(),
        ...{
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
          savedViews: [],
          settings: [
            {
              id: 1,
              key: syncSettingsKeys.skipDefaultSeed,
              value: "true",
              updatedAt: "2026-03-20T10:00:00.000Z",
            },
          ],
        },
      },
      null,
    );

    expect(decision.decision).toBe("idle");
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

    // Agora divergências reconciliáveis são auto-merge
    expect(conflict.decision).toBe("auto-merge");
  });

  it("marca conflito real quando reviews têm scores diferentes", () => {
    const tablesWithReview = {
      ...baseTables,
      reviews: [
        {
          id: 1,
          libraryEntryId: 1,
          score: 5,
          shortReview: "Jogo excelente",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    };

    const conflict = resolveInitialSyncDecision(
      tablesWithReview,
      createPayload({
        reviews: [
          {
            id: 2,
            libraryEntryId: 1,
            score: 3, // Score diferente do local (que é 5)
            shortReview: "Jogo médio",
            createdAt: "2026-03-02T10:00:00.000Z",
            updatedAt: "2026-03-02T10:00:00.000Z",
          },
        ],
      }),
    );

    // Conflito real: mesma review com score diferente exige intervenção
    expect(conflict.decision).toBe("conflict");
  });

  it("marca conflito real quando sessões têm durações diferentes na mesma data", () => {
    const tablesWithSession = {
      ...baseTables,
      playSessions: [
        {
          id: 1,
          libraryEntryId: 1,
          date: "2026-03-10",
          platform: "PC",
          durationMinutes: 60,
          completionPercent: 62,
          note: "Sessão teste",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    };

    const conflict = resolveInitialSyncDecision(
      tablesWithSession,
      createPayload({
        playSessions: [
          {
            id: 2,
            libraryEntryId: 1,
            date: "2026-03-10", // Mesma data
            platform: "PC", // Mesma plataforma
            durationMinutes: 90, // Duração diferente da local (que é 60)
            completionPercent: 65,
            note: "Sessão teste cloud",
            createdAt: "2026-03-02T10:00:00.000Z",
            updatedAt: "2026-03-02T10:00:00.000Z",
          },
        ],
      }),
    );

    // Conflito real: mesma sessão com duração diferente
    expect(conflict.decision).toBe("conflict");
  });

  it("mescla entradas com overlap estrutural de plataforma mesmo com plataforma principal diferente", () => {
    const merged = mergeSyncTables(
      {
        ...baseTables,
        games: [{ ...baseTables.games[0], platforms: "PC, Steam Deck" }],
        libraryEntries: [
          {
            ...baseTables.libraryEntries[0],
            platform: "Steam Deck",
            updatedAt: "2026-03-12T10:00:00.000Z",
          },
        ],
        platforms: [
          ...baseTables.platforms,
          {
            id: 2,
            name: "Steam Deck",
            normalizedName: "steam deck",
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-01T10:00:00.000Z",
          },
        ],
        gamePlatforms: [
          ...baseTables.gamePlatforms,
          {
            id: 2,
            gameId: 1,
            platformId: 2,
            createdAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
      {
        ...baseTables,
        games: [{ ...baseTables.games[0], id: 9, platforms: "PC" }],
        libraryEntries: [
          {
            ...baseTables.libraryEntries[0],
            id: 9,
            gameId: 9,
            platform: "PC",
            updatedAt: "2026-03-11T10:00:00.000Z",
          },
        ],
        stores: [{ ...baseTables.stores[0], id: 9 }],
        libraryEntryStores: [
          {
            ...baseTables.libraryEntryStores[0],
            id: 9,
            libraryEntryId: 9,
            storeId: 9,
          },
        ],
        platforms: [{ ...baseTables.platforms[0], id: 9 }],
        gamePlatforms: [
          {
            ...baseTables.gamePlatforms[0],
            id: 9,
            gameId: 9,
            platformId: 9,
          },
        ],
      },
    );

    expect(merged.libraryEntries).toHaveLength(1);
    expect(merged.gamePlatforms).toHaveLength(2);
    expect(merged.libraryEntries[0]?.platform).toBe("Steam Deck");
  });

  it("preserva sessoes com mesma assinatura basica quando a plataforma diverge", () => {
    const merged = mergeSyncTables(
      {
        ...baseTables,
        playSessions: [
          {
            id: 1,
            libraryEntryId: 1,
            date: "2026-03-18",
            platform: "PC",
            durationMinutes: 90,
            note: "Boss fight",
            completionPercent: 62,
          },
        ],
      },
      {
        ...baseTables,
        games: [{ ...baseTables.games[0], id: 9 }],
        libraryEntries: [{ ...baseTables.libraryEntries[0], id: 9, gameId: 9 }],
        stores: [{ ...baseTables.stores[0], id: 9 }],
        libraryEntryStores: [
          {
            ...baseTables.libraryEntryStores[0],
            id: 9,
            libraryEntryId: 9,
            storeId: 9,
          },
        ],
        platforms: [{ ...baseTables.platforms[0], id: 9 }],
        gamePlatforms: [
          {
            ...baseTables.gamePlatforms[0],
            id: 9,
            gameId: 9,
            platformId: 9,
          },
        ],
        playSessions: [
          {
            id: 9,
            libraryEntryId: 9,
            date: "2026-03-18",
            platform: "Steam Deck",
            durationMinutes: 90,
            note: "Boss fight",
            completionPercent: 62,
          },
        ],
      },
    );

    expect(merged.libraryEntries).toHaveLength(1);
    expect(merged.playSessions).toHaveLength(2);
    expect(merged.playSessions.map((session) => session.platform)).toEqual(["PC", "Steam Deck"]);
  });
});
