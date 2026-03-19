import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SyncCenterScreen } from "./SyncCenterScreen";

describe("SyncCenterScreen", () => {
  it("renders sync status, block comparison and manual actions", () => {
    const onPushLocal = vi.fn();
    const onPullCloud = vi.fn();
    const onMerge = vi.fn();
    const onWorkLocal = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <SyncCenterScreen
        isAuthEnabled
        isOnline
        isSyncing={false}
        syncMode="conflict"
        autoSyncEnabled={false}
        comparison={{
          decision: "conflict",
          localFingerprint: "local",
          cloudFingerprint: "cloud",
          localExportedAt: null,
          cloudExportedAt: "2026-03-19T10:00:00.000Z",
          blocks: [
            {
              key: "games",
              label: "Jogos",
              localCount: 5,
              cloudCount: 4,
              state: "different",
            },
            {
              key: "playSessions",
              label: "Sessões",
              localCount: 12,
              cloudCount: 12,
              state: "same",
            },
          ],
        }}
        syncHistory={[
          {
            id: "entry-1",
            timestamp: "2026-03-19T11:00:00.000Z",
            action: "conflict",
            result: "conflict",
            message: "Conflito detectado entre local e nuvem.",
          },
        ]}
        lastSuccessfulSyncAt="2026-03-19T09:00:00.000Z"
        cloudExportedAt="2026-03-19T10:00:00.000Z"
        onPushLocal={onPushLocal}
        onPullCloud={onPullCloud}
        onMerge={onMerge}
        onWorkLocal={onWorkLocal}
        onOpenSettings={onOpenSettings}
      />,
    );

    expect(screen.getByText("Central de Sincronização")).toBeInTheDocument();
    expect(screen.getByText("Conflito detectado")).toBeInTheDocument();
    expect(screen.getByText("Jogos")).toBeInTheDocument();
    expect(screen.getByText("Sessões")).toBeInTheDocument();
    expect(screen.getByText("Conflito detectado entre local e nuvem.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enviar local/i }));
    fireEvent.click(screen.getByRole("button", { name: /puxar nuvem/i }));
    fireEvent.click(screen.getByRole("button", { name: /mesclar/i }));
    fireEvent.click(screen.getByRole("button", { name: /trabalhar local/i }));
    fireEvent.click(screen.getByRole("button", { name: /abrir configurações/i }));

    expect(onPushLocal).toHaveBeenCalledTimes(1);
    expect(onPullCloud).toHaveBeenCalledTimes(1);
    expect(onMerge).toHaveBeenCalledTimes(1);
    expect(onWorkLocal).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
