import { Cpu } from "lucide-react";
import { Suspense, lazy, type ComponentType } from "react";
import type { SyncComparison } from "../modules/sync-center/utils/syncEngine";
import type { SyncHistoryEntry } from "../modules/sync-center/utils/syncStorage";
import type { useBacklogApp } from "../hooks/useBacklogApp";
import type { SyncMode } from "../hooks/useCloudSync";
import type { PlaySession, Tag, List } from "../core/types";
import { NotchButton, Panel, SectionHeader } from "./cyberpunk-ui";

// Hooks imports - necessários para wrappers
import { usePlannerInsights } from "../modules/planner/hooks/usePlannerInsights";
import { useDashboardInsights } from "../modules/dashboard/hooks/useDashboardInsights";
import { useLibraryState } from "../modules/library/hooks/useLibraryState";
import { useSelectedGamePage } from "../modules/game-page/hooks/useSelectedGamePage";
import { useBuildSessionInsights } from "../modules/sessions/hooks/useBuildSessionInsights";

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
      <DashboardScreenWithHooks app={app} />
    );
  } else if (app.screen === "library") {
    screenContent = (
      <LibraryScreenWithHooks app={app} />
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
      <PlannerScreenWithHooks app={app} />
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
      <StatsScreenWithHooks app={app} />
    );
  } else if (app.screen === "profile") {
    screenContent = (
      <ProfileScreenWithHooks app={app} />
    );
  } else if (app.screen === "game") {
    screenContent = (
      <GamePageScreenWithHooks
        app={app}
        openLibraryGame={app.openLibraryGame}
        openEditGameModal={app.openEditGameModal}
        openSessionModal={app.openSessionModal}
        openEditSessionModal={app.openEditSessionModal}
        handleSessionDelete={app.handleSessionDelete}
        handleFavoriteSelectedGame={app.handleFavoriteSelectedGame}
        handleSendSelectedToPlanner={app.handleSendSelectedToPlanner}
        handleDeleteSelectedGame={app.handleDeleteSelectedGame}
        handleGameReviewSave={app.handleGameReviewSave}
        handleGameTagsSave={app.handleGameTagsSave}
        handleGameListsSave={app.handleGameListsSave}
        listOptions={app.listOptions}
      />
    );
  }

  return <Suspense fallback={<ModuleFallback />}>{screenContent}</Suspense>;
}

// Componentes wrappers com hooks em ordem consistente
function DashboardScreenWithHooks({ app }: { app: BacklogAppState }) {
  const plannerInsights = usePlannerInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    goalRows: app.goalRows,
    fallbackGoalProgress: [],
    preferences: app.preferences,
    sessionCadenceMap: new Map(),
  });
  const dashboardInsights = useDashboardInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    plannerGoalSignals: plannerInsights.plannerGoalSignals,
    preferences: app.preferences,
    query: app.query,
  });

  return (
    <DashboardScreen
      stats={dashboardInsights.stats}
      monthlyProgress={dashboardInsights.monthlyProgress}
      platformData={dashboardInsights.platformData}
      storeData={dashboardInsights.storeData}
      continuePlayingGames={dashboardInsights.continuePlayingGames}
      visiblePlannerQueue={plannerInsights.computedPlannerQueue}
      personalBadges={dashboardInsights.personalBadges}
      monthlyRecap={dashboardInsights.monthlyRecap}
      findGame={app.findGame}
      onOpenLibrary={app.openLibraryGame}
      onOpenGamePage={app.openGamePage}
      onOpenPlanner={() => app.setScreen("planner")}
    />
  );
}

