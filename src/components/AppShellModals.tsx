import { Suspense, lazy, type ComponentType } from "react";
import type { useBacklogApp } from "../hooks/useBacklogApp";

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

export function AppShellModals({ app }: { app: BacklogAppState }) {
  return (
    <>
      {app.gameModalMode ? (
        <Suspense fallback={null}>
          <GameModal
            mode={app.gameModalMode}
            form={app.gameForm}
            availableStores={app.storeRows.map((store) => store.name)}
            availablePlatforms={app.platforms.map((platform) => platform.name)}
            rawgApiKey={app.preferences.rawgApiKey}
            submitting={app.submitting}
            onClose={app.closeGameModal}
            onChange={app.handleGameFormChange}
            onSubmit={app.handleGameSubmit}
          />
        </Suspense>
      ) : null}

      {app.batchEditModalOpen ? (
        <Suspense fallback={null}>
          <BatchEditModal
            open={app.batchEditModalOpen}
            form={app.batchEditForm}
            selectedGames={app.selectedBatchGames}
            availableStores={app.storeRows.map((store) => store.name)}
            availablePlatforms={app.platforms.map((platform) => platform.name)}
            availableTags={app.tagRows.map((tag) => tag.name)}
            availableLists={app.listRows
              .filter((list) => list.id != null)
              .map((list) => ({ id: list.id as number, name: list.name }))}
            submitting={app.submitting}
            onClose={app.closeBatchEditModal}
            onChange={app.handleBatchEditFormChange}
            onSubmit={app.handleBatchEditSubmit}
          />
        </Suspense>
      ) : null}

      {app.sessionModalOpen ? (
        <Suspense fallback={null}>
          <SessionModal
            open={app.sessionModalOpen}
            mode={app.sessionEditId != null ? "edit" : "create"}
            form={app.sessionForm}
            libraryGames={app.games}
            submitting={app.submitting}
            onClose={app.closeSessionModal}
            onChange={app.handleSessionFormChange}
            onSubmit={app.handleSessionSubmit}
          />
        </Suspense>
      ) : null}

      {app.goalModalMode ? (
        <Suspense fallback={null}>
          <GoalModal
            mode={app.goalModalMode}
            form={app.goalForm}
            submitting={app.submitting}
            onClose={app.closeGoalModal}
            onChange={app.handleGoalFormChange}
            onSubmit={app.handleGoalSubmit}
          />
        </Suspense>
      ) : null}

      {app.importModalOpen ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}

      {app.restoreModalOpen ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}
    </>
  );
}
