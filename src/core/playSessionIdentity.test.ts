import { describe, expect, it } from "vitest";
import { buildPlaySessionDedupKey } from "./playSessionIdentity";

describe("buildPlaySessionDedupKey", () => {
  it("diferencia sessoes identicas em plataformas diferentes", () => {
    const pcKey = buildPlaySessionDedupKey(1, {
      date: "2026-03-18",
      platform: "PC",
      durationMinutes: 90,
      note: "Boss fight",
      completionPercent: 62,
    });
    const deckKey = buildPlaySessionDedupKey(1, {
      date: "2026-03-18",
      platform: "Steam Deck",
      durationMinutes: 90,
      note: "Boss fight",
      completionPercent: 62,
    });

    expect(pcKey).not.toBe(deckKey);
  });

  it("normaliza plataforma e nota antes de montar a chave", () => {
    const first = buildPlaySessionDedupKey(1, {
      date: "2026-03-18",
      platform: " PC ",
      durationMinutes: 90,
      note: " Boss Fight ",
      completionPercent: 62,
    });
    const second = buildPlaySessionDedupKey(1, {
      date: "2026-03-18",
      platform: "pc",
      durationMinutes: 90,
      note: "boss fight",
      completionPercent: 62,
    });

    expect(first).toBe(second);
  });
});
