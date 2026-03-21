import type { FormEvent } from "react";
import { BarChart3, CalendarDays, Clock3, Pause, Pencil, Play, RotateCcw, Save, Timer, Trash2 } from "lucide-react";
import { VerticalBarChart } from "../../../charts";
import { cx, formatDuration, type Game, type Status } from "../../../backlog/shared";
import { getGamePlatforms, getGameStores } from "../../../backlog/structuredGameValues";
import { formatDatePtBr } from "../../../core/utils";
import type { PlaySession } from "../../../core/types";
import { ChartFrame, EmptyState, NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";
import { useSessionsScreenState } from "../hooks/useSessionsScreenState";
import type { SessionPeriod } from "../utils/sessionAnalytics";

const periodOptions: Array<{ value: SessionPeriod; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Tudo" },
];

const statusOptions: Array<{ value: Status | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "Jogando", label: "Jogando" },
  { value: "Pausado", label: "Pausado" },
  { value: "Backlog", label: "Backlog" },
  { value: "Terminado", label: "Terminado" },
  { value: "Wishlist", label: "Wishlist" },
];

type SessionsScreenProps = {
  games: Game[];
  sessions: PlaySession[];
  query: string;
  onQuickRegister: (payload: {
    libraryEntryId: number;
    date: string;
    durationMinutes: number;
    completionPercent?: number;
    mood?: string;
    note?: string;
  }) => Promise<void>;
  onEditSession: (session: PlaySession) => void;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onOpenGamePage: (gameId?: number) => void;
};

