import { CalendarDays, Cloud, Cpu, Download, Orbit, Plus, Search, Upload, Zap } from "lucide-react";
import { useEffect } from "react";
import type { User } from "firebase/auth";
import { cx, navigationItems } from "../backlog/shared";
import { NotchButton, Panel, Pill, SectionHeader, SidebarItem, Tag } from "./cyberpunk-ui";
import { useBacklogApp } from "../hooks/useBacklogApp";
import type { SyncMode } from "../hooks/useCloudSync";
import { useAppShellSync } from "../hooks/useAppShellSync";
import { GuidedTourModal } from "../modules/onboarding/components/GuidedTourModal";
import { OnboardingScreen } from "../modules/onboarding/components/OnboardingScreen";
import { AppShellModals } from "./AppShellModals";
import { AppShellScreenContent } from "./AppShellScreenContent";

function ModuleFallback({ message = "Carregando módulo..." }: { message?: string }) {
  return (
    <div className="loading-shell loading-shell--inline" role="status" aria-live="polite">
      <span className="loading-shell__pulse" aria-hidden="true" />
      <strong>{message}</strong>
      <p>Processando estado local, navegação e telemetria visual.</p>
    </div>
  );
}

function describeSyncMode(mode: SyncMode, isAuthEnabled: boolean) {
  if (!isAuthEnabled) {
    return {
      label: "Modo local",
      description: "Firebase não configurado. O app está operando apenas com a base local.",
      tone: "neutral" as const,
    };
  }

  switch (mode) {
    case "cloud-synced":
      return {
        label: "Nuvem sincronizada",
        description: "Base local e snapshot remoto estão alinhados.",
        tone: "emerald" as const,
      };
    case "conflict":
      return {
        label: "Conflito de sync",
        description: "A base local e a nuvem divergem. Resolva isso na Central de Sync.",
        tone: "magenta" as const,
      };
    case "offline":
      return {
        label: "Offline",
        description: "A base local continua ativa, mas o snapshot remoto não pode ser acessado agora.",
        tone: "yellow" as const,
      };
    case "auth-required":
      return {
        label: "Login necessário",
        description: "Faça login para usar sincronização em nuvem e resolução de conflitos.",
        tone: "cyan" as const,
      };
    case "local-only":
    default:
      return {
        label: "Trabalhando local",
        description: "A sincronização automática está pausada até uma nova ação manual.",
        tone: "neutral" as const,
      };
  }
}

type AppShellProps = {
  user: User | null;
  logout: () => Promise<void>;
  isAuthEnabled: boolean;
};

export default function AppShell({ user, logout, isAuthEnabled }: AppShellProps) {
  const app = useBacklogApp();

  const {
    isSyncing,
    isOnline,
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
    triggerSyncToCloud,
  } = useAppShellSync({ app, user, isAuthEnabled });
  const guidedTourOpen = app.guidedTourOpen;
  const guidedTourScreen = app.guidedTourStep.screen;
  const currentScreen = app.screen;
  const setScreen = app.setScreen;

  useEffect(() => {
    if (!guidedTourOpen) return;
    if (currentScreen === guidedTourScreen) return;
    setScreen(guidedTourScreen);
  }, [currentScreen, guidedTourOpen, guidedTourScreen, setScreen]);

  if (app.loading) {
    return (
      <div className="app-shell">
        <div className="app-shell__backdrop" aria-hidden="true" />
        <div className="app-layout">
          <main className="main-column">
            <ModuleFallback message="Sincronizando biblioteca local..." />
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

  const syncCopy = describeSyncMode(syncMode, isAuthEnabled);

  return (
    <div className={cx("app-shell", app.guidedTourOpen && "app-shell--touring")}>
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
                  highlighted={app.guidedTourOpen && app.guidedTourTarget === item.key}
                  onClick={() => app.setScreen(item.key)}
                />
              ))}
            </nav>

            {isAuthEnabled && user ? (
              <div className="sidebar-nav" style={{ marginTop: "auto", paddingTop: "1rem" }}>
                <SidebarItem
                  label="Desconectar"
                  icon={Zap}
                  active={false}
                  onClick={() => {
                    void logout();
                  }}
                />
              </div>
            ) : null}
          </Panel>

          <Panel className={cx(app.guidedTourTarget === "quick-actions" && "tour-focus")}>
            <SectionHeader icon={Zap} title="Ações rápidas" description="Atalhos do sistema" />
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
          {app.notice ? (
            <div className="system-banner">
              <span>{app.notice}</span>
            </div>
          ) : null}

          <div className={cx("sync-trust-banner", `sync-trust-banner--${syncCopy.tone}`)}>
            <div className="sync-trust-banner__copy">
              <div className="sync-trust-banner__head">
                <Cloud size={16} />
                <strong>{syncCopy.label}</strong>
                {isSyncing ? <Pill tone="cyan">Sincronizando</Pill> : null}
              </div>
              <p>{syncCopy.description}</p>
            </div>
            <div className="sync-trust-banner__actions">
              <Pill tone={app.preferences.autoSyncEnabled ? "emerald" : "neutral"}>
                {app.preferences.autoSyncEnabled ? "Auto-sync ativo" : "Auto-sync pausado"}
              </Pill>
              <NotchButton variant="ghost" onClick={() => app.setScreen("sync")}>
                <Cloud size={15} />
                Abrir central
              </NotchButton>
            </div>
          </div>

          <Panel className={cx("hero-panel", app.guidedTourTarget === "dashboard" && "tour-focus")}>
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
                      Catálogo, backlog, planner e estatísticas em uma interface cyberpunk com leitura rápida, foco em
                      decisão e sensação de produto premium.
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

          <div
            className={cx(
              ["library", "maintenance", "sync", "sessions", "planner", "stats", "profile"].includes(
                app.guidedTourTarget ?? "",
              ) &&
                app.guidedTourTarget === app.screen &&
                "tour-focus",
            )}
          >
                      <AppShellScreenContent
              app={app}
              isAuthEnabled={isAuthEnabled}
              isOnline={isOnline}
              isSyncing={isSyncing}
              syncMode={syncMode}
              comparison={comparison}
              cloudExportedAt={cloudExportedAt}
              lastSuccessfulSyncAt={lastSuccessfulSyncAt}
              syncHistory={syncHistory}
              pushLocalToCloud={pushLocalToCloud}
              pullCloudToLocal={pullCloudToLocal}
              mergeLocalAndCloud={mergeLocalAndCloud}
              workLocal={workLocal}
              resetLocalAndCloud={resetLocalAndCloud}
              triggerSyncToCloud={triggerSyncToCloud}
            />
          </div>
        </main>
      </div>

      <GuidedTourModal
        open={app.guidedTourOpen}
        step={app.guidedTourStep}
        stepIndex={app.guidedTourStepIndex}
        totalSteps={app.guidedTourStepCount}
        completing={app.submitting}
        onPrevious={app.previousGuidedTourStep}
        onNext={app.nextGuidedTourStep}
        onClose={app.closeGuidedTour}
        onFinish={app.finishGuidedTour}
      />

      <AppShellModals app={app} />
    </div>
  );
}
