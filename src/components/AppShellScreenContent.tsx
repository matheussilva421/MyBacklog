import { Cpu } from "lucide-react";
import { Suspense, lazy, type ComponentType } from "react";
import type { SyncComparison } from "../modules/sync-center/utils/syncEngine";
import type { SyncHistoryEntry } from "../modules/sync-center/utils/syncStorage";
import type { useBacklogApp } from "../hooks/useBacklogApp";
import type { SyncMode } from "../hooks/useCloudSync";
import { NotchButton, Panel, SectionHeader } from "./cyberpunk-ui";

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

const DashboardScreen = lazyNamed(
  () => import("../modules/dashboard/components/DashboardScreen"),
  "DashboardScreen",
);
const LibraryScreen = lazyNamed(
  () => import("../modules/library/components/LibraryScreen"),
  "LibraryScreen",
);
const CatalogMaintenanceScreen = lazyNamed(
  () => import("../modules/catalog-maintenance/components/CatalogMaintenanceScreen"),
  "CatalogMaintenanceScreen",
);
const SyncCenterScreen = lazyNamed(
  () => import("../modules/sync-center/components/SyncCenterScreen"),
  "SyncCenterScreen",
);
const SessionsScreen = lazyNamed(
  () => import("../modules/sessions/components/SessionsScreen"),
  "SessionsScreen",
);
const PlannerScreen = lazyNamed(
  () => import("../modules/planner/components/PlannerScreen"),
  "PlannerScreen",
);
const StatsScreen = lazyNamed(
  () => import("../modules/stats/components/StatsScreen"),
  "StatsScreen",
);
const ProfileScreen = lazyNamed(
  () => import("../modules/settings/components/ProfileScreen"),
  "ProfileScreen",
);
const GamePageScreen = lazyNamed(
  () => import("../modules/game-page/components/GamePageScreen"),
  "GamePageScreen",
);

function ModuleFallback({ message = "Carregando módulo..." }: { message?: string }) {
  return (
    <div className="loading-shell loading-shell--inline" role="status" aria-live="polite">
      <span className="loading-shell__pulse" aria-hidden="true" />
      <strong>{message}</strong>
      <p>Preparando os dados visuais desta área do app.</p>
    </div>
  );
}

type BacklogAppState = ReturnType<typeof useBacklogApp>;

type AppShellScreenContentProps = {
  app: BacklogAppState;
  isAuthEnabled: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncMode: SyncMode;
  comparison: SyncComparison | null;
  cloudExportedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  syncHistory: SyncHistoryEntry[];
  pushLocalToCloud: () => Promise<void>;
  pullCloudToLocal: () => Promise<void>;
  mergeLocalAndCloud: () => Promise<void>;
  workLocal: () => Promise<void>;
  resetLocalAndCloud: () => Promise<void>;
};

