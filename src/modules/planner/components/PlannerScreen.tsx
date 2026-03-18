import { Binary, ChevronRight, FolderKanban, Pencil, Plus, Target, Trash2 } from "lucide-react";
import type { DbGoal, Game, Goal, PlannerEntry, Rule } from "../../../backlog/shared";
import { cx } from "../../../backlog/shared";
import { EmptyState, NotchButton, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";

type PlannerScreenProps = {
  visiblePlannerQueue: PlannerEntry[];
  goalProgress: Goal[];
  goalRows: DbGoal[];
  systemRules: Rule[];
  findGame: (id: number) => Game | undefined;
  onOpenGamePage: (gameId?: number) => void;
  onCreateGoal: () => void;
  onEditGoal: (goal: DbGoal) => void;
  onDeleteGoal: (goalId: number) => void;
};

const goalLabelMap: Record<string, string> = {
  finished: "Jogos concluídos",
  started: "Jogos iniciados",
  playtime: "Horas jogadas",
  backlog_reduction: "Redução de backlog",
};

const goalToneMap: Record<string, "sunset" | "cyan" | "violet" | "yellow"> = {
  finished: "sunset",
  started: "cyan",
  playtime: "violet",
  backlog_reduction: "yellow",
};

const periodLabelMap: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  total: "Total",
};

function formatGoalCurrent(goal: DbGoal): string {
  if (goal.type === "playtime") return `${goal.current}h / ${goal.target}h`;
  return `${goal.current} / ${goal.target}`;
}

export function PlannerScreen({
  visiblePlannerQueue,
  goalProgress,
  goalRows,
  systemRules,
  findGame,
  onOpenGamePage,
  onCreateGoal,
  onEditGoal,
  onDeleteGoal,
}: PlannerScreenProps) {
  const hasDbGoals = goalRows.length > 0;

  return (
    <div className="planner-layout">
      <Panel>
        <SectionHeader icon={FolderKanban} title="Backlog planner" description="Fila de execução, metas e inteligência de prioridade" />
        <div className="planner-list">
          {visiblePlannerQueue.length === 0 ? (
            <EmptyState message="Nenhuma recomendação encontrada para a busca atual." />
          ) : (
            visiblePlannerQueue.map((entry) => {
              const game = findGame(entry.gameId);
              if (!game) return null;

              return (
                <button type="button" className="planner-card" key={entry.rank} onClick={() => onOpenGamePage(game.id)}>
                  <div className="planner-card__slot">
                    <span>Slot</span>
                    <strong>{entry.rank}</strong>
                  </div>
                  <div className="planner-card__body">
                    <div className="planner-card__title-row">
                      <h3>{game.title}</h3>
                      <ChevronRight size={18} />
                    </div>
                    <p>{entry.reason}</p>
                    <div className="planner-card__tags">
                      <Pill tone="cyan">ETA {entry.eta}</Pill>
                      <Pill tone="neutral">{entry.fit}</Pill>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Panel>

      <div className="planner-side">
        <Panel>
          <SectionHeader
            icon={Target}
            title="Metas táticas"
            description={hasDbGoals ? "Metas persistidas na base local" : "Pequenas vitórias para reduzir o acúmulo"}
            action={
              <NotchButton variant="secondary" onClick={onCreateGoal}>
                <Plus size={14} />
                Nova meta
              </NotchButton>
            }
          />
          <div className="goal-stack">
            {hasDbGoals ? (
              goalRows.map((goal) => {
                const pct = Math.max(0, Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100)));
                return (
                  <div className="goal-row" key={goal.id}>
                    <div className="goal-row__head">
                      <span>{goalLabelMap[goal.type] ?? goal.type}</span>
                      <div className="goal-row__actions">
                        <Pill tone="neutral">{periodLabelMap[goal.period] ?? goal.period}</Pill>
                        <strong>{formatGoalCurrent(goal)}</strong>
                        <NotchButton variant="ghost" onClick={() => onEditGoal(goal)}>
                          <Pencil size={12} />
                        </NotchButton>
                        <NotchButton variant="ghost" onClick={() => goal.id != null && onDeleteGoal(goal.id)}>
                          <Trash2 size={12} />
                        </NotchButton>
                      </div>
                    </div>
                    <ProgressBar value={pct} tone={goalToneMap[goal.type] ?? "yellow"} thin />
                  </div>
                );
              })
            ) : (
              goalProgress.map((goal) => (
                <div className="goal-row" key={goal.label}>
                  <div className="goal-row__head">
                    <span>{goal.label}</span>
                    <strong>{goal.value}%</strong>
                  </div>
                  <ProgressBar value={goal.value} tone={goal.tone} thin />
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionHeader icon={Binary} title="Regras do motor" description="Como a fila está sendo priorizada" />
          <div className="rule-stack">
            {systemRules.map((rule) => (
              <div className={cx("rule-card", `rule-card--${rule.tone}`)} key={rule.text}>
                {rule.text}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
