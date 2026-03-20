import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImportPreviewEntry } from "../../../backlog/shared";
import { useImportExportState } from "./useImportExportState";

function createPreviewEntry(partial: Partial<ImportPreviewEntry>): ImportPreviewEntry {
  return {
    id: "entry-1",
    key: "game::pc",
    payload: {
      title: "Game",
      platform: "PC",
      platforms: ["PC"],
      sourceStore: "Steam",
      stores: ["Steam"],
      format: "digital",
      ownershipStatus: "owned",
      progressStatus: "not_started",
      playtimeMinutes: 0,
      completionPercent: 0,
      priority: "medium",
    },
    status: "review",
    action: "create",
    suggestedAction: "update",
    existingId: 10,
    existingTitle: "Game",
    duplicateCount: 0,
    matchCandidates: [
      {
        entryId: 10,
        title: "Game",
        platform: "PC",
        sourceStore: "Steam",
        overlapPlatforms: ["PC"],
        overlapStores: ["Steam"],
        maintenanceSignals: ["Merge assistido disponível com boa confiança."],
        score: 84,
        confidence: "assisted",
      },
    ],
    selectedMatchId: null,
    gameCandidates: [],
    selectedGameId: null,
    rawgCandidates: [],
    selectedRawgId: null,
    enrichmentStatus: "idle",
    confidenceScore: 84,
    overlapPlatforms: ["PC"],
    overlapStores: ["Steam"],
    maintenanceSignals: ["Merge assistido disponível com boa confiança."],
    reviewReasons: ["Há entradas parecidas na biblioteca que podem ser atualizadas."],
    ...partial,
  };
}

describe("useImportExportState", () => {
  it("applies suggested actions and bulk-safe merges", () => {
    const { result } = renderHook(() => useImportExportState(vi.fn()));

    act(() => {
      result.current.setImportPreview([
        createPreviewEntry({ id: "safe-1" }),
        createPreviewEntry({
          id: "new-1",
          status: "new",
          action: "create",
          suggestedAction: "create",
          matchCandidates: [],
          selectedMatchId: null,
          confidenceScore: 20,
          maintenanceSignals: [],
        }),
      ]);
    });

    act(() => {
      result.current.handleImportPreviewApplySuggested();
    });

    expect(result.current.importPreview?.[0]?.action).toBe("update");
    expect(result.current.importPreview?.[0]?.selectedMatchId).toBe(10);

    act(() => {
      result.current.handleImportPreviewAutoMergeSafe();
    });

    expect(result.current.importPreview?.[0]?.action).toBe("update");
    expect(result.current.importPreviewSummary.assisted).toBe(1);
    expect(result.current.importPreviewSummary.maintenance).toBe(1);
  });

  it("ignores low-confidence review entries in bulk without touching confident ones", () => {
    const { result } = renderHook(() => useImportExportState(vi.fn()));

    act(() => {
      result.current.setImportPreview([
        createPreviewEntry({ id: "safe-1", action: "update", selectedMatchId: 10 }),
        createPreviewEntry({
          id: "unsafe-1",
          action: "create",
          suggestedAction: "create",
          matchCandidates: [],
          selectedMatchId: null,
          confidenceScore: 44,
          overlapPlatforms: [],
          overlapStores: [],
          maintenanceSignals: ["Título coincide, mas a plataforma local diverge."],
        }),
      ]);
    });

    act(() => {
      result.current.handleImportPreviewIgnoreUnsafe();
    });

    expect(result.current.importPreview?.[0]?.action).toBe("update");
    expect(result.current.importPreview?.[1]?.action).toBe("ignore");
    expect(result.current.importPreviewSummary.ignore).toBe(1);
    expect(result.current.importPreviewSummary.review).toBe(2);
  });
});
