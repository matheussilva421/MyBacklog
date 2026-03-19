import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ProfileScreen } from "./ProfileScreen";

describe("ProfileScreen", () => {
  it("renders catalog audit summary and issues", () => {
    render(
      <ProfileScreen
        personalBadges={[]}
        totalGames={12}
        totalHours={160}
        preferences={{
          operatorName: "Matheus",
          primaryPlatforms: ["PC"],
          defaultStores: ["Steam"],
          rawgApiKey: "",
          plannerPreference: "balanced",
          onboardingCompleted: true,
        }}
        listRows={[]}
        catalogAuditReport={{
          summary: {
            totalIssues: 3,
            repairableIssues: 2,
            metadataIssues: 1,
            orphanSessions: 1,
            playtimeIssues: 1,
            progressIssues: 1,
          },
          issues: [
            {
              id: "issue-1",
              kind: "playtime_mismatch",
              title: "Horas divergentes em Cyberpunk 2077",
              description: "As sessões somam 135 min.",
              repairable: true,
              tone: "yellow",
            },
          ],
          repairPlan: { entryUpdates: [], orphanSessionIds: [] },
        }}
        onPreferencesSave={vi.fn()}
        onListCreate={vi.fn()}
        onListDelete={vi.fn()}
        onRepairCatalog={vi.fn()}
      />,
    );

    expect(screen.getByText("Auditoria do catálogo")).toBeInTheDocument();
    expect(screen.getByText("Horas divergentes em Cyberpunk 2077")).toBeInTheDocument();
  });

  it("calls repair action from the audit panel", () => {
    const onRepairCatalog = vi.fn();

    render(
      <ProfileScreen
        personalBadges={[]}
        totalGames={12}
        totalHours={160}
        preferences={{
          operatorName: "Matheus",
          primaryPlatforms: ["PC"],
          defaultStores: ["Steam"],
          rawgApiKey: "",
          plannerPreference: "balanced",
          onboardingCompleted: true,
        }}
        listRows={[]}
        catalogAuditReport={{
          summary: {
            totalIssues: 1,
            repairableIssues: 1,
            metadataIssues: 0,
            orphanSessions: 0,
            playtimeIssues: 0,
            progressIssues: 1,
          },
          issues: [],
          repairPlan: { entryUpdates: [{ libraryEntryId: 7, updates: {} }], orphanSessionIds: [] },
        }}
        onPreferencesSave={vi.fn()}
        onListCreate={vi.fn()}
        onListDelete={vi.fn()}
        onRepairCatalog={onRepairCatalog}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /reparar catálogo/i }));

    expect(onRepairCatalog).toHaveBeenCalled();
  });
});
