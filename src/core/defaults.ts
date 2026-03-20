import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession } from "./types";
import { normalizeGameTitle } from "./utils";

export function defaultGameToDbGame(game: Partial<DbGameMetadata>): DbGameMetadata {
  return {
    title: game.title ?? "",
    normalizedTitle: normalizeGameTitle(game.title ?? ""),
    slug: game.slug,
    coverUrl: game.coverUrl,
    rawgId: game.rawgId,
    description: game.description,
    platforms: game.platforms,
    genres: game.genres,
    estimatedTime: game.estimatedTime,
    difficulty: game.difficulty,
    releaseYear: game.releaseYear,
    developer: game.developer,
    publisher: game.publisher,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as DbGameMetadata;
}

export function defaultGameToDbLibraryEntry(game: Partial<DbGameMetadata>): DbLibraryEntry {
  return {
    gameId: 0,
    platform: game.platforms?.split(",")[0]?.trim() || "PC",
    sourceStore: "Manual",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as DbLibraryEntry;
}

export const defaultGames: Partial<DbGameMetadata>[] = [
  {
    title: "Cyberpunk 2077",
    rawgId: 41494,
    coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900_2x.jpg",
    description:
      "RPG de ação em Night City com campanha principal, builds variadas e exploração urbana em mundo aberto.",
    genres: "RPG, Action",
    platforms: "PC, PS5",
    estimatedTime: "60h",
    difficulty: "Média",
    releaseYear: 2020,
    developer: "CD PROJEKT RED",
    publisher: "CD PROJEKT RED",
  },
  {
    title: "Hades",
    rawgId: 3498,
    coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900_2x.jpg",
    description:
      "Roguelike de ação com runs rápidas, progressão constante e forte reatividade para sessões curtas.",
    genres: "Roguelike, Action",
    platforms: "PC, Switch",
    estimatedTime: "25h",
    difficulty: "Alta",
    releaseYear: 2020,
    developer: "Supergiant Games",
    publisher: "Supergiant Games",
  },
  {
    title: "Final Fantasy VII Rebirth",
    rawgId: 963310,
    description:
      "RPG de grande escala com foco em campanha longa, exploração e múltiplos sistemas de progressão.",
    genres: "RPG",
    platforms: "PS5",
    estimatedTime: "100h",
    difficulty: "Média",
    releaseYear: 2024,
    developer: "Square Enix",
    publisher: "Square Enix",
  },
];

export const defaultSessions: Partial<DbPlaySession>[] = [];
