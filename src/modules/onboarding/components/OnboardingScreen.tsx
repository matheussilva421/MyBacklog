import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Cpu, Flag, ListChecks, Rocket } from "lucide-react";
import { NotchButton, Panel, Pill, SectionHeader, Tag } from "../../../components/cyberpunk-ui";
import { PreferencesFields } from "../../settings/components/PreferencesFields";
import type { PreferencesDraft } from "../../settings/utils/preferences";
import { onboardingGoalTemplates, suggestedStarterLists, toggleTokenInText } from "../../settings/utils/preferences";

type OnboardingScreenProps = {
  initialDraft: PreferencesDraft;
  initialLists: string[];
  initialGoalIds: string[];
  notice?: string | null;
  submitting: boolean;
  onSubmit: (payload: { draft: PreferencesDraft; starterLists: string[]; goalTemplateIds: string[] }) => Promise<void>;
};

export function OnboardingScreen({
  initialDraft,
  initialLists,
  initialGoalIds,
  notice,
  submitting,
  onSubmit,
}: OnboardingScreenProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [starterListsText, setStarterListsText] = useState(initialLists.join(", "));
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(initialGoalIds);

  const selectedLists = useMemo(
    () =>
      Array.from(
        new Set(
          starterListsText
            .split(/[,\n]/)
            .map((token) => token.trim())
            .filter(Boolean),
        ),
      ),
    [starterListsText],
  );

  const toggleStarterList = (listName: string) => {
    setStarterListsText((current) => toggleTokenInText(current, listName));
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((current) =>
      current.includes(goalId) ? current.filter((item) => item !== goalId) : [...current, goalId],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      draft,
      starterLists: selectedLists,
      goalTemplateIds: selectedGoalIds,
    });
  };

  return (
    <div className="onboarding-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="onboarding-frame">
        <Panel className="onboarding-panel">
          <div className="hero-panel__badges">
            <Tag>Backlog OS</Tag>
            <Tag tone="cyan">Primeira configuração</Tag>
            <Tag tone="magenta">Neural setup</Tag>
          </div>

          <div className="hero-panel__headline hero-panel__headline--onboarding">
            <div className="hero-panel__icon">
              <Rocket size={25} />
            </div>
            <div>
              <span className="hero-panel__eyebrow">Onboarding real</span>
              <h2>
                Configure o <span>seu operador</span>
              </h2>
              <p>
                Defina plataformas, lojas, listas iniciais, metas táticas e uma chave RAWG opcional. Esses defaults
                passam a influenciar criação, importação e o planner.
              </p>
            </div>
          </div>

          {notice ? (
            <div className="system-banner">
              <span>{notice}</span>
            </div>
          ) : null}

          <form className="modal-form" onSubmit={handleSubmit}>
            <Panel className="onboarding-subpanel">
              <SectionHeader
                icon={Cpu}
                title="Perfil base"
                description="Preferências persistidas desde o primeiro uso do app."
              />
              <PreferencesFields
                draft={draft}
                onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
              />
            </Panel>

            <div className="onboarding-grid">
              <Panel className="onboarding-subpanel">
                <SectionHeader
                  icon={ListChecks}
                  title="Listas iniciais sugeridas"
                  description="Escolha coleções para já começar a organizar sua biblioteca."
                />
                <div className="preference-chip-row">
                  {suggestedStarterLists.map((listName) => (
                    <button
                      key={listName}
                      type="button"
                      className={`filter-chip ${selectedLists.includes(listName) ? "filter-chip--active" : ""}`}
                      onClick={() => toggleStarterList(listName)}
                    >
                      {listName}
                    </button>
                  ))}
                </div>
                <label className="field field--wide">
                  <span>Listas personalizadas</span>
                  <textarea
                    rows={4}
                    value={starterListsText}
                    onChange={(event) => setStarterListsText(event.target.value)}
                    placeholder="Separadas por vírgula. Ex.: Roguelikes, Coop, Campanhas longas"
                  />
                </label>
              </Panel>

              <Panel className="onboarding-subpanel">
                <SectionHeader
                  icon={Flag}
                  title="Metas iniciais opcionais"
                  description="Ative objetivos que já alimentam o scoring do planner."
                />
                <div className="onboarding-goal-stack">
                  {onboardingGoalTemplates.map((goal) => {
                    const active = selectedGoalIds.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        className={`onboarding-goal-card ${active ? "onboarding-goal-card--active" : ""}`}
                        onClick={() => toggleGoal(goal.id)}
                      >
                        <div className="onboarding-goal-card__head">
                          <strong>{goal.label}</strong>
                          {active ? <CheckCircle2 size={16} /> : null}
                        </div>
                        <p>{goal.description}</p>
                        <div className="detail-note__tags">
                          <Pill tone="neutral">{goal.period === "monthly" ? "Mensal" : "Anual"}</Pill>
                          <Pill tone="cyan">Alvo {goal.target}</Pill>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </div>

            <div className="modal-actions">
              <NotchButton variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Aplicando configuração..." : "Iniciar backlog"}
              </NotchButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
