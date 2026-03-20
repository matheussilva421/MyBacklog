import { describe, expect, it } from "vitest";
import { createDbGameFromForm } from "./formState";

describe("createDbGameFromForm", () => {
  it("ignores invalid numeric strings instead of persisting NaN", () => {
    const result = createDbGameFromForm(
      {
        title: "Hades",
        platform: "PC",
        platforms: ["PC"],
        catalogPlatforms: "PC",
        sourceStore: "Steam",
        stores: ["Steam"],
        genre: "Roguelike",
        status: "Backlog",
        priority: "Média",
        progress: "10",
        hours: "2",
        eta: "12h",
        score: "inválido",
        year: "ano",
        mood: "",
        difficulty: "Média",
        coverUrl: "",
        rawgId: "abc",
        developer: "",
        publisher: "",
        description: "",
        notes: "",
        startedAt: "",
        purchaseDate: "",
        pricePaid: "sem-preço",
        targetPrice: "sem-meta",
        currency: "BRL",
        storeLink: "",
      },
      {
        game: {
          id: 1,
          title: "Hades",
          normalizedTitle: "hades",
          rawgId: 123,
          releaseYear: 2020,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
        libraryEntry: {
          id: 2,
          gameId: 1,
          platform: "PC",
          sourceStore: "Steam",
          format: "digital",
          ownershipStatus: "owned",
          progressStatus: "not_started",
          playtimeMinutes: 60,
          completionPercent: 10,
          priority: "medium",
          personalRating: 4,
          pricePaid: 35,
          targetPrice: 20,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      },
    );

    expect(result.game.rawgId).toBe(123);
    expect(result.game.releaseYear).toBe(2020);
    expect(result.libraryEntry.pricePaid).toBe(35);
    expect(result.libraryEntry.targetPrice).toBe(20);
    expect(result.libraryEntry.personalRating).toBe(4);
  });
});
