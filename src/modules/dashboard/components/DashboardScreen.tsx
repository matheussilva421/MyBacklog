import {
  Activity,
  Clock3,
  Flame,
  Gamepad2,
  LibraryBig,
  ListTodo,
  Monitor,
  Target,
  Trophy,
} from "lucide-react";
import { DonutChart, TrendLineChart } from "../../../charts";
import {
  formatRemainingEta,
  pieColors,
  type Game,
  type MonthlyRecap,
  type PiePoint,
  type PlannerEntry,
  type UserBadge,
} from "../../../backlog/shared";
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
  totalDelta: string;
  backlogDelta: string;
  playingDelta: string;
  finishedDelta: string;
  hoursDelta: string;
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
  storeData: PiePoint[];
  continuePlayingGames: Game[];
  visiblePlannerQueue: PlannerEntry[];
  personalBadges: UserBadge[];
  monthlyRecap: MonthlyRecap;
  findGame: (id: number) => Game | undefined;
  onOpenLibrary: (gameId?: number) => void;
  onOpenGamePage: (gameId?: number) => void;
  onOpenPlanner: () => void;
};

export function DashboardScreen({
  stats,
  monthlyProgress,
  platformData,
  storeData,
  continuePlayingGames,
  visiblePlannerQueue,
  personalBadges,
  monthlyRecap,
  findGame,
  onOpenLibrary,
  onOpenGamePage,
  onOpenPlanner,
}: DashboardScreenProps) {
  const hasMonthlyProgress = monthlyProgress.length > 0;
  const hasPlatformData = platformData.some((entry) => entry.value > 0);
  const hasStoreData = storeData.some((entry) => entry.value > 0);

  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <MetricCard
          title="Total na biblioteca"
          value={String(stats.total)}
          hint="Entre PC, consoles e wishlist"
          delta={stats.totalDelta}
          icon={Gamepad2}
        />
        <MetricCard
          title="No backlog"
          value={String(stats.backlog)}
          hint="Ainda não iniciados"
          delta={stats.backlogDelta}
          icon={ListTodo}
        />
        <MetricCard
          title="Jogando agora"
          value={String(stats.playing)}
          hint="Fluxo atual"
          delta={stats.playingDelta}
          icon={Flame}
        />
        <MetricCard
          title="Finalizados"
          value={String(stats.finished)}
          hint="Histórico consolidado"
          delta={stats.finishedDelta}
          icon={Trophy}
        />
        <MetricCard
          title="Horas registradas"
          value={`${stats.hours}h`}
          hint="Telemetria manual"
          delta={stats.hoursDelta}
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
          {hasMonthlyProgress ? (
            <ChartFrame className="chart-area--line">
              {({ width, height }) => (
                <TrendLineChart width={width} height={height} data={monthlyProgress} />
              )}
            </ChartFrame>
          ) : (
            <EmptyState message="A evolução anual aparecerá aqui quando houver progresso registrado por mês." />
          )}
        </Panel>

        <Panel>
          <SectionHeader
            icon={Monitor}
            title="Plataformas"
            description="Distribuição estrutural da sua coleção"
          />
          {hasPlatformData ? (
            <>
              <ChartFrame className="chart-area--pie">
                {({ width, height }) => (
                  <DonutChart width={width} height={height} data={platformData} colors={pieColors} />
                )}
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
            </>
          ) : (
            <EmptyState message="A distribuição por plataforma aparece quando a biblioteca tiver relações estruturadas registradas." />
          )}
        </Panel>

        <Panel>
          <SectionHeader
            icon={LibraryBig}
            title="Stores"
            description="Onde sua biblioteca realmente está distribuída"
          />
          {hasStoreData ? (
            <>
              <ChartFrame className="chart-area--pie">
                {({ width, height }) => (
                  <DonutChart width={width} height={height} data={storeData} colors={pieColors} />
                )}
              </ChartFrame>
              <div className="legend-grid">
                {storeData.map((entry, index) => (
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
            </>
          ) : (
            <EmptyState message="As stores serão exibidas aqui quando o catálogo tiver origem estruturada suficiente." />
          )}
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
                        {(game.platforms ?? [game.platform]).join(", ")} • {game.genre}
                      </p>
                    </div>
                    <div className="continue-card__actions">
                      <Pill tone="magenta">
                        {formatRemainingEta(game.eta, game.progress, game.hours)}
                      </Pill>
                      <NotchButton variant="primary" onClick={() => onOpenGamePage(game.id)}>
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
          <SectionHeader
            icon={Target}
            title="Radar de prioridade"
            description="O sistema sugere sua fila ideal"
          />
          <div className="priority-stack">
            {visiblePlannerQueue.slice(0, 3).map((entry) => {
              const game = findGame(entry.gameId);
              if (!game) return null;

              return (
                <button
                  type="button"
                  className="priority-card"
                  key={entry.rank}
                  onClick={() => onOpenGamePage(game.id)}
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

      <div className="dashboard-grid dashboard-grid--extras">
        <Panel>
          <SectionHeader
            icon={LibraryBig}
            title={monthlyRecap.title}
            description={
              monthlyRecap.isMonthEnd
                ? `Fechamento oficial de ${monthlyRecap.periodLabel}`
                : `Parcial operacional de ${monthlyRecap.periodLabel}`
            }
          />
          <div className="recap-card">
            <p className="recap-card__summary">{monthlyRecap.summary}</p>
            <div className="recap-grid">
              <div className="detail-stat">
                <span>Tempo total</span>
                <strong>{monthlyRecap.totalHours}h</strong>
              </div>
              <div className="detail-stat">
                <span>Sessões</span>
                <strong>{monthlyRecap.totalSessions}</strong>
              </div>
              <div className="detail-stat">
                <span>Jogos ativos</span>
                <strong>{monthlyRecap.activeGames}</strong>
              </div>
              <div className="detail-stat">
                <span>Dias ativos</span>
                <strong>{monthlyRecap.activeDays}</strong>
              </div>
              <div className="detail-stat">
                <span>Jogo mais jogado</span>
                <strong>{monthlyRecap.topGameTitle ?? "--"}</strong>
              </div>
              <div className="detail-stat">
                <span>Horas do destaque</span>
                <strong>{monthlyRecap.topGameHours}h</strong>
              </div>
              <div className="detail-stat">
                <span>Zerados no mês</span>
                <strong>{monthlyRecap.completedGames}</strong>
              </div>
              <div className="detail-stat">
                <span>Novos registros</span>
                <strong>{monthlyRecap.addedGames}</strong>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={Trophy}
            title="Conquistas pessoais"
            description="Badges desbloqueados por ritmo real de uso e rigor no catálogo."
          />
          <div className="badge-grid">
            {personalBadges.map((badge) => {
              const Icon = badge.icon;
              const progressPercent =
                badge.target > 0 ? Math.max(0, Math.min(100, (badge.progress / badge.target) * 100)) : 0;

              return (
                <article
                  className={`badge-card ${badge.unlocked ? "" : "badge-card--locked"}`}
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
                    <div className="badge-card__progress-head">
                      <span>{badge.progressLabel}</span>
                    </div>
                    <ProgressBar value={progressPercent} tone={badge.unlocked ? "yellow" : "cyan"} thin />
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
