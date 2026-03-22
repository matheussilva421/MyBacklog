import Dexie, { type Table } from "dexie";
import type {
  Game,
  GamePlatform,
  GameTag,
  Goal,
  ImportJob,
  LegacyGameRecord,
  LibraryEntry,
  LibraryEntryStore,
  LibraryEntryList,
  List,
  LocalRevision,
  PendingMutation,
  Platform,
  PlaySession,
  Review,
  SavedView,
  Setting,
  Store,
  Tag,
} from "./types";
import { buildStructuredTablesFromLegacy } from "./structuredTables";
import { classifyAccessSource } from "./libraryEntryDerived";
import { defaultGames } from "./defaults";
import { repairLegacyText } from "./utils";

// Local copies of normalizeGameTitle/mergePlatformList from utils.ts —
// kept self-contained here so the v2 migration never breaks if utils change.
function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function mergePlatforms(current: string | undefined, incoming: string): string {
  const tokens = new Set(
    [current, incoming]
      .flatMap((value) => String(value || "").split(","))
      .map((token) => token.trim())
      .filter(Boolean),
  );
  return Array.from(tokens).join(", ");
}

function toDateOnly(value?: string): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

class MyBacklogDB extends Dexie {
  games!: Table<Game, number>;
  libraryEntries!: Table<LibraryEntry, number>;
  stores!: Table<Store, number>;
  libraryEntryStores!: Table<LibraryEntryStore, number>;
  platforms!: Table<Platform, number>;
  gamePlatforms!: Table<GamePlatform, number>;
  playSessions!: Table<PlaySession, number>;
  reviews!: Table<Review, number>;
  lists!: Table<List, number>;
  libraryEntryLists!: Table<LibraryEntryList, number>;
  tags!: Table<Tag, number>;
  gameTags!: Table<GameTag, number>;
  goals!: Table<Goal, number>;
  settings!: Table<Setting, number>;
  savedViews!: Table<SavedView, number>;
  importJobs!: Table<ImportJob, number>;
  localRevision!: Table<LocalRevision, number>;
  pendingMutations!: Table<PendingMutation, number>;

