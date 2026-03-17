import { Binary, ChevronRight, FolderKanban, Target } from "lucide-react";
import type { Game, Goal, PlannerEntry, Rule } from "../../../backlog/shared";
import { cx } from "../../../backlog/shared";
import { EmptyState, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";

type PlannerScreenProps = {
  visiblePlannerQueue: PlannerEntry[];
  goalProgress: Goal[];
  systemRules: Rule[];
  findGame: (id: number) => Game | undefined;
  onOpenLibrary: (gameId?: number) => void;
};

export function PlannerScreen({
  visiblePlannerQueue,
  goalProgress,
  systemRules,
  findGame,
  onOpenLibrary,
}: PlannerScreenProps) {
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
                <button type="button" className="planner-card" key={entry.rank} onClick={() => onOpenLibrary(game.id)}>
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
          <SectionHeader icon={Target} title="Metas táticas" description="Pequenas vitórias para reduzir o acúmulo" />
          <div className="goal-stack">
            {goalProgress.map((goal) => (
              <div className="goal-row" key={goal.label}>
                <div className="goal-row__head">
                  <span>{goal.label}</span>
                  <strong>{goal.value}%</strong>
                </div>
                <ProgressBar value={goal.value} tone={goal.tone} thin />
              </div>
            ))}
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
