import { useEffect, useState } from "react";
import { CheckCircle2, List, Plus, Save, Settings, User } from "lucide-react";
import type { DbList, UserBadge } from "../../../backlog/shared";
import {
  createPreferencesDraft,
  cx,
  type AppPreferences,
  type PreferencesDraft,
} from "../../../backlog/shared";
import {
  EmptyState,
  NotchButton,
  Panel,
  Pill,
  ProgressBar,
  SectionHeader,
} from "../../../components/cyberpunk-ui";
import { PreferencesFields } from "./PreferencesFields";

type ProfileScreenProps = {
  personalBadges: UserBadge[];
  totalGames: number;
  totalHours: number;
  preferences: AppPreferences;
  listRows: DbList[];
  onPreferencesSave: (draft: PreferencesDraft) => Promise<void>;
  onListCreate: (name: string) => Promise<void>;
  onListDelete: (listId: number) => Promise<void>;
};

export function ProfileScreen({
  personalBadges,
  totalGames,
  totalHours,
  preferences,
  listRows,
  onPreferencesSave,
  onListCreate,
  onListDelete,
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
        <SectionHeader
          icon={User}
          title="Perfil"
          description="Sua camada pessoal dentro do backlog OS"
        />
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
          description="Preferências reais que afetam criação, importação e planner"
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
          icon={List}
          title="Listas"
          description="Organize jogos em coleções personalizadas"
        />
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
          description="Badges operacionais que gamificam sua disciplina no catálogo."
        />
        <div className="badge-grid">
          {personalBadges.map((badge) => {
            const Icon = badge.icon;
            const progressPercent =
              badge.target > 0 ? Math.max(0, Math.min(100, (badge.progress / badge.target) * 100)) : 0;

            return (
              <article
                className={cx("badge-card", !badge.unlocked && "badge-card--locked")}
                key={badge.key}
              >
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
