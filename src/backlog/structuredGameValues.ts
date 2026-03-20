import type { Game } from "./shared";

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function getGamePlatforms(game: Pick<Game, "platform" | "platforms">): string[] {
  return dedupe(game.platforms?.length ? game.platforms : [game.platform]);
}

export function getGameStores(game: Pick<Game, "sourceStore" | "stores">): string[] {
  return dedupe(game.stores?.length ? game.stores : [game.sourceStore]);
}
