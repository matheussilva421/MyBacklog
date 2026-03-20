import { describe, expect, it } from "vitest";
import {
  createFreshStartLocalSettings,
  shouldSeedDefaultLibrary,
} from "./backlogRepository";

describe("backlogRepository", () => {
  it("bloqueia o seed padrão quando existe marcador de fresh start", () => {
    const shouldSeed = shouldSeedDefaultLibrary({
      seedIfEmpty: true,
      libraryEntryCount: 0,
      settingRows: createFreshStartLocalSettings("2026-03-20T12:00:00.000Z"),
    });

    expect(shouldSeed).toBe(false);
  });

  it("continua semeando quando a base está vazia e nenhum marcador foi persistido", () => {
    const shouldSeed = shouldSeedDefaultLibrary({
      seedIfEmpty: true,
      libraryEntryCount: 0,
      settingRows: [],
    });

    expect(shouldSeed).toBe(true);
  });
});
