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
  Trash2,
  Upload,
} from "lucide-react";
import { cx } from "../../../backlog/shared";
import { EmptyState, Modal, NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";
import type { SyncMode } from "../../../hooks/useCloudSync";
import type { SyncComparison } from "../utils/syncEngine";
import type { SyncHistoryEntry } from "../utils/syncStorage";
import { PendingMutationsPanel } from "./PendingMutationsPanel";

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
  onResetEverywhere: () => Promise<void> | void;
  onOpenSettings: () => void;
  onSyncNow?: () => void;
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
        description: "A base local e a nuvem divergem. Resolva pela Central de Sync antes de retomar o auto-sync.",
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
        description: "Faça login para acessar snapshot remoto, comparar divergências e sincronizar seus dados.",
        tone: "cyan" as const,
        icon: Cloud,
      };
    case "local-only":
    default:
      return {
        title: "Trabalhando localmente",
        description: "O modo local está ativo e a sincronização automática ficou pausada até uma nova ação manual.",
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
  onResetEverywhere,
  onOpenSettings,
  onSyncNow,
}: SyncCenterScreenProps) {
  const [pendingAction, setPendingAction] = useState<SyncConflictAction | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState("");

  const modeCopy = describeMode(syncMode, isAuthEnabled);
  const ModeIcon = modeCopy.icon;
  const isConflict = syncMode === "conflict" && comparison?.decision === "conflict";
  const wasMerged = Boolean(comparison?.mergedAt);
  const divergentBlocks = useMemo(
    () => (wasMerged ? [] : (comparison?.blocks.filter((block) => block.state !== "same") ?? [])),
    [comparison, wasMerged],
  );
  const displayedBlocks =
    isConflict && divergentBlocks.length > 0 && !wasMerged ? divergentBlocks : (comparison?.blocks ?? []);
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
  const canResetEverywhere = !isSyncing && (!isAuthEnabled || (isOnline && syncMode !== "auth-required"));
  const resetAffectsCloud = isAuthEnabled;
  const resetConfirmationReady = resetConfirmationText.trim().toUpperCase() === "APAGAR TUDO";
  const resetDescription = resetAffectsCloud
    ? "Essa ação remove catálogo, sessões, metas, listas, views salvas, histórico de importação e também apaga o snapshot remoto da sua conta."
    : "Essa ação remove todo o catálogo local, sessões, metas, listas, views salvas e histórico de importação deste dispositivo.";

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
                  O auto-sync foi pausado porque local e nuvem divergem. Revise os blocos abaixo e escolha
                  conscientemente qual lado deve prevalecer.
                </p>
              </div>
            </div>

            <div className="sync-conflict-callout__meta">
              <Pill tone="magenta">Auto-sync pausado</Pill>
              <Pill tone="yellow">
                {divergentBlocks.length} bloco{divergentBlocks.length === 1 ? "" : "s"} em conflito
              </Pill>
              {conflictStats.localOnly > 0 ? <Pill tone="cyan">{conflictStats.localOnly} só local</Pill> : null}
              {conflictStats.cloudOnly > 0 ? <Pill tone="magenta">{conflictStats.cloudOnly} só nuvem</Pill> : null}
              {conflictStats.different > 0 ? <Pill tone="yellow">{conflictStats.different} divergentes</Pill> : null}
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
          <Pill tone={isAuthEnabled ? "cyan" : "neutral"}>{isAuthEnabled ? "Cloud auth pronta" : "Somente local"}</Pill>
          <NotchButton variant="ghost" onClick={onOpenSettings}>
            <RefreshCcw size={15} />
            Abrir configurações
          </NotchButton>
        </div>
      </Panel>

      <Panel className="sync-danger-panel">
        <SectionHeader
          icon={Trash2}
          title="Reset total"
          description="Apague tudo e volte ao estado inicial do app quando quiser recomeçar do zero."
        />

        <div className="sync-danger-panel__body">
          <div className="sync-helper-row">
            <Pill tone="yellow">Zona destrutiva</Pill>
            <Pill tone={resetAffectsCloud ? "magenta" : "neutral"}>
              {resetAffectsCloud ? "Local + nuvem" : "Somente local"}
            </Pill>
          </div>
          <p className="sync-danger-panel__hint">
            Isso apaga jogos, biblioteca, sessões, reviews, listas, tags, metas, views salvas e histórico de importação.
            Use apenas quando quiser começar novamente.
          </p>
          {!canResetEverywhere ? (
            <p className="sync-danger-panel__hint">
              {syncMode === "auth-required"
                ? "Faça login antes de apagar também o snapshot remoto."
                : isAuthEnabled && !isOnline
                  ? "Reconecte a internet para garantir que local e nuvem sejam apagados juntos."
                  : "Aguarde a operação atual terminar antes de executar o reset."}
            </p>
          ) : null}
        </div>

        <div className="sync-danger-panel__actions">
          <NotchButton
            variant="ghost"
            className="sync-danger-button"
            onClick={() => {
              setResetConfirmationText("");
              setResetModalOpen(true);
            }}
            disabled={!canResetEverywhere}
          >
            <Trash2 size={15} />
            Apagar tudo e recomeçar
          </NotchButton>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={CheckCheck}
          title="Comparação de snapshots"
          description={
            wasMerged
              ? "Merge completado com sucesso. Todos os blocos foram reconciliados e sincronizados."
              : isConflict
                ? "Blocos que exigem decisão antes de retomar a sincronização."
                : "Diferenças por bloco entre a base local e o snapshot remoto atual."
          }
        />

        {wasMerged && (
          <div
            className="sync-merged-banner"
            style={{
              padding: 12,
              marginBottom: 16,
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color="#22c55e" />
              <div>
                <strong style={{ color: "#22c55e" }}>Merge completado com sucesso</strong>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  Todos os blocos foram reconciliados. Última sync:{" "}
                  {formatDateTime(comparison?.cloudExportedAt ?? null)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!comparison ? (
          <EmptyState message="Faça login ou configure a nuvem para comparar snapshots." />
        ) : displayedBlocks.length === 0 ? (
          <EmptyState message="Nenhum bloco divergente precisa de intervenção agora." />
        ) : (
          <div className="sync-comparison-table">
            <table className="sync-table">
              <thead>
                <tr>
                  <th>Bloco</th>
                  <th>Estado</th>
                  <th>Local</th>
                  <th>Nuvem</th>
                </tr>
              </thead>
              <tbody>
                {displayedBlocks.map((block) => {
                  const blockState = describeBlockState(block.state);
                  return (
                    <tr key={block.key}>
                      <td>
                        <strong>{block.label}</strong>
                      </td>
                      <td>
                        <Pill tone={blockState.tone}>{blockState.label}</Pill>
                      </td>
                      <td>{block.localCount}</td>
                      <td>{block.cloudCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader
          icon={History}
          title="Histórico de sincronização"
          description="Operações recentes para rastrear push, pull, merge e conflitos."
        />

        {syncHistory.length === 0 ? (
          <EmptyState message="Nenhuma operação de sync registrada ainda." />
        ) : (
          <div className="sync-history-list">
            {syncHistory.slice(0, 10).map((entry) => (
              <article className={cx("sync-history-item", "app-card", "app-card--compact")} key={entry.id}>
                <div className="sync-history-item__head">
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
                <span className="sync-history-item__time">{formatDateTime(entry.timestamp)}</span>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <PendingMutationsPanel onSyncNow={onSyncNow} />

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

      {resetModalOpen ? (
        <Modal
          title="Apagar tudo e começar novamente"
          description={resetDescription}
          onClose={() => {
            if (isSyncing) return;
            setResetModalOpen(false);
            setResetConfirmationText("");
          }}
          closeDisabled={isSyncing}
        >
          <div className="sync-reset-confirmation">
            <div className="sync-reset-confirmation__meta">
              <Pill tone="yellow">Irreversível</Pill>
              <Pill tone={resetAffectsCloud ? "magenta" : "neutral"}>
                {resetAffectsCloud ? "Snapshot remoto será removido" : "Sem nuvem configurada"}
              </Pill>
            </div>

            <div className="sync-reset-confirmation__body">
              <p>
                Depois da confirmação, a base local será zerada e o app voltará ao onboarding. Os dados apagados não
                serão recuperados por merge, restore automático ou sync futura.
              </p>
              <div className="sync-reset-confirmation__impact">
                <strong>Isso remove:</strong>
                <ul className="sync-reset-confirmation__items">
                  <li>Jogos, biblioteca, sessões, reviews, listas, tags e metas.</li>
                  <li>Views salvas, histórico de importação e estado de sync persistido.</li>
                  {resetAffectsCloud ? <li>O snapshot remoto associado à sua conta.</li> : null}
                </ul>
              </div>
            </div>

            <label className="field field--wide">
              <span>Digite APAGAR TUDO para confirmar</span>
              <input
                autoFocus
                data-autofocus
                value={resetConfirmationText}
                onChange={(event) => setResetConfirmationText(event.target.value)}
                placeholder="APAGAR TUDO"
              />
            </label>

            <div className="modal-actions">
              <NotchButton
                variant="ghost"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmationText("");
                }}
                disabled={isSyncing}
              >
                Cancelar
              </NotchButton>
              <NotchButton
                variant="secondary"
                className="sync-danger-button"
                onClick={() => void onResetEverywhere()}
                disabled={isSyncing || !resetConfirmationReady}
              >
                Confirmar reset total
              </NotchButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
