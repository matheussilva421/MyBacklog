import { Activity, Clock3, Flame, Gamepad2, ListTodo, Monitor, Target, Trophy } from "lucide-react";
import { DonutChart, TrendLineChart } from "../../../charts";
import type { Game, PiePoint, PlannerEntry } from "../../../backlog/shared";
import { pieColors } from "../../../backlog/shared";
import {
  ChartFrame,
  EmptyState,
  MetricCard,
  NotchButton,
  Panel,
  Pill,
  ProgressBar,
  SectionHeader,
} from "../../../components/cyberpunk-ui";

type Stats = {
  total: number;
  backlog: number;
  playing: number;
  finished: number;
  hours: number;
};

type LinePoint = {
  month: string;
  finished: number;
  started: number;
};

type DashboardScreenProps = {
  stats: Stats;
  monthlyProgress: LinePoint[];
  platformData: PiePoint[];
  continuePlayingGames: Game[];
  visiblePlannerQueue: PlannerEntry[];
  findGame: (id: number) => Game | undefined;
  onOpenLibrary: (gameId?: number) => void;
  onOpenPlanner: () => void;
};

export function DashboardScreen({
  stats,
  monthlyProgress,
  platformData,
  continuePlayingGames,
  visiblePlannerQueue,
  findGame,
  onOpenLibrary,
  onOpenPlanner,
}: DashboardScreenProps) {
  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <MetricCard
          title="Total na biblioteca"
          value={String(stats.total)}
          hint="Entre PC, consoles e wishlist"
          delta="+8 este mês"
          icon={Gamepad2}
        />
        <MetricCard
          title="No backlog"
          value={String(stats.backlog)}
          hint="Ainda não iniciados"
          delta="-3 na semana"
          icon={ListTodo}
        />
        <MetricCard
          title="Jogando agora"
          value={String(stats.playing)}
          hint="Fluxo atual"
          delta="2 ativos"
          icon={Flame}
        />
        <MetricCard
          title="Finalizados"
          value={String(stats.finished)}
          hint="Histórico consolidado"
          delta="31% de conclusão"
          icon={Trophy}
        />
        <MetricCard
          title="Horas registradas"
          value={`${stats.hours}h`}
          hint="Telemetria manual"
          delta="+17h em 7 dias"
          icon={Clock3}
        />
      </div>

      <div className="dashboard-grid dashboard-grid--top">
        <Panel>
          <SectionHeader
            icon={Activity}
            title="Evolução do ano"
            description="Jogos iniciados vs. finalizados por mês"
          />
          <ChartFrame className="chart-area--line">
            {({ width, height }) => <TrendLineChart width={width} height={height} data={monthlyProgress} />}
          </ChartFrame>
        </Panel>

        <Panel>
          <SectionHeader icon={Monitor} title="Plataformas" description="Distribuição da sua coleção" />
          <ChartFrame className="chart-area--pie">
            {({ width, height }) => <DonutChart width={width} height={height} data={platformData} colors={pieColors} />}
          </ChartFrame>
          <div className="legend-grid">
            {platformData.map((entry, index) => (
              <div className="legend-item" key={entry.name}>
                <span
                  className="legend-item__dot"
                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                />
                <span>{entry.name}</span>
                <strong>{entry.value}%</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid--bottom">
        <Panel>
          <SectionHeader
            icon={Gamepad2}
            title="Continuar jogando"
            description="Jogos ativos e pausados com alto retorno"
            action={
              <NotchButton variant="secondary" onClick={() => onOpenLibrary()}>
                Abrir biblioteca
              </NotchButton>
            }
          />
          <div className="continue-list">
            {continuePlayingGames.length === 0 ? (
              <EmptyState message="Nenhum jogo ativo corresponde à busca global." />
            ) : (
              continuePlayingGames.map((game) => (
                <article className="continue-card" key={game.id}>
                  <div className="continue-card__top">
                    <div>
                      <div className="continue-card__title-row">
                        <h3>{game.title}</h3>
                        <Pill tone="cyan">{game.status}</Pill>
                      </div>
                      <p>
                        {game.platform} • {game.genre}
                      </p>
                    </div>
                    <div className="continue-card__actions">
                      <Pill tone="magenta">{game.eta} restantes</Pill>
                      <NotchButton variant="primary" onClick={() => onOpenLibrary(game.id)}>
                        Detalhes
                      </NotchButton>
                    </div>
                  </div>
                  <div className="continue-card__progress">
                    <div className="continue-card__progress-head">
                      <span>Progresso</span>
                      <strong>{game.progress}%</strong>
                    </div>
                    <ProgressBar value={game.progress} tone="sunset" thin />
                  </div>
                </article>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionHeader icon={Target} title="Radar de prioridade" description="O sistema sugere sua fila ideal" />
          <div className="priority-stack">
            {visiblePlannerQueue.slice(0, 3).map((entry) => {
              const game = findGame(entry.gameId);
              if (!game) return null;

              return (
                <button
                  type="button"
                  className="priority-card"
                  key={entry.rank}
                  onClick={() => onOpenLibrary(game.id)}
                >
                  <div className="priority-card__head">
                    <span>Posição {entry.rank}</span>
                    <Pill tone="cyan">{entry.eta}</Pill>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{entry.reason}</p>
                </button>
              );
            })}
          </div>
          <NotchButton className="priority-button" variant="primary" onClick={onOpenPlanner}>
            Abrir planner
          </NotchButton>
        </Panel>
      </div>
    </div>
  );
}
