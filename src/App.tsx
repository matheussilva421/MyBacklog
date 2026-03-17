import { CalendarDays, Cpu, Download, Orbit, Plus, Search, Upload, Zap } from "lucide-react";
import { navigationItems } from "./backlog/shared";
import { GameModal, ImportModal, RestoreModal, SessionModal } from "./components/backlog-modals";
import { Panel, SidebarItem } from "./components/cyberpunk-ui";
import { useBacklogApp } from "./hooks/useBacklogApp";
import { DashboardScreen } from "./modules/dashboard/components/DashboardScreen";
import { LibraryScreen } from "./modules/library/components/LibraryScreen";
import { PlannerScreen } from "./modules/planner/components/PlannerScreen";
import { ProfileScreen } from "./modules/settings/components/ProfileScreen";
import { StatsScreen } from "./modules/stats/components/StatsScreen";

export default function App() {
  const app = useBacklogApp();

  let screenContent = null;

  if (app.screen === "dashboard") {
    screenContent = (
      <DashboardScreen
        stats={app.stats}
        monthlyProgress={app.monthlyProgress}
        platformData={app.platformData}
        continuePlayingGames={app.continuePlayingGames}
        visiblePlannerQueue={app.visiblePlannerQueue}
        findGame={app.findGame}
        onOpenLibrary={app.openLibraryGame}
        onOpenPlanner={() => app.setScreen("planner")}
      />
    );
  } else if (app.screen === "library") {
    screenContent = (
      <LibraryScreen
        libraryGames={app.libraryGames}
        selectedGame={app.selectedGame}
        filter={app.filter}
        onFilterChange={(value) => app.setFilter(value)}
        onSelectGame={(gameId) => app.setSelectedGameId(gameId)}
        onExport={app.handleExport}
        onBackupExport={app.handleBackupExport}
        onOpenRestore={app.openRestoreFlow}
        onOpenCreate={app.openCreateGameModal}
        onOpenEdit={app.openEditGameModal}
        onDeleteSelected={app.handleDeleteSelectedGame}
        onResumeSelected={app.handleResumeSelectedGame}
        onFavoriteSelected={app.handleFavoriteSelectedGame}
        onOpenSession={app.openSessionModal}
        onSendSelectedToPlanner={app.handleSendSelectedToPlanner}
      />
    );
  } else if (app.screen === "planner") {
    screenContent = (
      <PlannerScreen
        visiblePlannerQueue={app.visiblePlannerQueue}
        goalProgress={app.goalProgress}
        systemRules={app.systemRules}
        findGame={app.findGame}
        onOpenLibrary={app.openLibraryGame}
      />
    );
  } else if (app.screen === "stats") {
    screenContent = (
      <StatsScreen
        durationBuckets={app.durationBuckets}
        visibleSessions={app.visibleSessions}
        findGame={app.findGame}
      />
    );
  } else if (app.screen === "profile") {
    screenContent = <ProfileScreen achievementCards={app.achievementCards} />;
  }

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-layout">
        <aside className="sidebar-column">
          <Panel className="brand-panel">
            <div className="brand-panel__top">
              <div className="brand-mark">
                <Orbit size={26} />
              </div>
              <div>
                <span className="brand-panel__eyebrow">Night City Backlog OS</span>
                <h1>
                  Arsenal
                  <br />
                  Gamer
                </h1>
                <p>Sistema de catálogo, execução e telemetria pessoal.</p>
              </div>
            </div>

            <nav className="sidebar-nav" aria-label="Navegação principal">
              {navigationItems.map((item) => (
                <SidebarItem
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  active={app.screen === item.key}
                  onClick={() => app.setScreen(item.key)}
                />
              ))}
            </nav>
          </Panel>
        </aside>

        <main className="main-column">
          {screenContent}
        </main>
      </div>

      <GameModal
        mode={app.gameModalMode}
        form={app.gameForm}
        onClose={app.closeGameModal}
        onChange={app.handleGameFormChange}
        onSubmit={app.handleGameSubmit}
      />

      <SessionModal
        open={app.sessionModalOpen}
        form={app.sessionForm}
        libraryGames={app.games}
        onClose={app.closeSessionModal}
        onChange={app.handleSessionFormChange}
        onSubmit={app.handleSessionSubmit}
      />

      <ImportModal
        open={app.importModalOpen}
        source={app.importSource}
        text={app.importText}
        fileName={app.importFileName}
        preview={app.importPreview}
        summary={app.importPreviewSummary}
        fileInputRef={app.importFileInputRef}
        onClose={app.closeImportFlow}
        onSourceChange={app.handleImportSourceChange}
        onTextChange={app.handleImportTextChange}
        onFileChange={app.handleImportFileChange}
        onActionChange={app.handleImportPreviewActionChange}
        onSubmit={app.handleImportSubmit}
      />

      <RestoreModal
        open={app.restoreModalOpen}
        mode={app.restoreMode}
        text={app.restoreText}
        fileName={app.restoreFileName}
        preview={app.restorePreview}
        totals={app.restorePreviewTotals}
        fileInputRef={app.restoreFileInputRef}
        onClose={app.closeRestoreFlow}
        onModeChange={app.handleRestoreModeChange}
        onTextChange={app.handleRestoreTextChange}
        onFileChange={app.handleRestoreFileChange}
        onSubmit={app.handleRestoreSubmit}
      />

      {app.notice && (
        <div className="toast-notice">
          <Zap size={16} />
          <span>{app.notice}</span>
        </div>
      )}
    </div>
  );
}