function LibraryScreenWithHooks({ app }: { app: BacklogAppState }) {
  const libraryState = useLibraryState({
    games: app.games,
    recordsByEntryId: app.recordsByEntryId,
    tagById: app.tagById,
    listById: app.listById,
    gameTagRows: app.gameTagRows,
    libraryEntryListRows: app.libraryEntryListRows,
    query: app.query,
    searchQuery: app.query,
    filter: app.filter,
    selectedListFilter: app.selectedListFilter,
    sortBy: app.librarySortBy,
    sortDirection: app.librarySortDirection,
    groupBy: app.libraryGroupBy,
    savedViews: app.savedViewRows,
    selectedGameId: app.selectedGameId,
  });

  return (
    <LibraryScreen
      libraryGames={libraryState.libraryGames}
      groupedLibraryGames={libraryState.groupedLibraryGames}
      selectedGame={libraryState.selectedGame}
      selectedLibraryIds={app.selectedLibraryIds}
      selectedGameLists={libraryState.selectedGameLists}
      filter={app.filter}
      selectedListFilter={app.selectedListFilter}
      sortBy={app.librarySortBy}
      sortDirection={app.librarySortDirection}
      groupBy={app.libraryGroupBy}
      listOptions={libraryState.listOptions}
      savedViews={app.savedViewRows}
      activeSavedView={libraryState.activeSavedView}
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
}

function PlannerScreenWithHooks({ app }: { app: BacklogAppState }) {
  const plannerInsights = usePlannerInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    goalRows: app.goalRows,
    fallbackGoalProgress: [],
    preferences: app.preferences,
    sessionCadenceMap: new Map(),
  });

  return (
    <PlannerScreen
      visiblePlannerQueue={plannerInsights.computedPlannerQueue}
      goalProgress={plannerInsights.goalProgress}
      goalRows={plannerInsights.resolvedGoalRows}
      systemRules={app.systemRules}
      findGame={app.findGame}
      onOpenGamePage={app.openGamePage}
      onCreateGoal={app.openCreateGoalModal}
      onEditGoal={app.openEditGoalModal}
      onDeleteGoal={app.handleGoalDelete}
    />
  );
}

function StatsScreenWithHooks({ app }: { app: BacklogAppState }) {
  const sessionInsights = useBuildSessionInsights({ sessionRows: app.sessionRows });
  const plannerInsights = usePlannerInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    goalRows: app.goalRows,
    fallbackGoalProgress: [],
    preferences: app.preferences,
    sessionCadenceMap: sessionInsights.sessionCadenceMap,
  });
  const dashboardInsights = useDashboardInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    plannerGoalSignals: plannerInsights.plannerGoalSignals,
    preferences: app.preferences,
    query: app.query,
  });

  return (
    <StatsScreen
      durationBuckets={dashboardInsights.durationBuckets}
      monthlyHours={dashboardInsights.monthlyProgress.map((mp: { month: string; started: number; finished: number }) => ({ month: mp.month, total: mp.started + mp.finished }))}
      platformData={dashboardInsights.platformData}
      storeData={dashboardInsights.storeData}
      platforms={app.platformRows}
      importJobs={app.importJobRows}
      visibleSessions={app.sessionRows}
      games={app.games}
      findGame={app.findGame}
      onEditSession={app.openEditSessionModal}
      onDeleteSession={app.handleSessionDelete}
      onClearImportHistory={app.handleClearImportHistory}
      onManagePlatforms={() => app.setScreen("profile")}
    />
  );
}

function ProfileScreenWithHooks({ app }: { app: BacklogAppState }) {
  const plannerInsights = usePlannerInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    goalRows: app.goalRows,
    fallbackGoalProgress: [],
    preferences: app.preferences,
    sessionCadenceMap: new Map(),
  });
  const dashboardInsights = useDashboardInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    plannerGoalSignals: plannerInsights.plannerGoalSignals,
    preferences: app.preferences,
    query: app.query,
  });

  return (
    <ProfileScreen
      personalBadges={dashboardInsights.personalBadges}
      totalGames={app.games.length}
      totalHours={Math.round(app.sessionRows.reduce((totalMinutes, session) => totalMinutes + session.durationMinutes, 0) / 60)}
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
}

