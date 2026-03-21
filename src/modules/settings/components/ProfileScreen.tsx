import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, List, Plus, Save, Settings, ShieldAlert, User, Wrench } from "lucide-react";
import type { DbList, UserBadge } from "../../../backlog/shared";
import { createPreferencesDraft, cx, type AppPreferences, type PreferencesDraft } from "../../../backlog/shared";
import { EmptyState, NotchButton, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";
import type { CatalogAuditReport } from "../utils/catalogAudit";
import { PreferencesFields } from "./PreferencesFields";

type ProfileScreenProps = {
  personalBadges: UserBadge[];
  totalGames: number;
  totalHours: number;
  preferences: AppPreferences;
  listRows: DbList[];
  catalogAuditReport: CatalogAuditReport;
  onPreferencesSave: (draft: PreferencesDraft) => Promise<void>;
  onListCreate: (name: string) => Promise<void>;
  onListDelete: (listId: number) => Promise<void>;
  onRepairCatalog: () => Promise<void>;
  onOpenMaintenance: () => void;
  onOpenGuidedTour: () => void;
};

export function ProfileScreen({
  personalBadges,
  totalGames,
  totalHours,
  preferences,
  listRows,
  catalogAuditReport,
  onPreferencesSave,
  onListCreate,
  onListDelete,
  onRepairCatalog,
  onOpenMaintenance,
  onOpenGuidedTour,
}: ProfileScreenProps) {
  const [draft, setDraft] = useState<PreferencesDraft>(() => createPreferencesDraft(preferences));
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    setDraft(createPreferencesDraft(preferences));
  }, [preferences]);

  const handlePreferencesSubmit = async () => {
    await onPreferencesSave(draft);
  };

  const handleListAdd = async () => {
    if (!newListName.trim()) return;
    await onListCreate(newListName);
    setNewListName("");
  };

  return (
    <div className="profile-layout">
      <Panel>
        <SectionHeader icon={User} title="Perfil" description="Sua camada pessoal dentro do backlog OS" />
        <div className="profile-card">
          <div className="profile-card__main">
            <span>Operador</span>
            <h3>{preferences.operatorName}</h3>
            <p>Curadoria agressiva de backlog, foco em catálogo, progresso e estatística pessoal.</p>
          </div>
          <div className="profile-card__meta">
            <div className="detail-stat">
              <span>Total de jogos</span>
              <strong>{totalGames}</strong>
            </div>
            <div className="detail-stat">
              <span>Horas registradas</span>
              <strong>{totalHours}h</strong>
            </div>
            <div className="detail-stat">
              <span>Plataformas base</span>
              <strong>{preferences.primaryPlatforms.join(", ") || "--"}</strong>
            </div>
            <div className="detail-stat">
              <span>Planner</span>
              <strong>{preferences.plannerPreference.replace(/_/g, " ")}</strong>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={Settings}
          title="Configurações"
          description="Preferências que afetam criação, importação e planner"
          action={
            <NotchButton variant="secondary" onClick={onOpenGuidedTour}>
              <Wrench size={14} />
              Rever tutorial
            </NotchButton>
          }
        />
        <div className="modal-form">
          <PreferencesFields
            draft={draft}
            onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          />
          <div className="modal-actions">
            <NotchButton variant="primary" onClick={handlePreferencesSubmit}>
              <Save size={14} />
              Salvar preferências
            </NotchButton>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={ShieldAlert}
          title="Auditoria do catálogo"
          description="Integridade da base local entre progresso, status, sessões e metadado"
          action={
            <div className="panel-toolbar">
              <NotchButton
                variant={catalogAuditReport.summary.repairableIssues > 0 ? "primary" : "secondary"}
                onClick={onRepairCatalog}
                disabled={catalogAuditReport.summary.repairableIssues === 0}
              >
                Reparar catálogo
              </NotchButton>
              <NotchButton variant="secondary" onClick={onOpenMaintenance}>
                <Wrench size={14} />
                Abrir manutenção
              </NotchButton>
            </div>
          }
        />

        <div className="catalog-audit-summary">
          <div className="detail-stat">
            <span>Total de achados</span>
            <strong>{catalogAuditReport.summary.totalIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Reparáveis</span>
            <strong>{catalogAuditReport.summary.repairableIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Sessões órfãs</span>
            <strong>{catalogAuditReport.summary.orphanSessions}</strong>
          </div>
          <div className="detail-stat">
            <span>Metadado incompleto</span>
            <strong>{catalogAuditReport.summary.metadataIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Horas divergentes</span>
            <strong>{catalogAuditReport.summary.playtimeIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Progresso x status</span>
            <strong>{catalogAuditReport.summary.progressIssues}</strong>
          </div>
        </div>

        <div className="audit-list">
          {catalogAuditReport.issues.length === 0 ? (
            <EmptyState message="Nenhuma inconsistência encontrada no catálogo." />
          ) : (
            catalogAuditReport.issues.map((issue) => (
              <article className={cx("audit-card", "app-card")} key={issue.id}>
                <div className="audit-card__head">
                  <div className="audit-card__title">
                    {issue.repairable ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                    <h3>{issue.title}</h3>
                  </div>
                  <Pill tone={issue.tone}>{issue.repairable ? "Reparo automático" : "Revisão manual"}</Pill>
                </div>
                <p>{issue.description}</p>
                {issue.missingFields?.length ? (
                  <div className="detail-note__tags">
                    {issue.missingFields.map((field) => (
                      <Pill key={`${issue.id}-${field}`} tone="neutral">
                        {field}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={List} title="Listas" description="Organize jogos em coleções personalizadas" />
        <div className="modal-form">
          <div className="form-grid">
            <label className="field field--wide">
              <span>Nova lista</span>
              <div className="field__aux">
                <input
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  placeholder="Nome da lista..."
                />
                <NotchButton variant="secondary" onClick={handleListAdd}>
                  <Plus size={14} />
                  Criar
                </NotchButton>
              </div>
            </label>
          </div>
        </div>
        <div className="list-stack">
          {listRows.length === 0 ? (
            <EmptyState message="Nenhuma lista criada ainda." />
          ) : (
            listRows.map((list) => (
              <div className="list-row" key={list.id}>
                <div className="list-row__info">
                  <strong>{list.name}</strong>
                  <Pill tone="neutral">{new Date(list.createdAt).toLocaleDateString("pt-BR")}</Pill>
                </div>
                <NotchButton variant="ghost" onClick={() => list.id != null && onListDelete(list.id)}>
                  Excluir
                </NotchButton>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={CheckCircle2}
          title="Conquistas pessoais"
          description="Badges operacionais que gamificam sua disciplina no catálogo"
        />
        <div className="badge-grid">
          {personalBadges.map((badge) => {
            const Icon = badge.icon;
            const progressPercent =
              badge.target > 0 ? Math.max(0, Math.min(100, (badge.progress / badge.target) * 100)) : 0;

            return (
              <article className={cx("badge-card", !badge.unlocked && "badge-card--locked")} key={badge.key}>
                <div className="badge-card__head">
                  <div className="badge-card__title">
                    <Icon size={18} />
                    <h3>{badge.title}</h3>
                  </div>
                  <Pill tone={badge.unlocked ? badge.tone : "neutral"}>
                    {badge.unlocked ? "Desbloqueado" : "Em progresso"}
                  </Pill>
                </div>
                <p>{badge.description}</p>
                <div className="badge-card__progress">
                  <span>{badge.progressLabel}</span>
                  <ProgressBar value={progressPercent} tone={badge.unlocked ? "yellow" : "cyan"} thin />
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
