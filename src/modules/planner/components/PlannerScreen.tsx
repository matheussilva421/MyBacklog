import { Binary, ChevronRight, FolderKanban, Pencil, Plus, Target, Trash2 } from "lucide-react";
import type { Game, Goal, PlannerEntry, Rule } from "../../../backlog/shared";
import { cx } from "../../../backlog/shared";
import { EmptyState, NotchButton, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";
import type { ResolvedGoalRow } from "../utils/goals";

type PlannerScreenProps = {
  visiblePlannerQueue: PlannerEntry[];
  goalProgress: Goal[];
  goalRows: ResolvedGoalRow[];
  systemRules: Rule[];
  findGame: (id: number) => Game | undefined;
  onOpenGamePage: (gameId?: number) => void;
  onCreateGoal: () => void;
  onEditGoal: (goal: ResolvedGoalRow) => void;
  onDeleteGoal: (goalId: number) => void;
};

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
                <button type="button" className={cx("planner-card", "app-card", "app-card--interactive")} key={entry.rank} onClick={() => onOpenGamePage(game.id)}>
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
            description={hasDbGoals ? "Metas persistidas e calculadas em tempo real" : "Pequenas vitórias para reduzir o acúmulo"}
            action={
              <NotchButton variant="secondary" onClick={onCreateGoal}>
                <Plus size={14} />
                Nova meta
              </NotchButton>
            }
          />
          <div className="goal-stack">
            {hasDbGoals ? (
              goalRows.map((goal) => (
                <div className="goal-row" key={goal.id}>
                  <div className="goal-row__head">
                    <span>{goal.label}</span>
                    <div className="goal-row__actions">
                      <Pill tone="neutral">{goal.periodLabel}</Pill>
                      <strong>{goal.currentLabel}</strong>
                      <NotchButton variant="ghost" onClick={() => onEditGoal(goal)}>
                        <Pencil size={12} />
                      </NotchButton>
                      <NotchButton variant="ghost" onClick={() => goal.id != null && onDeleteGoal(goal.id)}>
                        <Trash2 size={12} />
                      </NotchButton>
                    </div>
                  </div>
                  <ProgressBar value={goal.progressPercent} tone={goal.tone} thin />
                </div>
              ))
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
