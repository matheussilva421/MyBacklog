import { describe, expect, it } from "vitest";
import type { LibraryRecord } from "../../../backlog/shared";
import { buildSavedViewPayload, groupLibraryGames, savedStatusToStatusFilter, sortLibraryGames, statusFilterToSavedStatus } from "./savedViews";

const baseGames = [
  {
    id: 1,
    title: "Alan Wake 2",
    platform: "PC",
    platforms: ["PC", "PS5"],
    sourceStore: "Epic",
    stores: ["Epic", "Steam"],
    genre: "Survival Horror",
    status: "Jogando" as const,
    progress: 40,
    hours: 16,
    eta: "9h",
    priority: "Alta" as const,
    mood: "Imersivo",
    score: 9.2,
    year: 2023,
    notes: "",
    difficulty: "Média",
  },
  {
    id: 2,
    title: "A Short Hike",
    platform: "Switch",
    platforms: ["Switch"],
    sourceStore: "Nintendo eShop",
    stores: ["Nintendo eShop"],
    genre: "Adventure",
    status: "Backlog" as const,
    progress: 0,
    hours: 0,
    eta: "2h",
    priority: "Média" as const,
    mood: "Leve",
    score: 0,
    year: 2019,
    notes: "",
    difficulty: "Baixa",
  },
];

const recordsByEntryId = new Map<number | undefined, LibraryRecord>([
  [
    1,
    {
      game: {
        id: 10,
        title: "Alan Wake 2",
        normalizedTitle: "alan wake 2",
        platforms: "PC",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-10T00:00:00.000Z",
      },
      libraryEntry: {
        id: 1,
        gameId: 10,
        platform: "PC",
        sourceStore: "Epic",
        format: "digital",
        ownershipStatus: "owned",
        progressStatus: "playing",
        playtimeMinutes: 960,
        completionPercent: 40,
        priority: "high",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-12T00:00:00.000Z",
      },
    },
  ],
  [
    2,
    {
      game: {
        id: 20,
        title: "A Short Hike",
        normalizedTitle: "a short hike",
        platforms: "Switch",
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-03T00:00:00.000Z",
      },
      libraryEntry: {
        id: 2,
        gameId: 20,
        platform: "Switch",
        sourceStore: "Nintendo eShop",
        format: "digital",
        ownershipStatus: "owned",
        progressStatus: "not_started",
        playtimeMinutes: 0,
        completionPercent: 0,
        priority: "medium",
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-03T00:00:00.000Z",
      },
    },
  ],
]);

describe("savedViews helpers", () => {
  it("converte filtros entre UI e persistência", () => {
    expect(statusFilterToSavedStatus("Jogando")).toBe("playing");
    expect(savedStatusToStatusFilter("completed")).toBe("Terminado");
  });

  it("salva payload mínimo da view atual", () => {
    const payload = buildSavedViewPayload(
      {
        query: "alan",
        filter: "Jogando",
        selectedListFilter: "all",
        sortBy: "hours",
        sortDirection: "desc",
        groupBy: "platform",
      },
      "Ativos quentes",
    );

    expect(payload.scope).toBe("library");
    expect(payload.statusFilter).toBe("playing");
    expect(payload.sortBy).toBe("hours");
    expect(payload.groupBy).toBe("platform");
  });

  it("ordena os jogos pelo critério selecionado", () => {
    const sorted = sortLibraryGames(baseGames, recordsByEntryId, "title", "asc");
    expect(sorted.map((game) => game.title)).toEqual(["A Short Hike", "Alan Wake 2"]);
  });

  it("agrupa por ownership derivado", () => {
    const grouped = groupLibraryGames(baseGames, recordsByEntryId, "ownership");
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.games).toHaveLength(2);
  });

  it("agrupa por plataformas estruturadas sem depender só da principal", () => {
    const grouped = groupLibraryGames(baseGames, recordsByEntryId, "platform");

    expect(grouped.map((group) => group.label)).toContain("PS5");
    expect(grouped.find((group) => group.label === "PS5")?.games.map((game) => game.title)).toContain("Alan Wake 2");
  });

  it("agrupa por stores estruturadas sem depender só da origem principal", () => {
    const grouped = groupLibraryGames(baseGames, recordsByEntryId, "sourceStore");

    expect(grouped.map((group) => group.label)).toContain("Steam");
    expect(grouped.find((group) => group.label === "Steam")?.games.map((game) => game.title)).toContain("Alan Wake 2");
  });
});