export function SessionsScreen({
  games,
  sessions,
  query,
  onQuickRegister,
  onEditSession,
  onDeleteSession,
  onOpenGamePage,
}: SessionsScreenProps) {
  const {
    period,
    setPeriod,
    platform,
    setPlatform,
    store,
    setStore,
    status,
    setStatus,
    platformOptions,
    storeOptions,
    draft,
    setDraft,
    filteredGroups,
    overview,
    monthlyHours,
    timerLabel,
    running,
    toggleTimer,
    resetTimer,
    useTimerValue,
    resetDraft,
  } = useSessionsScreenState({ games, sessions, query });
  const hasMonthlyHours = monthlyHours.some((entry) => entry.total > 0);

  const handleQuickSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const libraryEntryId = Number(draft.gameId);
    if (!libraryEntryId) return;

    await onQuickRegister({
      libraryEntryId,
      date: draft.date,
      durationMinutes: Number(draft.durationMinutes) || 0,
      completionPercent: draft.completionPercent ? Number(draft.completionPercent) : undefined,
      mood: draft.mood.trim() || undefined,
      note: draft.note.trim() || undefined,
    });
    resetDraft(libraryEntryId);
  };

  return (
    <div className="screen-stack">
      <div className="sessions-layout">
        <Panel>
          <SectionHeader
            icon={Timer}
            title="Registro rápido"
            description="Cadastre uma sessão com cronômetro opcional e alimente o sistema em tempo real."
          />

          <form className="modal-form" onSubmit={handleQuickSubmit}>
            <div className="sessions-console">
              <div className="sessions-console__timer">
                <div className="detail-stat">
                  <span>Timer ao vivo</span>
                  <strong>{timerLabel}</strong>
                </div>
                <div className="sessions-console__timer-actions">
                  <NotchButton variant={running ? "ghost" : "primary"} type="button" onClick={toggleTimer}>
                    {running ? <Pause size={14} /> : <Play size={14} />}
                    {running ? "Pausar" : "Iniciar"}
                  </NotchButton>
                  <NotchButton variant="secondary" type="button" onClick={useTimerValue}>
                    <Clock3 size={14} />
                    Usar timer
                  </NotchButton>
                  <NotchButton variant="ghost" type="button" onClick={resetTimer}>
                    <RotateCcw size={14} />
                    Resetar
                  </NotchButton>
                </div>
              </div>

              <div className="form-grid">
                <label className="field field--wide">
                  <span>Jogo</span>
                  <select
                    value={draft.gameId}
                    onChange={(event) => setDraft((current) => ({ ...current, gameId: event.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Data</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Duração (min)</span>
                  <input
                    type="number"
                    min="1"
                    value={draft.durationMinutes}
                    onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Progresso após a sessão</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={draft.completionPercent}
                    onChange={(event) => setDraft((current) => ({ ...current, completionPercent: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Mood</span>
                  <input
                    value={draft.mood}
                    onChange={(event) => setDraft((current) => ({ ...current, mood: event.target.value }))}
                  />
                </label>
                <label className="field field--wide">
                  <span>Nota rápida</span>
                  <textarea
                    rows={4}
                    value={draft.note}
                    onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <NotchButton variant="ghost" type="button" onClick={() => resetDraft()}>
                Limpar
              </NotchButton>
              <NotchButton variant="primary" type="submit">
                <Save size={14} />
                Registrar sessão
              </NotchButton>
            </div>
          </form>
        </Panel>

        <Panel>
          <SectionHeader
            icon={BarChart3}
            title="Pulso das sessões"
            description="Recorte operacional da telemetria mais recente do backlog."
          />

          <div className="game-page-stat-grid">
            <div className="detail-stat">
              <span>Sessões filtradas</span>
              <strong>{overview.totalSessions}</strong>
            </div>
            <div className="detail-stat">
              <span>Horas filtradas</span>
              <strong>{formatDuration(overview.totalMinutes)}</strong>
            </div>
            <div className="detail-stat">
              <span>Jogos ativos</span>
              <strong>{overview.activeGames}</strong>
            </div>
            <div className="detail-stat">
              <span>Média por sessão</span>
              <strong>{formatDuration(overview.averageMinutes)}</strong>
            </div>
            <div className="detail-stat">
              <span>Notas registradas</span>
              <strong>{overview.notedSessions}</strong>
            </div>
            <div className="detail-stat">
              <span>Consulta global</span>
              <strong>{query.trim() ? "Filtrada" : "Completa"}</strong>
            </div>
          </div>

          <div className="sessions-filters">
            <div className="filter-group">
              <span className="filter-group__label">Período</span>
              <div className="filter-bar">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`filter-chip ${period === option.value ? "filter-chip--active" : ""}`}
                    onClick={() => setPeriod(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sessions-filters__row">
              <label className="field">
                <span>Plataforma</span>
                <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                  {platformOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todas" : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Store</span>
                <select value={store} onChange={(event) => setStore(event.target.value)}>
                  {storeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todas" : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as Status | "all")}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {hasMonthlyHours ? (
            <ChartFrame className="chart-area--bar chart-area--sessions">
              {({ width, height }) => (
                <VerticalBarChart width={width} height={height} data={monthlyHours} color="#26d8ff" />
              )}
            </ChartFrame>
          ) : (
            <EmptyState message="O pulso das sessões aparece aqui quando houver histórico suficiente dentro do filtro atual." />
          )}
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          icon={CalendarDays}
          title="Histórico por jogo"
          description="Cada grupo mostra cadência, última sessão e notas do diário operacional."
        />

        <div className="session-history-stack">
          {filteredGroups.length === 0 ? (
            <EmptyState message="Nenhuma sessão corresponde aos filtros e à busca global." />
          ) : (
            filteredGroups.map((group) => (
              <article className="session-group" key={group.game.id}>
                <div className="session-group__head">
                  <div>
                    <button
                      type="button"
                      className="session-group__title"
                      onClick={() => onOpenGamePage(group.game.id)}
                    >
                      {group.game.title}
                    </button>
                    <p>
                      {getGamePlatforms(group.game).join(", ")} • {getGameStores(group.game).join(", ")} •{" "}
                      {group.game.status} • {group.sessions.length} sessões
                    </p>
                  </div>
                  <div className="session-group__meta">
                    <Pill tone={group.cadence.tone}>{group.cadence.label}</Pill>
                    <Pill tone="neutral">{formatDuration(group.totalMinutes)}</Pill>
                    {group.cadence.lastSessionAt ? (
                      <Pill tone="cyan">{formatDatePtBr(group.cadence.lastSessionAt)}</Pill>
                    ) : null}
                  </div>
                </div>

                <div className="session-group__insights">
                  <div className="detail-stat">
                    <span>Últimos 30 dias</span>
                    <strong>{group.cadence.sessions30d} sessões</strong>
                  </div>
                  <div className="detail-stat">
                    <span>Streak</span>
                    <strong>{group.cadence.streakWeeks} semana(s)</strong>
                  </div>
                  <div className="detail-stat">
                    <span>Dias ativos</span>
                    <strong>{group.cadence.activeDays30d}</strong>
                  </div>
                  <div className="detail-stat">
                    <span>Notas</span>
                    <strong>{group.noteCount}</strong>
                  </div>
                </div>

                <div className="session-list">
                  {group.sessions.slice(0, 6).map((session) => (
                    <article
                      className={cx("session-card", "app-card")}
                      key={session.id ?? `${session.libraryEntryId}-${session.date}-${session.durationMinutes}`}
                    >
                      <div>
                        <div className="session-card__title">
                          <h3>{formatDatePtBr(session.date)}</h3>
                          <Pill tone="neutral">{session.platform}</Pill>
                          <div className="session-card__actions">
                            <NotchButton variant="ghost" onClick={() => onEditSession(session)}>
                              <Pencil size={12} />
                            </NotchButton>
                            <NotchButton
                              variant="ghost"
                              onClick={() => session.id != null && onDeleteSession(session.id)}
                            >
                              <Trash2 size={12} />
                            </NotchButton>
                          </div>
                        </div>
                        <p>{session.note || "Sessão sem anotação rápida."}</p>
                      </div>
                      <div className="session-card__meta">
                        <span>
                          <Clock3 size={14} /> {formatDuration(session.durationMinutes)}
                        </span>
                        <span>{session.completionPercent ?? group.game.progress}%</span>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
