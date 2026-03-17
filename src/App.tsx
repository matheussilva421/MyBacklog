import { CalendarDays, Cpu, Download, Orbit, Plus, Search, Upload, Zap } from "lucide-react";
import { navigationItems } from "./backlog/shared";
import { GameModal, ImportModal, RestoreModal, SessionModal } from "./components/backlog-modals";
import { NotchButton, Panel, SectionHeader, SidebarItem, Tag } from "./components/cyberpunk-ui";
import { useBacklogApp } from "./hooks/useBacklogApp";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { PlannerScreen } from "./screens/PlannerScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { StatsScreen } from "./screens/StatsScreen";

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

          <Panel>
            <SectionHeader icon={Zap} title="Quick actions" description="Atalhos do sistema" />
            <div className="quick-actions">
              <NotchButton variant="primary" onClick={app.openCreateGameModal}>
                <Plus size={15} />
                Novo jogo
              </NotchButton>
              <NotchButton variant="secondary" onClick={app.openImportFlow}>
                <Download size={15} />
                Importar biblioteca
              </NotchButton>
              <NotchButton variant="secondary" onClick={app.openRestoreFlow}>
                <Upload size={15} />
                Restaurar backup
              </NotchButton>
              <NotchButton variant="ghost" onClick={() => app.openSessionModal(app.selectedGame.id)}>
                <CalendarDays size={15} />
                Registrar sessão
              </NotchButton>
            </div>
          </Panel>
        </aside>

        <main className="main-column">
          {app.loading || app.notice ? (
            <div className="system-banner">
              <span>{app.loading ? "Sincronizando biblioteca local..." : app.notice}</span>
            </div>
          ) : null}

          <Panel className="hero-panel">
            <div className="hero-panel__layout">
              <div className="hero-panel__copy">
                <div className="hero-panel__badges">
                  <Tag>Backlog OS</Tag>
                  <Tag tone="cyan">Night City Mode</Tag>
                  <Tag tone="magenta">Aggressive Premium UI</Tag>
                </div>

                <div className="hero-panel__headline">
                  <div className="hero-panel__icon">
                    <Cpu size={25} />
                  </div>
                  <div>
                    <span className="hero-panel__eyebrow">Neural interface</span>
                    <h2>
                      {app.heroCopy.before} <span>{app.heroCopy.accent}</span>
                    </h2>
                    <p>
                      Catálogo, backlog, planner e estatísticas em uma interface cyberpunk com leitura
                      rápida, foco em decisão e sensação de produto premium.
                    </p>
                  </div>
                </div>
              </div>

              <div className="hero-panel__actions">
                <label className="search-box" htmlFor="global-search">
                  <Search size={16} />
                  <input
                    id="global-search"
                    type="text"
                    value={app.query}
                    onChange={(event) => app.setQuery(event.target.value)}
                    placeholder="Busca global..."
                  />
                </label>
                <div className="hero-panel__action-grid">
                  <NotchButton variant="primary" onClick={app.openCreateGameModal}>
                    <Zap size={15} />
                    Adicionar
                  </NotchButton>
                  <NotchButton variant="secondary" onClick={app.openImportFlow}>
                    Importar
                  </NotchButton>
                  <NotchButton variant="secondary" onClick={() => app.setScreen("planner")}>
                    Planner
                  </NotchButton>
                  <NotchButton variant="ghost" onClick={() => app.openLibraryGame()}>
                    Catálogo
                  </NotchButton>
                </div>
              </div>
            </div>
          </Panel>

          {screenContent}
        </main>
      </div>

      <GameModal
        mode={app.gameModalMode}
        form={app.gameForm}
        onChange={app.handleGameFormChange}
        onSubmit={app.handleGameSubmit}
        onClose={app.closeGameModal}
      />

      <ImportModal
        open={app.importModalOpen}
        importSource={app.importSource}
        importText={app.importText}
        importFileName={app.importFileName}
        importPreview={app.importPreview}
        importPreviewSummary={app.importPreviewSummary}
        importFileInputRef={app.importFileInputRef}
        onSourceChange={app.handleImportSourceChange}
        onTextChange={app.handleImportTextChange}
        onFileChange={app.handleImportFileChange}
        onPreviewActionChange={app.handleImportPreviewActionChange}
        onSubmit={app.handleImportSubmit}
        onClose={app.closeImportFlow}
        onBack={app.resetImportPreview}
      />

      <RestoreModal
        open={app.restoreModalOpen}
        restoreMode={app.restoreMode}
        restoreText={app.restoreText}
        restoreFileName={app.restoreFileName}
        restorePreview={app.restorePreview}
        restorePreviewTotals={app.restorePreviewTotals}
        restoreFileInputRef={app.restoreFileInputRef}
        onModeChange={app.handleRestoreModeChange}
        onTextChange={app.handleRestoreTextChange}
        onFileChange={app.handleRestoreFileChange}
        onSubmit={app.handleRestoreSubmit}
        onClose={app.closeRestoreFlow}
        onBack={app.resetRestorePreview}
      />

      <SessionModal
        open={app.sessionModalOpen}
        sessionForm={app.sessionForm}
        games={app.games}
        onChange={app.handleSessionFormChange}
        onSubmit={app.handleSessionSubmit}
        onClose={app.closeSessionModal}
      />
    </div>
  );
}