function GamePageScreenWithHooks({
  app,
  openLibraryGame,
  openEditGameModal,
  openSessionModal,
  openEditSessionModal,
  handleSessionDelete,
  handleFavoriteSelectedGame,
  handleSendSelectedToPlanner,
  handleDeleteSelectedGame,
  handleGameReviewSave,
  handleGameTagsSave,
  handleGameListsSave,
  listOptions,
}: {
  app: BacklogAppState;
  openLibraryGame: (gameId?: number) => void;
  openEditGameModal: () => void;
  openSessionModal: () => void;
  openEditSessionModal: (session: PlaySession) => void;
  handleSessionDelete: (sessionId: number) => Promise<void>;
  handleFavoriteSelectedGame: () => void;
  handleSendSelectedToPlanner: () => void;
  handleDeleteSelectedGame: () => void;
  handleGameReviewSave: (payload: { score: string; recommend: "" | "yes" | "no"; shortReview: string; longReview: string; pros: string; cons: string; hasSpoiler: boolean }) => Promise<void>;
  handleGameTagsSave: (value: string) => Promise<void>;
  handleGameListsSave: (listIds: number[]) => Promise<void>;
  listOptions: Array<{ id: number | undefined; name: string }>;
}) {
  const plannerInsights = usePlannerInsights({
    games: app.games,
    libraryEntryRows: app.libraryEntryRows,
    sessionRows: app.sessionRows,
    goalRows: app.goalRows,
    fallbackGoalProgress: [],
    preferences: app.preferences,
    sessionCadenceMap: new Map(),
  });
  const selectedGamePage = useSelectedGamePage({
    selectedGame: app.selectedGame,
    selectedRecord: app.selectedGame ? app.recordsByEntryId.get(app.selectedGame.id) : undefined,
    sessionRows: app.sessionRows,
    storeNamesByEntryId: app.storeNamesByEntryId,
    platformNamesByGameId: app.platformNamesByGameId,
    gameTagRows: app.gameTagRows,
    libraryEntryListRows: app.libraryEntryListRows,
    tagById: app.tagById,
    listById: app.listById,
    reviewByEntryId: app.reviewByEntryId,
    goalRows: app.goalRows,
    plannerGoalSignals: plannerInsights.plannerGoalSignals,
    preferences: app.preferences,
  });

  if (!selectedGamePage) {
    return (
      <Panel>
        <SectionHeader
          icon={Cpu}
          title="Página do jogo"
          description="Selecione um item da biblioteca, dashboard ou planner para abrir a ficha dedicada."
          action={
            <NotchButton variant="secondary" onClick={() => openLibraryGame()}>
              Catálogo
            </NotchButton>
          }
        />
      </Panel>
    );
  }

  return (
    <GamePageScreen
      key={[
        selectedGamePage.game.id,
        selectedGamePage.review?.score ?? "",
        selectedGamePage.review?.shortReview ?? "",
        selectedGamePage.review?.longReview ?? "",
        selectedGamePage.tags.map((tag: Tag) => tag.id).join(","),
        selectedGamePage.lists.map((list: List) => list.id).join(","),
        selectedGamePage.sessions.length,
      ].join("|")}
      data={selectedGamePage}
      availableLists={listOptions.map((list) => ({ id: list.id, name: list.name }))}
      onBack={() => openLibraryGame(selectedGamePage?.game.id)}
      onOpenEdit={openEditGameModal}
      onOpenSession={openSessionModal}
      onEditSession={openEditSessionModal}
      onDeleteSession={handleSessionDelete}
      onToggleFavorite={handleFavoriteSelectedGame}
      onSendToPlanner={handleSendSelectedToPlanner}
      onDelete={handleDeleteSelectedGame}
      onSaveReview={handleGameReviewSave}
      onSaveTags={handleGameTagsSave}
      onSaveLists={handleGameListsSave}
    />
  );
}
