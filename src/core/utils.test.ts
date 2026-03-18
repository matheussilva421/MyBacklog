import { describe, expect, it } from "vitest";
import { cx, formatDuration, formatRemainingEta, mergePlatformList, normalizeGameTitle, parseEtaHours } from "./utils";

describe("core/utils", () => {
  describe("normalizeGameTitle", () => {
    it("trims and lowercases title", () => {
      expect(normalizeGameTitle("  The Witcher 3  ")).toBe("the witcher 3");
    });

    it("handles empty strings", () => {
      expect(normalizeGameTitle("")).toBe("");
    });

    it("handles special characters", () => {
      expect(normalizeGameTitle("  Nier: Automata™  ")).toBe("nier: automata™");
    });
  });

  describe("mergePlatformList", () => {
    it("merges platforms without duplicates", () => {
      expect(mergePlatformList("PC, PS5", "PC, Xbox")).toBe("PC, PS5, Xbox");
    });

    it("handles undefined current", () => {
      expect(mergePlatformList(undefined, "PC")).toBe("PC");
    });

    it("handles empty strings", () => {
      expect(mergePlatformList("", "")).toBe("");
    });

    it("trims whitespace around platforms", () => {
      expect(mergePlatformList("  PC  ", "  PS5  ")).toBe("PC, PS5");
    });
  });

  describe("parseEtaHours", () => {
    it("parses simple hours", () => {
      expect(parseEtaHours("12h")).toBe(12);
    });

    it("parses decimal hours", () => {
      expect(parseEtaHours("12.5h")).toBe(12.5);
    });

    it("returns Infinity for missing data", () => {
      expect(parseEtaHours("Sem dado")).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns Infinity for Infinito", () => {
      expect(parseEtaHours("Infinito")).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns Infinity for empty string", () => {
      expect(parseEtaHours("")).toBe(Number.POSITIVE_INFINITY);
    });

    it("handles comma decimal separator", () => {
      expect(parseEtaHours("12,5h")).toBe(12.5);
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

    it("handles zero", () => {
      expect(formatDuration(0)).toBe("0m");
    });

    it("clamps negative to zero", () => {
      expect(formatDuration(-30)).toBe("0m");
    });

    it("rounds fractional minutes", () => {
      expect(formatDuration(45.7)).toBe("46m");
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
      expect(formatRemainingEta("12h", 100, 12)).toBe("Concluído");
    });

    it("handles missing eta", () => {
      expect(formatRemainingEta("Sem dado", 20, 1)).toBe("Sem ETA");
    });

    it("handles progress over 100 as completed", () => {
      expect(formatRemainingEta("10h", 150, 10)).toBe("Concluído");
    });

    it("uses singular 'restante' for 1 hour", () => {
      expect(formatRemainingEta("2h", 50, 0)).toBe("1h restante");
    });

    it("shows <1h for very small remaining time", () => {
      expect(formatRemainingEta("1h", 90, 0)).toBe("<1h restante");
    });
  });

  describe("cx", () => {
    it("joins truthy class names", () => {
      expect(cx("a", "b", "c")).toBe("a b c");
    });

    it("filters out falsy values", () => {
      expect(cx("a", false, null, undefined, "b")).toBe("a b");
    });

    it("returns empty string for no truthy values", () => {
      expect(cx(false, null, undefined)).toBe("");
    });
  });
});
