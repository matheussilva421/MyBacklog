import Dexie, { type Table } from "dexie";
import type {
  Game,
  GameTag,
  Goal,
  ImportJob,
  LegacyGameRecord,
  LibraryEntry,
  LibraryEntryList,
  List,
  PlaySession,
  Review,
  Setting,
  Tag,
} from "./types";

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

class MyBacklogDB extends Dexie {
  games!: Table<Game, number>;
  libraryEntries!: Table<LibraryEntry, number>;
  playSessions!: Table<PlaySession, number>;
  reviews!: Table<Review, number>;
  lists!: Table<List, number>;
  libraryEntryLists!: Table<LibraryEntryList, number>;
  tags!: Table<Tag, number>;
  gameTags!: Table<GameTag, number>;
  goals!: Table<Goal, number>;
  settings!: Table<Setting, number>;
  importJobs!: Table<ImportJob, number>;

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
            });
          } else {
            existingGame.platforms = mergePlatforms(existingGame.platforms, legacy.platform);
            existingGame.genres = existingGame.genres || legacy.genres;
            existingGame.estimatedTime = existingGame.estimatedTime || legacy.estimatedTime;
            existingGame.difficulty = existingGame.difficulty || legacy.difficulty;
            existingGame.rawgId = existingGame.rawgId ?? legacy.rawgId;
            existingGame.coverUrl = existingGame.coverUrl || legacy.coverUrl;
            existingGame.updatedAt = existingGame.updatedAt > legacy.updatedAt ? existingGame.updatedAt : legacy.updatedAt;
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
          });
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
      libraryEntryLists:
        "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
      tags: "++id, name",
      gameTags: "++id, libraryEntryId, tagId",
      goals: "++id, type, period",
      settings: "++id, key, updatedAt",
      importJobs: "++id, source, status, createdAt, updatedAt",
    });
  }
}

export const db = new MyBacklogDB();
