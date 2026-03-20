import { useMemo, useState } from "react";
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
  Modal,
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

type SyncConflictAction = "push-local" | "pull-cloud" | "merge";

type SyncConflictActionCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  impact: string;
  tone: "cyan" | "magenta" | "yellow";
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
      return "Manual: manter local";
    case "manual-pull":
      return "Manual: puxar nuvem";
    case "manual-merge":
      return "Manual: mesclar snapshots";
    case "manual-local":
      return "Manual: só local";
    case "conflict":
      return "Conflito";
    case "match":
      return "Match";
    case "error":
    default:
      return "Erro";
  }
}

function buildConflictActionCopy(action: SyncConflictAction, divergentBlocks: number): SyncConflictActionCopy {
  const scope = divergentBlocks === 1 ? "1 bloco divergente" : `${divergentBlocks} blocos divergentes`;

  switch (action) {
    case "push-local":
      return {
        title: "Confirmar envio da base local",
        description: "Você está escolhendo a base local como fonte de verdade para retomar a sync.",
        confirmLabel: "Confirmar envio local",
        impact: `O snapshot remoto será substituído pelo estado local atual. Use esta ação quando a sua máquina estiver mais atual que a nuvem em ${scope}.`,
        tone: "cyan",
      };
    case "pull-cloud":
      return {
        title: "Confirmar aplicação da nuvem",
        description: "Você está escolhendo o snapshot remoto como fonte de verdade para esta sessão.",
        confirmLabel: "Confirmar puxar nuvem",
        impact: `A base local será substituída pelo snapshot remoto atual. Use esta ação quando a nuvem estiver mais correta que o seu dispositivo em ${scope}.`,
        tone: "magenta",
      };
    case "merge":
    default:
      return {
        title: "Confirmar merge dos snapshots",
        description: "O app vai reconciliar os dois lados com as regras estruturais já existentes no motor de sync.",
        confirmLabel: "Confirmar merge",
        impact: `O sistema vai combinar local e nuvem preservando histórico sempre que possível. Use esta ação quando ambos os lados tenham valor em ${scope}.`,
        tone: "yellow",
      };
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
  const [pendingAction, setPendingAction] = useState<SyncConflictAction | null>(null);

  const modeCopy = describeMode(syncMode, isAuthEnabled);
  const ModeIcon = modeCopy.icon;
  const isConflict = syncMode === "conflict" && comparison?.decision === "conflict";
  const divergentBlocks = useMemo(
    () => comparison?.blocks.filter((block) => block.state !== "same") ?? [],
    [comparison],
  );
  const displayedBlocks =
    isConflict && divergentBlocks.length > 0 ? divergentBlocks : comparison?.blocks ?? [];
  const conflictStats = useMemo(
    () =>
      divergentBlocks.reduce(
        (summary, block) => {
          if (block.state === "different") summary.different += 1;
          if (block.state === "local-only") summary.localOnly += 1;
          if (block.state === "cloud-only") summary.cloudOnly += 1;
          return summary;
        },
        { different: 0, localOnly: 0, cloudOnly: 0 },
      ),
    [divergentBlocks],
  );
  const pendingActionCopy = pendingAction
    ? buildConflictActionCopy(pendingAction, Math.max(divergentBlocks.length, 1))
    : null;

  const handleProtectedAction = (action: SyncConflictAction, handler: () => Promise<void> | void) => {
    if (isConflict) {
      setPendingAction(action);
      return;
    }
    void handler();
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    if (action === "push-local") {
      await onPushLocal();
      return;
    }
    if (action === "pull-cloud") {
      await onPullCloud();
      return;
    }
    await onMerge();
  };

  const pushLabel = isConflict ? "Manter local e enviar" : "Enviar local";
  const pullLabel = isConflict ? "Descartar local e puxar nuvem" : "Puxar nuvem";
  const mergeLabel = isConflict ? "Mesclar snapshots" : "Mesclar";
  const workLocalLabel = isConflict ? "Continuar só local" : "Trabalhar local";
  const autoSyncLabel = isConflict ? "Pausado por conflito" : autoSyncEnabled ? "Ativo" : "Pausado";

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
            <strong>{autoSyncLabel}</strong>
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

        {isConflict && comparison ? (
          <div className="sync-conflict-callout">
            <div className="sync-conflict-callout__head">
              <AlertTriangle size={18} />
              <div>
                <strong>Resolução manual obrigatória</strong>
                <p>
                  O auto-sync foi pausado porque local e nuvem divergem. Revise os blocos abaixo e
                  escolha conscientemente qual lado deve prevalecer.
                </p>
              </div>
            </div>

            <div className="sync-conflict-callout__meta">
              <Pill tone="magenta">Auto-sync pausado</Pill>
              <Pill tone="yellow">
                {divergentBlocks.length} bloco{divergentBlocks.length === 1 ? "" : "s"} em conflito
              </Pill>
              {conflictStats.localOnly > 0 ? (
                <Pill tone="cyan">{conflictStats.localOnly} só local</Pill>
              ) : null}
              {conflictStats.cloudOnly > 0 ? (
                <Pill tone="magenta">{conflictStats.cloudOnly} só nuvem</Pill>
              ) : null}
              {conflictStats.different > 0 ? (
                <Pill tone="yellow">{conflictStats.different} divergentes</Pill>
              ) : null}
            </div>

            <div className="sync-conflict-chip-list">
              {divergentBlocks.map((block) => (
                <article className="sync-conflict-chip" key={block.key}>
                  <strong>{block.label}</strong>
                  <span>
                    Local {block.localCount} • Nuvem {block.cloudCount}
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="sync-action-grid">
          <NotchButton
            variant="primary"
            onClick={() => handleProtectedAction("push-local", onPushLocal)}
            disabled={!isAuthEnabled || !isOnline || isSyncing}
          >
            <Upload size={15} />
            {pushLabel}
          </NotchButton>
          <NotchButton
            variant="secondary"
            onClick={() => handleProtectedAction("pull-cloud", onPullCloud)}
            disabled={!isAuthEnabled || !isOnline || isSyncing}
          >
            <Download size={15} />
            {pullLabel}
          </NotchButton>
          <NotchButton
            variant="secondary"
            onClick={() => handleProtectedAction("merge", onMerge)}
            disabled={!isAuthEnabled || !isOnline || isSyncing}
          >
            <GitMerge size={15} />
            {mergeLabel}
          </NotchButton>
          <NotchButton variant="ghost" onClick={() => void onWorkLocal()} disabled={isSyncing}>
            <HardDriveDownload size={15} />
            {workLocalLabel}
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
            description={
              isConflict
                ? "Blocos que exigem decisão antes de retomar a sincronização."
                : "Diferenças por bloco entre a base local e o snapshot remoto atual."
            }
          />

          {!comparison ? (
            <EmptyState message="Faça login ou configure a nuvem para comparar snapshots." />
          ) : displayedBlocks.length === 0 ? (
            <EmptyState message="Nenhum bloco divergente precisa de intervenção agora." />
          ) : (
            <div className="sync-block-grid">
              {displayedBlocks.map((block) => {
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

      {pendingAction && pendingActionCopy ? (
        <Modal
          title={pendingActionCopy.title}
          description={pendingActionCopy.description}
          onClose={() => {
            if (!isSyncing) setPendingAction(null);
          }}
        >
          <div className="sync-confirmation">
            <div className="sync-confirmation__meta">
              <Pill tone={pendingActionCopy.tone}>Ação manual</Pill>
              <Pill tone="neutral">{formatDateTime(cloudExportedAt)}</Pill>
            </div>

            <div className="sync-confirmation__body">
              <p>{pendingActionCopy.impact}</p>
              <div className="sync-confirmation__blocks">
                {divergentBlocks.map((block) => (
                  <div className="sync-confirmation__block" key={block.key}>
                    <strong>{block.label}</strong>
                    <span>
                      Local {block.localCount} • Nuvem {block.cloudCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <NotchButton variant="ghost" onClick={() => setPendingAction(null)} disabled={isSyncing}>
                Cancelar
              </NotchButton>
              <NotchButton
                variant={pendingAction === "pull-cloud" ? "secondary" : "primary"}
                onClick={() => void handleConfirmPendingAction()}
                disabled={isSyncing}
              >
                {pendingActionCopy.confirmLabel}
              </NotchButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
