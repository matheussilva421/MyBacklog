import { BarChart3, CalendarDays, Clock3, Trophy } from "lucide-react";
import { VerticalBarChart } from "../charts";
import { formatDuration, type BarPoint, type Game } from "../backlog/shared";
import type { PlaySession } from "../types";
import { ChartFrame, EmptyState, Panel, Pill, SectionHeader } from "../components/cyberpunk-ui";

type StatsScreenProps = {
  durationBuckets: BarPoint[];
  visibleSessions: PlaySession[];
  findGame: (id: number) => Game | undefined;
};

export function StatsScreen({ durationBuckets, visibleSessions, findGame }: StatsScreenProps) {
  return (
    <div className="stats-layout">
      <Panel>
        <SectionHeader icon={BarChart3} title="Backlog por duração" description="Onde está o gargalo do seu acervo" />
        <ChartFrame className="chart-area--bar">
          {({ width, height }) => <VerticalBarChart width={width} height={height} data={durationBuckets} />}
        </ChartFrame>
      </Panel>

      <Panel>
        <SectionHeader icon={CalendarDays} title="Sessões recentes" description="Diário rápido de jogo" />
        <div className="session-list">
          {visibleSessions.length === 0 ? (
            <EmptyState message="Nenhuma sessão recente corresponde à busca global." />
          ) : (
            visibleSessions.map((entry) => {
              const game = findGame(entry.libraryEntryId);
              if (!game) return null;

              return (
                <article className="session-card" key={`${entry.libraryEntryId}-${entry.date}-${entry.durationMinutes}`}>
                  <div>
                    <div className="session-card__title">
                      <h3>{game.title}</h3>
                      <Pill tone="neutral">{game.platform}</Pill>
                    </div>
                    <p>{entry.note || "Sessão registrada no diário do sistema."}</p>
                  </div>
                  <div className="session-card__meta">
                    <span><Clock3 size={14} /> {formatDuration(entry.durationMinutes)}</span>
                    <span><Trophy size={14} /> {entry.completionPercent ?? game.progress}%</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