  constructor() {
    super("mybacklog");

    this.version(1).stores({
      games:
        "++id, title, platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, rawgId, *genres",
      playSessions: "++id, gameId, date",
      reviews: "++id, gameId",
      lists: "++id, name",
      tags: "++id, name",
      gameTags: "++id, gameId, tagId",
      goals: "++id, type, period",
    });

    this.version(2)
      .stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries:
          "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      })
      .upgrade(async (tx) => {
        const legacyGames = (await tx.table("games").toArray()) as LegacyGameRecord[];
        const migratedGames = new Map<string, Game>();
        const migratedEntries: LibraryEntry[] = [];

        for (const legacy of legacyGames) {
          if (!legacy.id) continue;

          const normalizedTitle = normalizeTitle(legacy.title);
          const existingGame = migratedGames.get(normalizedTitle);
          if (!existingGame) {
            migratedGames.set(normalizedTitle, {
              id: legacy.id,
              title: legacy.title,
              normalizedTitle,
              coverUrl: legacy.coverUrl,
              rawgId: legacy.rawgId,
              genres: legacy.genres,
              estimatedTime: legacy.estimatedTime,
              difficulty: legacy.difficulty,
              releaseYear: legacy.releaseYear,
              platforms: legacy.platform,
              createdAt: legacy.createdAt,
              updatedAt: legacy.updatedAt,
            } as unknown as Game);
          } else {
            existingGame.platforms = mergePlatforms(existingGame.platforms, legacy.platform);
            existingGame.genres = existingGame.genres || legacy.genres;
            existingGame.estimatedTime = existingGame.estimatedTime || legacy.estimatedTime;
            existingGame.difficulty = existingGame.difficulty || legacy.difficulty;
            existingGame.rawgId = existingGame.rawgId ?? legacy.rawgId;
            existingGame.coverUrl = existingGame.coverUrl || legacy.coverUrl;
            existingGame.updatedAt =
              existingGame.updatedAt > legacy.updatedAt ? existingGame.updatedAt : legacy.updatedAt;
          }

          const metadata = migratedGames.get(normalizedTitle);
          if (!metadata?.id) continue;

          migratedEntries.push({
            id: legacy.id,
            gameId: metadata.id,
            platform: legacy.platform,
            sourceStore: legacy.sourceStore,
            edition: legacy.edition,
            format: legacy.format,
            ownershipStatus: legacy.ownershipStatus,
            progressStatus: legacy.progressStatus,
            purchaseDate: legacy.purchaseDate,
            pricePaid: legacy.pricePaid,
            playtimeMinutes: legacy.playtimeMinutes,
            completionPercent: legacy.completionPercent,
            priority: legacy.priority,
            personalRating: legacy.personalRating,
            notes: legacy.notes,
            checklist: legacy.checklist,
            mood: legacy.mood,
            favorite: legacy.favorite,
            createdAt: legacy.createdAt,
            updatedAt: legacy.updatedAt,
          } as unknown as LibraryEntry);
        }

        await tx.table("games").clear();
        if (migratedGames.size > 0) {
          await tx.table("games").bulkPut(Array.from(migratedGames.values()));
        }
        if (migratedEntries.length > 0) {
          await tx.table("libraryEntries").bulkPut(migratedEntries);
        }

        await tx
          .table("playSessions")
          .toCollection()
          .modify((session: Record<string, unknown>) => {
            session.libraryEntryId = session.gameId;
            delete session.gameId;
          });

        await tx
          .table("reviews")
          .toCollection()
          .modify((review: Record<string, unknown>) => {
            review.libraryEntryId = review.gameId;
            delete review.gameId;
          });

        await tx
          .table("gameTags")
          .toCollection()
          .modify((entry: Record<string, unknown>) => {
            entry.libraryEntryId = entry.gameId;
            delete entry.gameId;
          });
      });

    this.version(3).stores({
      games: "++id, normalizedTitle, title, rawgId, releaseYear",
      libraryEntries:
        "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt",
      playSessions: "++id, libraryEntryId, date",
      reviews: "++id, libraryEntryId",
      lists: "++id, name",
      libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
      tags: "++id, name",
      gameTags: "++id, libraryEntryId, tagId",
      goals: "++id, type, period",
      settings: "++id, key, updatedAt",
      importJobs: "++id, source, status, createdAt, updatedAt",
    });

    this.version(4)
      .stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries:
          "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, updatedAt",
        libraryEntryStores:
          "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      })
      .upgrade(async (tx) => {
        const [games, libraryEntries] = await Promise.all([
          tx.table("games").toArray() as Promise<Game[]>,
          tx.table("libraryEntries").toArray() as Promise<LibraryEntry[]>,
        ]);

        const migratedEntries = libraryEntries.map((entry) => ({
          ...entry,
          completionDate:
            entry.completionDate ||
            (entry.completionPercent >= 100 ||
            entry.progressStatus === "finished" ||
            entry.progressStatus === "completed_100"
              ? toDateOnly(entry.lastSessionAt || entry.updatedAt)
              : undefined),
        }));

        if (migratedEntries.length > 0) {
          await tx.table("libraryEntries").bulkPut(migratedEntries);
        }

        const structuredSnapshot = buildStructuredTablesFromLegacy({
          games,
          libraryEntries: migratedEntries,
        });

        if (structuredSnapshot.stores.length > 0) {
          await tx.table("stores").bulkPut(structuredSnapshot.stores);
        }
        if (structuredSnapshot.libraryEntryStores.length > 0) {
          await tx.table("libraryEntryStores").bulkPut(structuredSnapshot.libraryEntryStores);
        }
        if (structuredSnapshot.platforms.length > 0) {
          await tx.table("platforms").bulkPut(structuredSnapshot.platforms);
        }
        if (structuredSnapshot.gamePlatforms.length > 0) {
          await tx.table("gamePlatforms").bulkPut(structuredSnapshot.gamePlatforms);
        }
      });

    this.version(5)
      .stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries:
          "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, sourceKey, updatedAt",
        libraryEntryStores:
          "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        savedViews: "++id, scope, name, [scope+name], updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      })
      .upgrade(async (tx) => {
        const storeRows = (await tx.table("stores").toArray()) as Store[];
        if (storeRows.length > 0) {
          await tx.table("stores").bulkPut(
            storeRows.map((store) => ({
              ...store,
              sourceKey: store.sourceKey ?? classifyAccessSource(store.name),
            })),
          );
        }
      });

    this.version(6)
      .stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries:
          "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, sourceKey, updatedAt",
        libraryEntryStores:
          "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        savedViews: "++id, scope, name, [scope+name], updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      })
      .upgrade(async (tx) => {
        const curatedMetadataByTitle = new Map(
          defaultGames
            .filter((game) => Boolean(game.title))
            .map((game) => [normalizeTitle(String(game.title)), game] as const),
        );

        const [games, libraryEntries] = await Promise.all([
          tx.table("games").toArray() as Promise<Game[]>,
          tx.table("libraryEntries").toArray() as Promise<LibraryEntry[]>,
        ]);

        const sanitizedGames = games.map((game) => {
          const repairedTitle = repairLegacyText(game.title) || game.title;
          const curated = curatedMetadataByTitle.get(normalizeTitle(repairedTitle));

          return {
            ...game,
            title: repairedTitle,
            normalizedTitle: normalizeTitle(repairedTitle),
            coverUrl: game.coverUrl || curated?.coverUrl,
            rawgId: game.rawgId ?? curated?.rawgId,
            description: repairLegacyText(game.description) || game.description || curated?.description,
            genres: repairLegacyText(game.genres) || game.genres || curated?.genres,
            estimatedTime: repairLegacyText(game.estimatedTime) || game.estimatedTime || curated?.estimatedTime,
            difficulty: repairLegacyText(game.difficulty) || game.difficulty || curated?.difficulty,
            platforms: repairLegacyText(game.platforms) || game.platforms || curated?.platforms,
            developer: repairLegacyText(game.developer) || game.developer || curated?.developer,
            publisher: repairLegacyText(game.publisher) || game.publisher || curated?.publisher,
            releaseYear: game.releaseYear ?? curated?.releaseYear,
          } satisfies Game;
        });

        const sanitizedEntries = libraryEntries.map((entry) => ({
          ...entry,
          platform: repairLegacyText(entry.platform) || entry.platform,
          sourceStore: repairLegacyText(entry.sourceStore) || entry.sourceStore,
          edition: repairLegacyText(entry.edition) || entry.edition,
          notes: repairLegacyText(entry.notes) || entry.notes,
          checklist: repairLegacyText(entry.checklist) || entry.checklist,
          mood: repairLegacyText(entry.mood) || entry.mood,
        }));

        if (sanitizedGames.length > 0) {
          await tx.table("games").bulkPut(sanitizedGames);
        }
        if (sanitizedEntries.length > 0) {
          await tx.table("libraryEntries").bulkPut(sanitizedEntries);
        }
      });

    this.version(7)
      .stores({
        games: "++id, &uuid, normalizedTitle, title, rawgId, releaseYear, updatedAt, deletedAt, [deletedAt+updatedAt]",
        libraryEntries:
          "++id, &uuid, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate, deletedAt, [deletedAt+updatedAt], [deletedAt+lastSessionAt]",
        stores: "++id, &uuid, normalizedName, name, sourceKey, updatedAt, deletedAt, [deletedAt+updatedAt]",
        libraryEntryStores:
          "++id, &uuid, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt, updatedAt, deletedAt",
        platforms: "++id, &uuid, normalizedName, name, updatedAt, deletedAt, [deletedAt+updatedAt]",
        gamePlatforms:
          "++id, &uuid, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt, updatedAt, deletedAt",
        playSessions: "++id, &uuid, libraryEntryId, date, updatedAt, deletedAt, [deletedAt+date]",
        reviews: "++id, &uuid, libraryEntryId, updatedAt, deletedAt",
        lists: "++id, &uuid, name, updatedAt, deletedAt, [deletedAt+updatedAt]",
        libraryEntryLists:
          "++id, &uuid, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt, updatedAt, deletedAt",
        tags: "++id, &uuid, name, updatedAt, deletedAt, [deletedAt+updatedAt]",
        gameTags: "++id, &uuid, libraryEntryId, tagId, createdAt, updatedAt, deletedAt",
        goals: "++id, &uuid, type, period, updatedAt, deletedAt",
        settings: "++id, key, updatedAt",
        savedViews: "++id, &uuid, scope, name, [scope+name], updatedAt, deletedAt",
        importJobs: "++id, &uuid, source, status, createdAt, updatedAt, deletedAt",
        localRevision: "++id, &key, revision, lastMutationAt, updatedAt",
      })
      .upgrade(async (tx) => {
        const now = new Date().toISOString();

        // Helper para gerar uuid
        const generateUuid = () =>
          `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

        // Atualizar todas as tabelas syncáveis
        const tables = [
          tx.table("games"),
          tx.table("libraryEntries"),
          tx.table("stores"),
          tx.table("libraryEntryStores"),
          tx.table("platforms"),
          tx.table("gamePlatforms"),
          tx.table("playSessions"),
          tx.table("reviews"),
          tx.table("lists"),
          tx.table("libraryEntryLists"),
          tx.table("tags"),
          tx.table("gameTags"),
          tx.table("goals"),
          tx.table("savedViews"),
          tx.table("importJobs"),
        ];

        for (const table of tables) {
          const records = await table.toArray();
          for (const record of records) {
            if (!record.uuid) {
              await table.update(record.id, {
                uuid: generateUuid(),
                version: 1,
                deletedAt: null,
                updatedAt: record.updatedAt || now,
              });
            }
          }
        }

        // Inicializar localRevision
        const existingRevision = await tx.table("localRevision").get({ key: "localRevision" });
        if (!existingRevision) {
          await tx.table("localRevision").add({
            key: "localRevision",
            revision: 0,
            lastMutationAt: now,
            updatedAt: now,
          });
        }
      });

    this.version(8).stores({
      pendingMutations:
        "++id, uuid, [uuid+entityType], syncedAt, createdAt, retryCount, [syncedAt+createdAt], [retryCount+syncedAt]",
    });

    // Versão 9: Corrige schema da tabela localRevision (adiciona campo key e índices)
    // Remove a tabela antiga se existir (dados serão recriados pelo sync)
    this.version(9)
      .stores({
        localRevision: "++id, &key, revision, lastMutationAt, updatedAt",
      })
      .upgrade(async (tx) => {
        // Limpar tabela localRevision se existir - será recriada quando necessário
        await tx.table("localRevision").clear();
      });
  }
}

export const db = new MyBacklogDB();
