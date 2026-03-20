import { useState } from "react";
import { PlatformDashboard } from "./PlatformDashboard";
import { PlatformList } from "./PlatformList";
import {
  Activity,
  BarChart3,
  Calendar,
  Clock3,
  FileText,
  Monitor,
  Pencil,
  Trash2,
  Trophy,
  Wrench,
} from "lucide-react";
import { DonutChart, VerticalBarChart } from "../../../charts";
import {
  formatDuration,
  pieColors,
  type BarPoint,
  type Game,
  type PiePoint,
  type Platform,
} from "../../../backlog/shared";
import type { ImportJob, PlaySession } from "../../../core/types";
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
  storeData: PiePoint[];
  platforms: Platform[];
  visibleSessions: PlaySession[];
  games: Game[];
  importJobs: ImportJob[];
  findGame: (id: number) => Game | undefined;
  onEditSession: (id: number) => void;
  onDeleteSession: (id: number) => void;
  onManagePlatforms?: () => void;
  onClearImportHistory?: () => void;
};

export function StatsScreen({
  durationBuckets,
  monthlyHours,
  platformData,
  storeData,
  platforms,
  visibleSessions,
  games,
  importJobs,
  findGame,
  onEditSession,
  onDeleteSession,
  onManagePlatforms,
  onClearImportHistory,
}: StatsScreenProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | string | null>(null);
  const [visibleCount, setVisibleCount] = useState(SESSION_PAGE_SIZE);
  const displayedSessions = visibleSessions.slice(0, visibleCount);
  const hasMore = visibleCount < visibleSessions.length;

  if (selectedPlatform) {
    return (
      <PlatformDashboard
        platform={selectedPlatform}
        games={games}
        onBack={() => setSelectedPlatform(null)}
      />
    );
  }

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
            <SectionHeader
              icon={Monitor}
              title="Distribuição"
              description="Sua biblioteca por hardware"
            />
            <NotchButton variant="ghost" onClick={onManagePlatforms} title="Configurar hardware">
              <Wrench size={16} />
            </NotchButton>
          </div>
          <ChartFrame className="chart-area--pie">
            {({ width, height }) => (
              <DonutChart width={width} height={height} data={platformData} colors={pieColors} />
            )}
          </ChartFrame>
        </Panel>

        <Panel>
          <SectionHeader
            icon={FileText}
            title="Stores"
            description="Distribuição estrutural por loja/origem"
          />
          <ChartFrame className="chart-area--pie">
            {({ width, height }) => (
              <DonutChart width={width} height={height} data={storeData} colors={pieColors} />
            )}
          </ChartFrame>
        </Panel>
      </div>

      <PlatformList platforms={platforms} games={games} onSelect={setSelectedPlatform} />

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
          <SectionHeader
            icon={FileText}
            title="Histórico de Importação"
            description="Registros de sincronização e carga externa"
          />
          {importJobs.length > 0 && (
            <NotchButton variant="ghost" onClick={onClearImportHistory} title="Limpar logs">
              <Trash2 size={16} />
            </NotchButton>
          )}
        </div>
        
        {importJobs.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", opacity: 0.5, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <p>Nenhum registro de importação encontrado.</p>
          </div>
        ) : (
          <div className="log-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {importJobs.slice(0, 5).map((job) => (
              <div key={job.id} style={{ padding: "1rem", backgroundColor: "rgba(255,255,255,0.03)", borderLeft: "2px solid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Pill tone={job.status === "completed" ? "emerald" : job.status === "failed" ? "magenta" : "cyan"}>
                      {job.source.toUpperCase()}
                    </Pill>
                    <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                      {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                    {job.totalItems != null ? (
                      <span>{job.processedItems ?? 0}/{job.totalItems} itens</span>
                    ) : (
                      <span>{job.status === "completed" ? "Sucesso" : "Falha"}</span>
                    )}
                  </div>
                </div>
                {job.summary && <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>{job.summary}</div>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader
          icon={Calendar}
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
                        <Pill tone="neutral">{(game.platforms ?? [game.platform]).join(", ")}</Pill>
                        <div className="session-card__actions">
                          <NotchButton variant="ghost" onClick={() => entry.id != null && onEditSession(entry.id)}>
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
