import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PendingMutationsPanel } from "./PendingMutationsPanel";
import * as usePendingMutationsStateModule from "../hooks/usePendingMutationsState";

vi.mock("../hooks/usePendingMutationsState", () => ({
  usePendingMutationsState: vi.fn(),
}));

describe("PendingMutationsPanel", () => {
  it("deve mostrar estado vazio quando não há mutações", () => {
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [],
      permanentFailures: [],
      temporaryFailures: [],
      isLoading: false,
      stats: { total: 0, permanent: 0, temporary: 0 },
      retry: vi.fn(),
      retryAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
      discardAll: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    expect(screen.getByText("Mutações sincronizadas")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma mutação pendente.")).toBeInTheDocument();
  });

  it("deve mostrar falhas permanentes", () => {
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [],
      permanentFailures: [
        {
          id: 1,
          uuid: "test-uuid",
          entityType: "game",
          mutationType: "create",
          payload: "{}",
          createdAt: "2026-03-21",
          retryCount: 5,
        },
      ],
      temporaryFailures: [],
      isLoading: false,
      stats: { total: 1, permanent: 1, temporary: 0 },
      retry: vi.fn(),
      retryAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
      discardAll: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    expect(screen.getByText("Falhas permanentes (1)")).toBeInTheDocument();
    expect(screen.getByText("Jogo")).toBeInTheDocument();
    expect(screen.getByText("Falha permanente")).toBeInTheDocument();
  });

  it("deve mostrar falhas temporárias", () => {
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [],
      permanentFailures: [],
      temporaryFailures: [
        {
          id: 2,
          uuid: "test-uuid-2",
          entityType: "review",
          mutationType: "update",
          payload: "{}",
          createdAt: "2026-03-20",
          retryCount: 2,
        },
      ],
      isLoading: false,
      stats: { total: 0, permanent: 0, temporary: 1 },
      retry: vi.fn(),
      retryAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
      discardAll: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    expect(screen.getByText("Em retry (1)")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Tentando...")).toBeInTheDocument();
  });

  it("deve mostrar mutações pendentes sem falha", () => {
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [
        {
          id: 3,
          uuid: "test-uuid-3",
          entityType: "libraryEntry",
          mutationType: "create",
          payload: "{}",
          createdAt: "2026-03-21",
          retryCount: 0,
        },
      ],
      permanentFailures: [],
      temporaryFailures: [],
      isLoading: false,
      stats: { total: 1, permanent: 0, temporary: 0 },
      retry: vi.fn(),
      retryAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
      discardAll: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    expect(screen.getByText("Aguardando sync (1)")).toBeInTheDocument();
    expect(screen.getByText("Entrada da biblioteca")).toBeInTheDocument();
  });

  it("deve abrir modal de confirmação ao clicar em Retentar todas", async () => {
    const mockRetryAll = vi.fn();
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [],
      permanentFailures: [
        { id: 1, uuid: "uuid-1", entityType: "game", mutationType: "create", payload: "{}", createdAt: "2026-03-21", retryCount: 5 },
        { id: 2, uuid: "uuid-2", entityType: "review", mutationType: "update", payload: "{}", createdAt: "2026-03-20", retryCount: 5 },
      ],
      temporaryFailures: [],
      isLoading: false,
      stats: { total: 2, permanent: 2, temporary: 0 },
      retry: vi.fn(),
      retryAll: mockRetryAll,
      delete: vi.fn(),
      deleteAll: vi.fn(),
      discardAll: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    const retryAllButton = screen.getByText("Retentar todas");
    fireEvent.click(retryAllButton);

    expect(screen.getByText("Retentar todas as falhas permanentes?")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("resetar o contador de retry"))).toBeInTheDocument();

    const confirmButton = screen.getByText("Confirmar retry");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockRetryAll).toHaveBeenCalledTimes(1);
    });
  });

  it("deve abrir modal de confirmação ao clicar em Descartar todas", async () => {
    const mockDeleteAll = vi.fn();
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [],
      permanentFailures: [
        { id: 1, uuid: "uuid-1", entityType: "game", mutationType: "create", payload: "{}", createdAt: "2026-03-21", retryCount: 5 },
      ],
      temporaryFailures: [],
      isLoading: false,
      stats: { total: 1, permanent: 1, temporary: 0 },
      retry: vi.fn(),
      retryAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: mockDeleteAll,
      discardAll: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    const deleteAllButton = screen.getByText("Descartar todas");
    fireEvent.click(deleteAllButton);

    expect(screen.getByText("Descartar todas as falhas permanentes?")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("remover permanentemente"))).toBeInTheDocument();

    const confirmButton = screen.getByText("Confirmar descarte");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteAll).toHaveBeenCalledTimes(1);
    });
  });

  it("deve chamar discardAll ao confirmar descarte de pendentes", async () => {
    const mockDiscardAll = vi.fn();
    vi.mocked(usePendingMutationsStateModule.usePendingMutationsState).mockReturnValue({
      pending: [
        { id: 1, uuid: "uuid-1", entityType: "game", mutationType: "create", payload: "{}", createdAt: "2026-03-21", retryCount: 0 },
      ],
      permanentFailures: [],
      temporaryFailures: [],
      isLoading: false,
      stats: { total: 1, permanent: 0, temporary: 0 },
      retry: vi.fn(),
      retryAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
      discardAll: mockDiscardAll,
      refresh: vi.fn(),
    });

    render(<PendingMutationsPanel />);

    const discardButton = screen.getByText("Descartar pendentes");
    fireEvent.click(discardButton);

    const confirmButton = screen.getByText("Descartar");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDiscardAll).toHaveBeenCalledTimes(1);
    });
  });
});
