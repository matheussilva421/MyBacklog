import { describe, expect, it } from "vitest";
import { formatDuration, formatRemainingEta, mergePlatformList, normalizeGameTitle } from "./utils";

describe("core/utils", () => {
  describe("normalizeGameTitle", () => {
    it("trims and lowercases title", () => {
      expect(normalizeGameTitle("  The Witcher 3  ")).toBe("the witcher 3");
    });

    it("handles empty strings", () => {
      expect(normalizeGameTitle("")).toBe("");
    });
  });

  describe("mergePlatformList", () => {
    it("merges platforms without duplicates", () => {
      expect(mergePlatformList("PC, PS5", "PC, Xbox")).toBe("PC, PS5, Xbox");
    });

    it("handles undefined current", () => {
      expect(mergePlatformList(undefined, "PC")).toBe("PC");
    });
  });

  describe("formatDuration", () => {
    it("formats minutes only", () => {
      expect(formatDuration(45)).toBe("45m");
    });

    it("formats hours only", () => {
      expect(formatDuration(120)).toBe("2h");
    });

    it("formats hours and minutes", () => {
      expect(formatDuration(135)).toBe("2h 15m");
    });
  });

  describe("formatRemainingEta", () => {
    it("uses progress percent to estimate remaining hours", () => {
      expect(formatRemainingEta("14h", 62, 48)).toBe("6h restantes");
    });

    it("falls back to logged hours when progress is zero", () => {
      expect(formatRemainingEta("20h", 0, 7)).toBe("13h restantes");
    });

    it("reports completed entries", () => {
      expect(formatRemainingEta("12h", 100, 12)).toBe("Concluido");
    });

    it("handles missing eta", () => {
      expect(formatRemainingEta("Sem dado", 20, 1)).toBe("Sem ETA");
    });
  });
});
