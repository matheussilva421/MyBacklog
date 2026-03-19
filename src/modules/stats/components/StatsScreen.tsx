import { useState } from "react";
import { Activity, BarChart3, CalendarDays, Clock3, Monitor, Pencil, Trash2, Trophy } from "lucide-react";
import { DonutChart, VerticalBarChart } from "../../../charts";
import { formatDuration, pieColors, type BarPoint, type Game, type PiePoint } from "../../../backlog/shared";
import type { PlaySession } from "../../../core/types";
import {
  ChartFrame,
  EmptyState,
  NotchButton,
  Panel,
  Pill,
  SectionHeader,
} from "../../../components/cyberpunk-ui";

const SESSION_PAGE_SIZE = 30;

type StatsScreenProps = {
  durationBuckets: BarPoint[];
  monthlyHours: BarPoint[];
  platformData: PiePoint[];
  visibleSessions: PlaySession[];
  findGame: (id: number) => Game | undefined;
  onEditSession: (session: PlaySession) => void;
  onDeleteSession: (sessionId: number) => Promise<void>;
};

export function StatsScreen({
  durationBuckets,
  monthlyHours,
  platformData,
  visibleSessions,
  findGame,
  onEditSession,
  onDeleteSession,
}: StatsScreenProps) {
  const [visibleCount, setVisibleCount] = useState(SESSION_PAGE_SIZE);
  const displayedSessions = visibleSessions.slice(0, visibleCount);
  const hasMore = visibleCount < visibleSessions.length;

  return (
    <div className="stats-layout">
      <div className="dashboard-grid dashboard-grid--top">
        <Panel>
          <SectionHeader
            icon={Activity}
            title="Horas por mês"
            description="Evolução do tempo jogado nos últimos meses"
          />
          <ChartFrame className="chart-area--bar">
            {({ width, height }) => (
              <VerticalBarChart width={width} height={height} data={monthlyHours} color="#26d8ff" />
            )}
          </ChartFrame>
        </Panel>

        <Panel>
          <SectionHeader
            icon={Monitor}
            title="Plataformas"
            description="Distribuição da sua coleção"
          />
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
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          icon={BarChart3}
          title="Backlog por duração"
          description="Onde está o gargalo do seu acervo"
        />
        <ChartFrame className="chart-area--bar">
          {({ width, height }) => (
            <VerticalBarChart width={width} height={height} data={durationBuckets} />
          )}
        </ChartFrame>
      </Panel>

      <Panel>
        <SectionHeader
          icon={CalendarDays}
          title="Sessões recentes"
          description="Diário rápido de jogo"
        />
        <div className="session-list">
          {displayedSessions.length === 0 ? (
            <EmptyState message="Nenhuma sessão recente corresponde à busca global." />
          ) : (
            <>
              {displayedSessions.map((entry) => {
                const game = findGame(entry.libraryEntryId);
                if (!game) return null;

                return (
                  <article className="session-card" key={entry.id}>
                    <div>
                      <div className="session-card__title">
                        <h3>{game.title}</h3>
                        <Pill tone="neutral">{game.platform}</Pill>
                        <div className="session-card__actions">
                          <NotchButton variant="ghost" onClick={() => onEditSession(entry)}>
                            <Pencil size={12} />
                          </NotchButton>
                          <NotchButton
                            variant="ghost"
                            onClick={() => entry.id != null && onDeleteSession(entry.id)}
                          >
                            <Trash2 size={12} />
                          </NotchButton>
                        </div>
                      </div>
                      <p>{entry.note || "Sessão registrada no diário do sistema."}</p>
                    </div>
                    <div className="session-card__meta">
                      <span>
                        <Clock3 size={14} /> {formatDuration(entry.durationMinutes)}
                      </span>
                      <span>
                        <Trophy size={14} /> {entry.completionPercent ?? game.progress}%
                      </span>
                    </div>
                  </article>
                );
              })}
              {hasMore ? (
                <NotchButton
                  variant="secondary"
                  onClick={() => setVisibleCount((current) => current + SESSION_PAGE_SIZE)}
                >
                  Ver mais sessões ({visibleSessions.length - visibleCount} restantes)
                </NotchButton>
              ) : null}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
