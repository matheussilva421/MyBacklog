import { useState } from "react";
import { AlertTriangle, RefreshCcw, Trash2, XCircle, CheckCircle2 } from "lucide-react";
import { cx } from "../../../backlog/shared";
import { NotchButton, Pill, Modal, EmptyState, SectionHeader, Panel } from "../../../components/cyberpunk-ui";
import { usePendingMutationsState } from "../hooks/usePendingMutationsState";
import type { PendingMutation } from "../../core/types";

const ENTITY_LABELS: Record<string, string> = {
  game: "Jogo",
  libraryEntry: "Entrada da biblioteca",
  playSession: "Sessão",
  review: "Review",
  list: "Lista",
  tag: "Tag",
  store: "Loja",
  platform: "Plataforma",
  goal: "Meta",
  savedView: "View salva",
  importJob: "Importação",
  libraryEntryStore: "Loja da entrada",
  libraryEntryList: "Lista da entrada",
  gameTag: "Tag do jogo",
  gamePlatform: "Plataforma do jogo",
  setting: "Configuração",
};

const MUTATION_TYPE_LABELS: Record<string, string> = {
  create: "Criar",
  update: "Atualizar",
  delete: "Excluir",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function MutationItem({
  mutation,
  onRetry,
  onDelete,
}: {
  mutation: PendingMutation;
  onRetry: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const entityLabel = ENTITY_LABELS[mutation.entityType] || mutation.entityType;
  const mutationTypeLabel = MUTATION_TYPE_LABELS[mutation.mutationType] || mutation.mutationType;
  const isPermanent = mutation.retryCount >= 5;

  return (
    <article className={cx("app-card", "app-card--compact", isPermanent ? "app-card--error" : "app-card--warning")}>
      <div className="app-card__head">
        <div className="app-card__head__start">
          {isPermanent ? (
            <XCircle size={16} className="app-card__icon--error" />
          ) : (
            <AlertTriangle size={16} className="app-card__icon--warning" />
          )}
          <div>
            <strong>{entityLabel}</strong>
            <span className="app-card__subtitle">
              {mutationTypeLabel} • Retry {mutation.retryCount}/5
            </span>
          </div>
        </div>
        <Pill tone={isPermanent ? "magenta" : "yellow"}>
          {isPermanent ? "Falha permanente" : "Tentando..."}
        </Pill>
      </div>

      <div className="app-card__body">
        <p className="app-card__meta">
          <span>UUID: {mutation.uuid.slice(0, 8)}...{mutation.uuid.slice(-4)}</span>
          <span>Criado em: {formatDateTime(mutation.createdAt)}</span>
        </p>
      </div>

      <div className="app-card__actions">
        {!isPermanent && (
          <NotchButton variant="ghost" onClick={() => onRetry(mutation.id!)} disabled={false}>
            <RefreshCcw size={14} />
            Retentar agora
          </NotchButton>
        )}
        {isPermanent && (
          <>
            <NotchButton variant="ghost" onClick={() => onRetry(mutation.id!)}>
              <RefreshCcw size={14} />
              Retentar sync
            </NotchButton>
            <NotchButton variant="ghost" className="danger" onClick={() => onDelete(mutation.id!)}>
              <Trash2 size={14} />
              Descartar mutação
            </NotchButton>
          </>
        )}
      </div>
    </article>
  );
}

export function PendingMutationsPanel({
  onSyncNow,
}: {
  onSyncNow?: () => void;
}) {
  const {
    pending,
    permanentFailures,
    temporaryFailures,
    isLoading,
    stats,
    retry,
    retryAll,
    delete: deleteMutation,
    deleteAll,
    discardAll,
  } = usePendingMutationsState();

  const [confirmModal, setConfirmModal] = useState<{
    type: "retry-all" | "delete-all" | "discard-all";
    count: number;
  } | null>(null);

  if (isLoading) {
    return (
      <Panel>
        <SectionHeader
          icon={AlertTriangle}
          title="Mutações pendentes"
          description="Carregando estado das mutações..."
        />
        <div className="loading-state">Carregando...</div>
      </Panel>
    );
  }

  const hasAnyMutations = stats.total > 0 || stats.permanent > 0 || stats.temporary > 0;

  if (!hasAnyMutations) {
    return (
      <Panel>
        <SectionHeader
          icon={CheckCircle2}
          title="Mutações sincronizadas"
          description="Não há mutações pendentes. Todos os dados estão sincronizados."
        />
        <EmptyState message="Nenhuma mutação pendente." />
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionHeader
        icon={AlertTriangle}
        title="Mutações pendentes"
        description="Gerencie mutações que falharam ao sincronizar com a nuvem."
        action={
          <div className="panel-toolbar">
            {stats.permanent > 0 && (
              <Pill tone="magenta">{stats.permanent} falha{stats.permanent === 1 ? "" : "s"} perm.</Pill>
            )}
            {stats.temporary > 0 && (
              <Pill tone="yellow">{stats.temporary} tentando...</Pill>
            )}
            {stats.total > 0 && (
              <Pill tone="cyan">{stats.total} total</Pill>
            )}
          </div>
        }
      />

      {/* Falhas permanentes */}
      {permanentFailures.length > 0 && (
        <div className="mutations-section">
          <div className="mutations-section__head">
            <h4 className="mutations-section__title">
              <XCircle size={16} />
              Falhas permanentes ({permanentFailures.length})
            </h4>
            <div className="mutations-section__actions">
              <NotchButton
                variant="ghost"
                onClick={() => setConfirmModal({ type: "retry-all", count: permanentFailures.length })}
              >
                <RefreshCcw size={14} />
                Retentar todas
              </NotchButton>
              <NotchButton
                variant="ghost"
                className="danger"
                onClick={() => setConfirmModal({ type: "delete-all", count: permanentFailures.length })}
              >
                <Trash2 size={14} />
                Descartar todas
              </NotchButton>
            </div>
          </div>

          <div className="mutations-list">
            {permanentFailures.map((mutation) => (
              <MutationItem
                key={mutation.id}
                mutation={mutation}
                onRetry={retry}
                onDelete={deleteMutation}
              />
            ))}
          </div>

          <div className="mutations-section__hint">
            <AlertTriangle size={14} />
            <p>Mutações com 5 falhas não são mais processadas automaticamente. Retente o sync ou descarte.</p>
          </div>
        </div>
      )}

      {/* Falhas temporárias */}
      {temporaryFailures.length > 0 && (
        <div className="mutations-section">
          <div className="mutations-section__head">
            <h4 className="mutations-section__title">
              <AlertTriangle size={16} />
              Em retry ({temporaryFailures.length})
            </h4>
          </div>

          <div className="mutations-list">
            {temporaryFailures.map((mutation) => (
              <MutationItem
                key={mutation.id}
                mutation={mutation}
                onRetry={retry}
                onDelete={deleteMutation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mutações pendentes sem falha */}
      {pending.filter((m) => m.retryCount === 0).length > 0 && (
        <div className="mutations-section">
          <div className="mutations-section__head">
            <h4 className="mutations-section__title">
              <RefreshCcw size={16} />
              Aguardando sync ({pending.filter((m) => m.retryCount === 0).length})
            </h4>
            <NotchButton
              variant="ghost"
              className="danger"
              onClick={() => setConfirmModal({ type: "discard-all", count: pending.filter((m) => m.retryCount === 0).length })}
            >
              <Trash2 size={14} />
              Descartar pendentes
            </NotchButton>
          </div>

          <div className="mutations-list">
            {pending.filter((m) => m.retryCount === 0).map((mutation) => (
              <MutationItem
                key={mutation.id}
                mutation={mutation}
                onRetry={retry}
                onDelete={deleteMutation}
              />
            ))}
          </div>

          <div className="mutations-section__hint">
            <p>Estas mutações serão processadas no próximo ciclo de sync automático.</p>
          </div>
        </div>
      )}

      {onSyncNow && (
        <div className="mutations-section__footer">
          <NotchButton variant="primary" onClick={onSyncNow}>
            <RefreshCcw size={14} />
            Sincronizar agora
          </NotchButton>
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmModal && (
        <Modal
          title={
            confirmModal.type === "retry-all"
              ? "Retentar todas as falhas permanentes?"
              : confirmModal.type === "delete-all"
              ? "Descartar todas as falhas permanentes?"
              : "Descartar mutações pendentes?"
          }
          description={
            confirmModal.type === "retry-all"
              ? `Isso irá resetar o contador de retry de ${confirmModal.count} mutação(ões) e agendar novo sync.`
              : confirmModal.type === "delete-all"
              ? `Isso irá remover permanentemente ${confirmModal.count} mutação(ões) falhas. Esta ação não pode ser desfeita.`
              : `Isso irá remover ${confirmModal.count} mutação(ões) pendentes não sincronizadas.`
          }
          onClose={() => setConfirmModal(null)}
        >
          <div className="modal-actions">
            <NotchButton variant="ghost" onClick={() => setConfirmModal(null)}>
              Cancelar
            </NotchButton>
            <NotchButton
              variant={confirmModal.type === "delete-all" ? "secondary" : "primary"}
              className={confirmModal.type === "delete-all" ? "sync-danger-button" : ""}
              onClick={() => {
                if (confirmModal.type === "retry-all") {
                  retryAll();
                } else if (confirmModal.type === "delete-all") {
                  deleteAll();
                } else {
                  discardAll();
                }
                setConfirmModal(null);
              }}
            >
              {confirmModal.type === "retry-all"
                ? "Confirmar retry"
                : confirmModal.type === "delete-all"
                ? "Confirmar descarte"
                : "Descartar"}
            </NotchButton>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
