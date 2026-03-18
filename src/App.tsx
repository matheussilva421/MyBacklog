import { CalendarDays, Cpu, Download, Orbit, Plus, Search, Upload, Zap } from "lucide-react";
import { navigationItems } from "./backlog/shared";
import { GameModal, GoalModal, ImportModal, RestoreModal, SessionModal } from "./components/backlog-modals";
import { NotchButton, Panel, SectionHeader, SidebarItem, Tag } from "./components/cyberpunk-ui";
import { useBacklogApp } from "./hooks/useBacklogApp";
import { DashboardScreen } from "./modules/dashboard/components/DashboardScreen";
import { GamePageScreen } from "./modules/game-page/components/GamePageScreen";
import { OnboardingScreen } from "./modules/onboarding/components/OnboardingScreen";
import { LibraryScreen } from "./modules/library/components/LibraryScreen";
import { PlannerScreen } from "./modules/planner/components/PlannerScreen";
import { SessionsScreen } from "./modules/sessions/components/SessionsScreen";
import { ProfileScreen } from "./modules/settings/components/ProfileScreen";
import { StatsScreen } from "./modules/stats/components/StatsScreen";

export default function App() {
  const app = useBacklogApp();

  if (app.loading) {
    return (
      <div className="app-shell">
        <div className="app-shell__backdrop" aria-hidden="true" />
        <div className="app-layout">
          <main className="main-column">
            <div className="system-banner">
              <span>Sincronizando biblioteca local...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!app.hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        initialDraft={app.onboardingInitialDraft}
        initialLists={app.onboardingInitialLists}
        initialGoalIds={app.onboardingInitialGoalIds}
        notice={app.notice}
        submitting={app.submitting}
        onSubmit={app.handleOnboardingSubmit}
      />
    );
  }

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
        onOpenGamePage={app.openGamePage}
        onOpenPlanner={() => app.setScreen("planner")}
      />
    );
  } else if (app.screen === "library") {
    screenContent = (
      <LibraryScreen
        libraryGames={app.libraryGames}
        selectedGame={app.selectedGame}
        selectedGameLists={app.selectedGameLists}
        filter={app.filter}
        selectedListFilter={app.selectedListFilter}
        listOptions={app.listOptions}
        onFilterChange={(value) => app.setFilter(value)}
        onListFilterChange={(value) => app.setSelectedListFilter(value)}
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
        onOpenGamePage={app.openGamePage}
        onSendSelectedToPlanner={app.handleSendSelectedToPlanner}
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
        visibleSessions={app.visibleSessions}
        findGame={app.findGame}
        onEditSession={app.openEditSessionModal}
        onDeleteSession={app.handleSessionDelete}
      />
    );
  } else if (app.screen === "profile") {
    screenContent = (
      <ProfileScreen
        achievementCards={app.achievementCards}
        totalGames={app.stats.total}
        totalHours={app.stats.hours}
        preferences={app.preferences}
        listRows={app.listRows}
        onPreferencesSave={app.handlePreferencesSave}
        onListCreate={app.handleListCreate}
        onListDelete={app.handleListDelete}
      />
    );
  } else if (app.screen === "game") {
    screenContent = app.selectedGamePage ? (
      <GamePageScreen
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
                  active={app.screen === item.key || (app.screen === "game" && item.key === "library")}
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
              <NotchButton variant="ghost" onClick={() => app.openSessionModal(app.selectedGame?.id)}>
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
        onClose={app.closeGameModal}
        onChange={app.handleGameFormChange}
        onSubmit={app.handleGameSubmit}
      />

      <SessionModal
        open={app.sessionModalOpen}
        mode={app.sessionEditId != null ? "edit" : "create"}
        form={app.sessionForm}
        libraryGames={app.games}
        onClose={app.closeSessionModal}
        onChange={app.handleSessionFormChange}
        onSubmit={app.handleSessionSubmit}
      />

      <GoalModal
        mode={app.goalModalMode}
        form={app.goalForm}
        onClose={app.closeGoalModal}
        onChange={app.handleGoalFormChange}
        onSubmit={app.handleGoalSubmit}
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
        onMatchChange={app.handleImportPreviewMatchChange}
        onRawgChange={app.handleImportPreviewRawgChange}
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
    </div>
  );
}
