import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CatalogMaintenanceScreen } from "./CatalogMaintenanceScreen";

describe("CatalogMaintenanceScreen", () => {
  it("renders maintenance sections and triggers merge/enrichment actions", () => {
    const onRepairStructural = vi.fn();
    const onMergeDuplicateGroup = vi.fn();
    const onEnrichMetadata = vi.fn();
    const onEnrichMetadataQueue = vi.fn();
    const onOpenGamePage = vi.fn();
    const onOpenEditGame = vi.fn();

    render(
      <CatalogMaintenanceScreen
        hasRawgApiKey
        report={{
          summary: {
            totalIssues: 5,
            structuralIssues: 2,
            repairableStructuralIssues: 2,
            duplicateGroups: 1,
            duplicateEntries: 2,
            metadataQueue: 1,
            orphanSessions: 1,
          },
          audit: {
            summary: {
              totalIssues: 2,
              repairableIssues: 2,
              metadataIssues: 1,
              orphanSessions: 1,
              playtimeIssues: 1,
              progressIssues: 1,
            },
            issues: [
              {
                id: "status-7",
                kind: "progress_status_mismatch",
                title: "Status inconsistente",
                description: "O item está como pausado, mas o consolidado é jogando.",
                repairable: true,
                tone: "magenta",
                libraryEntryId: 7,
              },
            ],
            repairPlan: {
              entryUpdates: [{ libraryEntryId: 7, updates: { progressStatus: "playing" } }],
              orphanSessionIds: [99],
            },
          },
          duplicateGroups: [
            {
              id: "duplicate-cp2077",
              key: "cyberpunk-2077::pc",
              title: "Cyberpunk 2077",
              platform: "PC",
              releaseYear: 2020,
              reasons: ["Título normalizado e plataforma coincidem."],
              suggestedAction: "merge",
              suggestedPrimaryEntryId: 7,
              mergeableEntryIds: [8],
              candidates: [
                {
                  libraryEntryId: 7,
                  gameId: 1,
                  title: "Cyberpunk 2077",
                  platform: "PC",
                  sourceStore: "Steam",
                  completionPercent: 62,
                  playtimeMinutes: 2880,
                  progressStatus: "playing",
                  favorite: true,
                  updatedAt: "2026-03-19T00:00:00.000Z",
                  sessionCount: 6,
                  hasReview: true,
                  tagCount: 2,
                  listCount: 1,
                },
                {
                  libraryEntryId: 8,
                  gameId: 2,
                  title: "Cyberpunk 2077",
                  platform: "PC",
                  sourceStore: "GOG",
                  completionPercent: 20,
                  playtimeMinutes: 600,
                  progressStatus: "paused",
                  favorite: false,
                  updatedAt: "2026-03-18T00:00:00.000Z",
                  sessionCount: 2,
                  hasReview: false,
                  tagCount: 0,
                  listCount: 1,
                },
              ],
            },
          ],
          metadataQueue: [
            {
              id: "metadata-1",
              gameId: 1,
              title: "Cyberpunk 2077",
              representativeEntryId: 7,
              linkedEntries: 1,
              missingFields: ["capa", "gêneros"],
              platforms: ["PC"],
            },
          ],
        }}
        onRepairStructural={onRepairStructural}
        onMergeDuplicateGroup={onMergeDuplicateGroup}
        onEnrichMetadata={onEnrichMetadata}
        onEnrichMetadataQueue={onEnrichMetadataQueue}
        onOpenGamePage={onOpenGamePage}
        onOpenEditGame={onOpenEditGame}
      />,
    );

    expect(screen.getByText("Detecção de duplicados")).toBeInTheDocument();
    expect(screen.getByText("Fila de metadado faltante")).toBeInTheDocument();
    expect(screen.getByText("Integridade estrutural")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mesclar grupo" }));
    expect(onMergeDuplicateGroup).toHaveBeenCalledWith(7, [8]);

    fireEvent.click(screen.getByRole("button", { name: "Enriquecer via RAWG" }));
    expect(onEnrichMetadata).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Enriquecer confiáveis" }));
    expect(onEnrichMetadataQueue).toHaveBeenCalled();
  });
});
