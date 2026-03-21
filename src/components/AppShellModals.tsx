import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { useBacklogApp } from "../hooks/useBacklogApp";
import { useDocumentScrollLock } from "./cyberpunk-ui";

function lazyNamed<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => {
    const module = await loader();
    return {
      default: module[key] as ComponentType<Record<string, unknown>>,
    };
  });
}

const GameModal = lazyNamed(() => import("./backlog-modals"), "GameModal");
const BatchEditModal = lazyNamed(() => import("./backlog-modals"), "BatchEditModal");
const GoalModal = lazyNamed(() => import("./backlog-modals"), "GoalModal");
const ImportModal = lazyNamed(() => import("./backlog-modals"), "ImportModal");
const RestoreModal = lazyNamed(() => import("./backlog-modals"), "RestoreModal");
const SessionModal = lazyNamed(() => import("./backlog-modals"), "SessionModal");

type BacklogAppState = ReturnType<typeof useBacklogApp>;

type ModalEntry = {
  key: string;
  open: boolean;
  message: string;
  node: ReactNode;
};

function ModalFallback({ message = "Carregando interface..." }: { message?: string }) {
  useDocumentScrollLock(true);

  return (
    <div className="modal-backdrop modal-backdrop--loading" role="dialog" aria-modal="true" aria-live="polite">
      <div className="modal-shell">
        <div className="loading-shell loading-shell--modal">
          <span className="loading-shell__pulse" aria-hidden="true" />
          <strong>{message}</strong>
          <p>Preparando controles e conteúdo.</p>
        </div>
      </div>
    </div>
  );
}

export function AppShellModals({ app }: { app: BacklogAppState }) {
  const modalEntries = useMemo<ModalEntry[]>(() => {
    const storeRows = app.storeRows ?? [];
    const platformRows = app.platforms ?? [];
    const tagRows = app.tagRows ?? [];
    const listRows = app.listRows ?? [];
    const selectedBatchGames = app.selectedBatchGames ?? [];
    const gameRows = app.games ?? [];

    return [
      {
        key: "game",
        open: Boolean(app.gameModalMode),
        message: "Carregando modal do jogo...",
        node: (
          <GameModal
            mode={app.gameModalMode}
            form={app.gameForm}
            availableStores={storeRows.map((store) => store.name)}
            availablePlatforms={platformRows.map((platform) => platform.name)}
            rawgApiKey={app.preferences.rawgApiKey}
            submitting={app.submitting}
            onClose={app.closeGameModal}
            onChange={app.handleGameFormChange}
            onSubmit={app.handleGameSubmit}
          />
        ),
      },
      {
        key: "batch-edit",
        open: app.batchEditModalOpen,
        message: "Carregando edição em lote...",
        node: (
          <BatchEditModal
            open={app.batchEditModalOpen}
            form={app.batchEditForm}
            selectedGames={selectedBatchGames}
            availableStores={storeRows.map((store) => store.name)}
            availablePlatforms={platformRows.map((platform) => platform.name)}
            availableTags={tagRows.map((tag) => tag.name)}
            availableLists={listRows
              .filter((list) => list.id != null)
              .map((list) => ({ id: list.id as number, name: list.name }))}
            submitting={app.submitting}
            onClose={app.closeBatchEditModal}
            onChange={app.handleBatchEditFormChange}
            onSubmit={app.handleBatchEditSubmit}
          />
        ),
      },
      {
        key: "session",
        open: app.sessionModalOpen,
        message: "Carregando modal de sessão...",
        node: (
          <SessionModal
            open={app.sessionModalOpen}
            mode={app.sessionEditId != null ? "edit" : "create"}
            form={app.sessionForm}
            libraryGames={gameRows}
            submitting={app.submitting}
            onClose={app.closeSessionModal}
            onChange={app.handleSessionFormChange}
            onSubmit={app.handleSessionSubmit}
          />
        ),
      },
      {
        key: "goal",
        open: Boolean(app.goalModalMode),
        message: "Carregando modal de meta...",
        node: (
          <GoalModal
            mode={app.goalModalMode}
            form={app.goalForm}
            submitting={app.submitting}
            onClose={app.closeGoalModal}
            onChange={app.handleGoalFormChange}
            onSubmit={app.handleGoalSubmit}
          />
        ),
      },
      {
        key: "import",
        open: app.importModalOpen,
        message: "Carregando fluxo de importação...",
        node: (
          <ImportModal
            open={app.importModalOpen}
            source={app.importSource}
            text={app.importText}
            fileName={app.importFileName}
            preview={app.importPreview}
            summary={app.importPreviewSummary}
            fileInputRef={app.importFileInputRef}
            submitting={app.submitting}
            onClose={app.closeImportFlow}
            onSourceChange={app.handleImportSourceChange}
            onTextChange={app.handleImportTextChange}
            onFileChange={app.handleImportFileChange}
            onActionChange={app.handleImportPreviewActionChange}
            onMatchChange={app.handleImportPreviewMatchChange}
            onGameChange={app.handleImportPreviewGameChange}
            onRawgChange={app.handleImportPreviewRawgChange}
            onApplySuggested={app.handleImportPreviewApplySuggested}
            onAutoMergeSafe={app.handleImportPreviewAutoMergeSafe}
            onIgnoreUnsafe={app.handleImportPreviewIgnoreUnsafe}
            onSubmit={app.handleImportSubmit}
          />
        ),
      },
      {
        key: "restore",
        open: app.restoreModalOpen,
        message: "Carregando fluxo de restauração...",
        node: (
          <RestoreModal
            open={app.restoreModalOpen}
            mode={app.restoreMode}
            text={app.restoreText}
            fileName={app.restoreFileName}
            preview={app.restorePreview}
            totals={app.restorePreviewTotals}
            fileInputRef={app.restoreFileInputRef}
            submitting={app.submitting}
            onClose={app.closeRestoreFlow}
            onModeChange={app.handleRestoreModeChange}
            onTextChange={app.handleRestoreTextChange}
            onFileChange={app.handleRestoreFileChange}
            onSubmit={app.handleRestoreSubmit}
          />
        ),
      },
    ];
  }, [app]);
  const previousOpenRef = useRef<Record<string, boolean>>({});
  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);

  useEffect(() => {
    const openState = Object.fromEntries(modalEntries.map((entry) => [entry.key, entry.open]));
    const newlyOpened = modalEntries.find((entry) => entry.open && !previousOpenRef.current[entry.key]);

    if (newlyOpened) {
      setActiveModalKey(newlyOpened.key);
    } else if (!activeModalKey || !openState[activeModalKey]) {
      setActiveModalKey(modalEntries.find((entry) => entry.open)?.key ?? null);
    }

    previousOpenRef.current = openState;
  }, [activeModalKey, modalEntries]);

  const activeEntry =
    modalEntries.find((entry) => entry.key === activeModalKey && entry.open) ??
    modalEntries.find((entry) => entry.open);

  if (!activeEntry) return null;

  return <Suspense fallback={<ModalFallback message={activeEntry.message} />}>{activeEntry.node}</Suspense>;
}
