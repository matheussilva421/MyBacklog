import {
  AlertTriangle,
  CheckCheck,
  Cloud,
  CloudOff,
  Download,
  GitMerge,
  HardDriveDownload,
  History,
  RefreshCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { cx } from "../../../backlog/shared";
import {
  EmptyState,
  NotchButton,
  Panel,
  Pill,
  SectionHeader,
} from "../../../components/cyberpunk-ui";
import type { SyncMode } from "../../../hooks/useCloudSync";
import type { SyncComparison } from "../utils/syncEngine";
import type { SyncHistoryEntry } from "../utils/syncStorage";

type SyncCenterScreenProps = {
  isAuthEnabled: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncMode: SyncMode;
  autoSyncEnabled: boolean;
  comparison: SyncComparison | null;
  syncHistory: SyncHistoryEntry[];
  lastSuccessfulSyncAt: string | null;
  cloudExportedAt: string | null;
  onPushLocal: () => Promise<void> | void;
  onPullCloud: () => Promise<void> | void;
  onMerge: () => Promise<void> | void;
  onWorkLocal: () => Promise<void> | void;
  onOpenSettings: () => void;
};

function formatDateTime(value: string | null): string {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function describeMode(mode: SyncMode, isAuthEnabled: boolean) {
  if (!isAuthEnabled) {
    return {
      title: "Modo local",
      description:
        "O app está operando apenas com IndexedDB local porque a autenticação em nuvem não está configurada.",
      tone: "neutral" as const,
      icon: HardDriveDownload,
    };
  }

  switch (mode) {
    case "cloud-synced":
      return {
        title: "Nuvem sincronizada",
        description:
          "Base local e snapshot remoto estão alinhados. Você pode forçar ações manuais se quiser auditar o fluxo.",
        tone: "emerald" as const,
        icon: ShieldCheck,
      };
    case "conflict":
      return {
        title: "Conflito detectado",
        description:
          "A base local e a nuvem divergem. Resolva pela Central de Sync antes de retomar o auto-sync.",
        tone: "magenta" as const,
        icon: AlertTriangle,
      };
    case "offline":
      return {
        title: "Offline",
        description:
          "A base local continua disponível, mas nenhuma ação contra a nuvem pode ser executada até a conexão voltar.",
        tone: "yellow" as const,
        icon: CloudOff,
      };
    case "auth-required":
      return {
        title: "Login necessário",
        description:
          "Faça login para acessar snapshot remoto, comparar divergências e sincronizar seus dados.",
        tone: "cyan" as const,
        icon: Cloud,
      };
    case "local-only":
    default:
      return {
        title: "Trabalhando localmente",
        description:
          "O modo local está ativo e a sincronização automática ficou pausada até uma nova ação manual.",
        tone: "neutral" as const,
        icon: HardDriveDownload,
      };
  }
}

function describeBlockState(state: SyncComparison["blocks"][number]["state"]) {
  switch (state) {
    case "same":
      return { label: "Igual", tone: "emerald" as const };
    case "local-only":
      return { label: "Só local", tone: "cyan" as const };
    case "cloud-only":
      return { label: "Só nuvem", tone: "magenta" as const };
    case "different":
    default:
      return { label: "Divergente", tone: "yellow" as const };
  }
}

function describeHistoryAction(action: SyncHistoryEntry["action"]) {
  switch (action) {
    case "auto-push":
      return "Auto: enviar local";
    case "auto-pull":
      return "Auto: puxar nuvem";
    case "manual-push":
      return "Manual: enviar local";
    case "manual-pull":
      return "Manual: puxar nuvem";
    case "manual-merge":
      return "Manual: merge";
    case "manual-local":
      return "Manual: trabalhar local";
    case "conflict":
      return "Conflito";
    case "match":
      return "Match";
    case "error":
    default:
      return "Erro";
  }
}

export function SyncCenterScreen({
  isAuthEnabled,
  isOnline,
  isSyncing,
  syncMode,
  autoSyncEnabled,
  comparison,
  syncHistory,
  lastSuccessfulSyncAt,
  cloudExportedAt,
  onPushLocal,
  onPullCloud,
  onMerge,
  onWorkLocal,
  onOpenSettings,
}: SyncCenterScreenProps) {
  const modeCopy = describeMode(syncMode, isAuthEnabled);
  const ModeIcon = modeCopy.icon;

  return (
    <div className="sync-layout">
      <Panel className={cx("sync-status-panel", `sync-status-panel--${modeCopy.tone}`)}>
        <SectionHeader
          icon={ModeIcon}
          title="Central de Sincronização"
          description={modeCopy.description}
          action={
            <div className="panel-toolbar">
              <Pill tone={modeCopy.tone}>{modeCopy.title}</Pill>
              {isSyncing ? <Pill tone="cyan">Sincronizando</Pill> : null}
            </div>
          }
        />

        <div className="sync-status-grid">
          <div className="detail-stat">
            <span>Conectividade</span>
            <strong>{isOnline ? "Online" : "Offline"}</strong>
          </div>
          <div className="detail-stat">
            <span>Auto-sync</span>
            <strong>{autoSyncEnabled ? "Ativo" : "Pausado"}</strong>
          </div>
          <div className="detail-stat">
            <span>Último sync</span>
            <strong>{formatDateTime(lastSuccessfulSyncAt)}</strong>
          </div>
          <div className="detail-stat">
            <span>Snapshot remoto</span>
            <strong>{formatDateTime(cloudExportedAt)}</strong>
          </div>
        </div>

        <div className="sync-action-grid">
          <NotchButton
            variant="primary"
            onClick={onPushLocal}
            disabled={!isAuthEnabled || !isOnline || isSyncing}
          >
            <Upload size={15} />
            Enviar local
          </NotchButton>
          <NotchButton
            variant="secondary"
            onClick={onPullCloud}
            disabled={!isAuthEnabled || !isOnline || isSyncing}
          >
            <Download size={15} />
            Puxar nuvem
          </NotchButton>
          <NotchButton
            variant="secondary"
            onClick={onMerge}
            disabled={!isAuthEnabled || !isOnline || isSyncing}
          >
            <GitMerge size={15} />
            Mesclar
          </NotchButton>
          <NotchButton variant="ghost" onClick={onWorkLocal} disabled={isSyncing}>
            <HardDriveDownload size={15} />
            Trabalhar local
          </NotchButton>
        </div>

        <div className="sync-helper-row">
          <Pill tone={isAuthEnabled ? "cyan" : "neutral"}>
            {isAuthEnabled ? "Cloud auth pronta" : "Somente local"}
          </Pill>
          <NotchButton variant="ghost" onClick={onOpenSettings}>
            <RefreshCcw size={15} />
            Abrir configurações
          </NotchButton>
        </div>
      </Panel>

      <div className="sync-detail-grid">
        <Panel>
          <SectionHeader
            icon={CheckCheck}
            title="Comparação de snapshots"
            description="Diferenças por bloco entre a base local e o snapshot remoto atual."
          />

          {!comparison ? (
            <EmptyState message="Faça login ou configure a nuvem para comparar snapshots." />
          ) : (
            <div className="sync-block-grid">
              {comparison.blocks.map((block) => {
                const blockState = describeBlockState(block.state);

                return (
                  <article className="audit-card audit-card--compact" key={block.key}>
                    <div className="audit-card__head">
                      <div className="audit-card__title">
                        <h3>{block.label}</h3>
                      </div>
                      <Pill tone={blockState.tone}>{blockState.label}</Pill>
                    </div>
                    <div className="sync-block-stats">
                      <div className="detail-stat">
                        <span>Local</span>
                        <strong>{block.localCount}</strong>
                      </div>
                      <div className="detail-stat">
                        <span>Nuvem</span>
                        <strong>{block.cloudCount}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader
            icon={History}
            title="Histórico curto"
            description="Operações recentes da sincronização para rastrear push, pull, merge e conflitos."
          />

          {syncHistory.length === 0 ? (
            <EmptyState message="Nenhuma operação de sync registrada ainda." />
          ) : (
            <div className="sync-history-list">
              {syncHistory.map((entry) => (
                <article className="sync-history-card" key={entry.id}>
                  <div className="sync-history-card__head">
                    <strong>{describeHistoryAction(entry.action)}</strong>
                    <Pill
                      tone={
                        entry.result === "success"
                          ? "emerald"
                          : entry.result === "conflict"
                            ? "magenta"
                            : entry.result === "error"
                              ? "yellow"
                              : "neutral"
                      }
                    >
                      {entry.result}
                    </Pill>
                  </div>
                  <p>{entry.message}</p>
                  <span>{formatDateTime(entry.timestamp)}</span>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