export function AppShellScreenContent({
  app,
  isAuthEnabled,
  isOnline,
  isSyncing,
  syncMode,
  comparison,
  cloudExportedAt,
  lastSuccessfulSyncAt,
  syncHistory,
  pushLocalToCloud,
  pullCloudToLocal,
  mergeLocalAndCloud,
  workLocal,
  resetLocalAndCloud,
}: AppShellScreenContentProps) {
  let screenContent = null;

  if (app.screen === "dashboard") {
    screenContent = (
      <DashboardScreen
        stats={app.stats}
        monthlyProgress={app.monthlyProgress}
        platformData={app.platformData}
        storeData={app.storeData}
        continuePlayingGames={app.continuePlayingGames}
        visiblePlannerQueue={app.visiblePlannerQueue}
        personalBadges={app.personalBadges}
        monthlyRecap={app.monthlyRecap}
        findGame={app.findGame}
        onOpenLibrary={app.openLibraryGame}
        onOpenGamePage={app.openGamePage}
        onOpenPlanner={() => app.setScreen("planner")}
      />
    );
  } else if (app.screen === "library") {
    screenContent = (
      <LibraryScreen
        libraryGames={app.libraryGames}
        groupedLibraryGames={app.groupedLibraryGames}
        selectedGame={app.selectedGame}
        selectedLibraryIds={app.selectedLibraryIds}
        selectedGameLists={app.selectedGameLists}
        filter={app.filter}
        selectedListFilter={app.selectedListFilter}
        sortBy={app.librarySortBy}
        sortDirection={app.librarySortDirection}
        groupBy={app.libraryGroupBy}
        listOptions={app.listOptions}
        savedViews={app.savedViewRows}
        activeSavedView={app.activeSavedView}
        onFilterChange={(value: typeof app.filter) => app.setFilter(value)}
        onListFilterChange={(value: typeof app.selectedListFilter) =>
          app.setSelectedListFilter(value)
        }
        onSortByChange={app.setLibrarySortBy}
        onSortDirectionChange={app.setLibrarySortDirection}
        onGroupByChange={app.setLibraryGroupBy}
        onSaveCurrentView={() => void app.handleSaveLibraryView()}
        onApplySavedView={app.handleApplySavedView}
        onDeleteSavedView={(viewId: number) => void app.handleDeleteSavedView(viewId)}
        onSelectGame={(gameId: number) => app.setSelectedGameId(gameId)}
        onToggleLibrarySelection={app.toggleLibrarySelection}
        onClearLibrarySelection={app.clearLibrarySelection}
        onSelectVisibleLibraryGames={app.selectVisibleLibraryGames}
        onExport={app.handleExport}
        onBackupExport={app.handleBackupExport}
        onOpenRestore={app.openRestoreFlow}
        onOpenCreate={app.openCreateGameModal}
        onOpenBatchEdit={app.openBatchEditModal}
        onOpenEdit={app.openEditGameModal}
        onDeleteSelected={app.handleDeleteSelectedGame}
        onResumeSelected={app.handleResumeSelectedGame}
        onFavoriteSelected={app.handleFavoriteSelectedGame}
        onOpenSession={app.openSessionModal}
        onOpenGamePage={app.openGamePage}
        onSendSelectedToPlanner={app.handleSendSelectedToPlanner}
      />
    );
  } else if (app.screen === "maintenance") {
    screenContent = (
      <CatalogMaintenanceScreen
        report={app.catalogMaintenanceReport}
        hasRawgApiKey={Boolean(app.preferences.rawgApiKey.trim())}
        onRepairStructural={app.handleCatalogRepair}
        onMergeDuplicateGroup={app.handleCatalogDuplicateMerge}
        onNormalizeEntry={app.handleCatalogNormalizeEntry}
        onNormalizeQueue={app.handleCatalogNormalizeQueue}
        onConsolidateAliasGroup={app.handleCatalogConsolidateAliasGroup}
        onEnrichMetadata={app.handleCatalogMetadataEnrich}
        onEnrichMetadataQueue={app.handleCatalogMetadataEnrichQueue}
        onOpenGamePage={app.openGamePage}
        onOpenEditGame={app.openEditGameModalFor}
      />
    );
  } else if (app.screen === "sync") {
    screenContent = (
      <SyncCenterScreen
        isAuthEnabled={isAuthEnabled}
        isOnline={isOnline}
        isSyncing={isSyncing}
        syncMode={syncMode}
        autoSyncEnabled={app.preferences.autoSyncEnabled}
        comparison={comparison}
        syncHistory={syncHistory}
        lastSuccessfulSyncAt={lastSuccessfulSyncAt}
        cloudExportedAt={cloudExportedAt}
        onPushLocal={pushLocalToCloud}
        onPullCloud={pullCloudToLocal}
        onMerge={mergeLocalAndCloud}
        onWorkLocal={workLocal}
        onResetEverywhere={resetLocalAndCloud}
        onOpenSettings={() => app.setScreen("profile")}
      />
    );
  } else if (app.screen === "planner") {
    screenContent = (
      <PlannerScreen
        visiblePlannerQueue={app.visiblePlannerQueue}
        goalProgress={app.goalProgress}
        goalRows={app.goalRows}
        systemRules={app.systemRules}
        findGame={app.findGame}
        onOpenGamePage={app.openGamePage}
        onCreateGoal={app.openCreateGoalModal}
        onEditGoal={app.openEditGoalModal}
        onDeleteGoal={app.handleGoalDelete}
      />
    );
  } else if (app.screen === "sessions") {
    screenContent = (
      <SessionsScreen
        games={app.games}
        sessions={app.sessionRows}
        query={app.deferredQuery}
        onQuickRegister={app.handleQuickSessionCreate}
        onEditSession={app.openEditSessionModal}
        onDeleteSession={app.handleSessionDelete}
        onOpenGamePage={app.openGamePage}
      />
    );
  } else if (app.screen === "stats") {
    screenContent = (
      <StatsScreen
        durationBuckets={app.durationBuckets}
        monthlyHours={app.monthlyHours}
        platformData={app.platformData}
        storeData={app.storeData}
        platforms={app.platforms}
        importJobs={app.importJobRows}
        visibleSessions={app.visibleSessions}
        games={app.games}
        findGame={app.findGame}
        onEditSession={app.openEditSessionModal}
        onDeleteSession={app.handleSessionDelete}
        onClearImportHistory={app.handleClearImportHistory}
        onManagePlatforms={() => app.setScreen("profile")}
      />
    );
  } else if (app.screen === "profile") {
    screenContent = (
      <ProfileScreen
        personalBadges={app.personalBadges}
        totalGames={app.stats.total}
        totalHours={app.stats.hours}
        preferences={app.preferences}
        listRows={app.listRows}
        catalogAuditReport={app.catalogAuditReport}
        onPreferencesSave={app.handlePreferencesSave}
        onListCreate={app.handleListCreate}
        onListDelete={app.handleListDelete}
        onRepairCatalog={app.handleCatalogRepair}
        onOpenMaintenance={() => app.setScreen("maintenance")}
        onOpenGuidedTour={() => app.openGuidedTour("profile")}
      />
    );
  } else if (app.screen === "game") {
    screenContent = app.selectedGamePage ? (
      <GamePageScreen
        key={[
          app.selectedGamePage.game.id,
          app.selectedGamePage.review?.score ?? "",
          app.selectedGamePage.review?.shortReview ?? "",
          app.selectedGamePage.review?.longReview ?? "",
          app.selectedGamePage.tags.map((tag) => tag.id).join(","),
          app.selectedGamePage.lists.map((list) => list.id).join(","),
          app.selectedGamePage.sessions.length,
        ].join("|")}
        data={app.selectedGamePage}
        availableLists={app.listOptions.map((list) => ({ id: list.id, name: list.name }))}
        onBack={() => app.openLibraryGame(app.selectedGamePage?.game.id)}
        onOpenEdit={app.openEditGameModal}
        onOpenSession={app.openSessionModal}
        onEditSession={app.openEditSessionModal}
        onDeleteSession={app.handleSessionDelete}
        onToggleFavorite={app.handleFavoriteSelectedGame}
        onSendToPlanner={app.handleSendSelectedToPlanner}
        onDelete={app.handleDeleteSelectedGame}
        onSaveReview={app.handleGameReviewSave}
        onSaveTags={app.handleGameTagsSave}
        onSaveLists={app.handleGameListsSave}
      />
    ) : (
      <Panel>
        <SectionHeader
          icon={Cpu}
          title="Página do jogo"
          description="Selecione um item da biblioteca, dashboard ou planner para abrir a ficha dedicada."
          action={
            <NotchButton variant="secondary" onClick={() => app.openLibraryGame()}>
              Catálogo
            </NotchButton>
          }
        />
      </Panel>
    );
  }

  return <Suspense fallback={<ModuleFallback />}>{screenContent}</Suspense>;
}
