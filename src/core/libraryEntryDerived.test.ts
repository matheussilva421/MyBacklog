import { describe, expect, it } from "vitest";
import type { LibraryEntry } from "./types";
import {
  classifyAccessSource,
  hasStarted,
  isBacklogEntry,
  isCompleted,
  isCurrentlyPlaying,
  isWantToPlay,
  resolveLibraryEntrySemantics,
} from "./libraryEntryDerived";

function createEntry(partial: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    gameId: 1,
    platform: "PC",
    sourceStore: "Steam",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...partial,
  };
}

describe("libraryEntryDerived", () => {
  it("classifies known access sources", () => {
    expect(classifyAccessSource("Steam")).toBe("steam");
    expect(classifyAccessSource("Game Pass")).toBe("game_pass");
    expect(classifyAccessSource("PS Plus")).toBe("ps_plus");
    expect(classifyAccessSource("Nintendo eShop")).toBe("nintendo_eshop");
  });

  it("derives ownership semantics from legacy ownershipStatus", () => {
    expect(resolveLibraryEntrySemantics(createEntry({ ownershipStatus: "owned" })).accessModel).toBe("purchase");
    expect(
      resolveLibraryEntrySemantics(createEntry({ ownershipStatus: "subscription", sourceStore: "Game Pass" }))
        .accessModel,
    ).toBe("subscription");
    expect(resolveLibraryEntrySemantics(createEntry({ ownershipStatus: "wishlist" })).possession).toBe("wishlist");
  });

  it("centralizes completion and active state checks", () => {
    expect(isCompleted(createEntry({ progressStatus: "finished" }))).toBe(true);
    expect(isCompleted(createEntry({ completionPercent: 100 }))).toBe(true);
    expect(isCurrentlyPlaying(createEntry({ progressStatus: "playing" }))).toBe(true);
    expect(hasStarted(createEntry({ progressStatus: "paused" }))).toBe(true);
  });

  it("distinguishes backlog and want-to-play states", () => {
    expect(isBacklogEntry(createEntry())).toBe(true);
    expect(isWantToPlay(createEntry())).toBe(true);
    expect(isWantToPlay(createEntry({ ownershipStatus: "wishlist" }))).toBe(true);
    expect(isBacklogEntry(createEntry({ progressStatus: "playing", completionPercent: 20 }))).toBe(false);
  });
});
