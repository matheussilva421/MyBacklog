import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SyncCenterScreen } from "./SyncCenterScreen";

function createComparison() {
  return {
    decision: "conflict" as const,
    localFingerprint: "local",
    cloudFingerprint: "cloud",
    hasCloudSnapshot: true,
    cloudExportedAt: "2026-03-19T10:00:00.000Z",
    blocks: [
      {
        key: "games" as const,
        label: "Jogos",
        localCount: 5,
        cloudCount: 4,
        state: "different" as const,
      },
      {
        key: "reviews" as const,
        label: "Reviews",
        localCount: 2,
        cloudCount: 0,
        state: "local-only" as const,
      },
      {
        key: "playSessions" as const,
        label: "Sessões",
        localCount: 12,
        cloudCount: 12,
        state: "same" as const,
      },
    ],
  };
}

function renderScreen() {
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
      comparison={createComparison()}
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

  return {
    onPushLocal,
    onPullCloud,
    onMerge,
    onWorkLocal,
    onOpenSettings,
  };
}

describe("SyncCenterScreen", () => {
  it("renders conflict summary and only shows divergent blocks in comparison mode", () => {
    renderScreen();

    expect(screen.getByText("Central de Sincronização")).toBeInTheDocument();
    expect(screen.getByText("Conflito detectado")).toBeInTheDocument();
    expect(screen.getByText("Resolução manual obrigatória")).toBeInTheDocument();
    expect(screen.getByText("2 blocos em conflito")).toBeInTheDocument();
    expect(screen.getAllByText("Jogos")).toHaveLength(2);
    expect(screen.getAllByText("Reviews")).toHaveLength(2);
    expect(screen.queryByText("Sessões")).not.toBeInTheDocument();
    expect(screen.getByText("Conflito detectado entre local e nuvem.")).toBeInTheDocument();
  });

  it("requires confirmation before sending local data, pulling cloud data, or merging", async () => {
    const { onPushLocal, onPullCloud, onMerge } = renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /manter local e enviar/i }));
    expect(onPushLocal).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Confirmar envio da base local")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar envio local/i }));
    await waitFor(() => {
      expect(onPushLocal).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Confirmar envio da base local")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /descartar local e puxar nuvem/i }));
    expect(onPullCloud).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Confirmar aplicação da nuvem")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar puxar nuvem/i }));
    await waitFor(() => {
      expect(onPullCloud).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Confirmar aplicação da nuvem")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /mesclar snapshots/i }));
    expect(onMerge).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Confirmar merge dos snapshots")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar merge/i }));
    await waitFor(() => {
      expect(onMerge).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Confirmar merge dos snapshots")).not.toBeInTheDocument();
    });
  }, 15000);

  it("keeps the local-only action immediate and preserves settings access", () => {
    const { onWorkLocal, onOpenSettings } = renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /continuar só local/i }));
    fireEvent.click(screen.getByRole("button", { name: /abrir configurações/i }));

    expect(onWorkLocal).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
