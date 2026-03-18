import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Clock3,
  FolderKanban,
  Heart,
  MessageSquareQuote,
  Pencil,
  Save,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import { formatDuration, priorityTone, statusTone } from "../../../backlog/shared";
import type { PlaySession } from "../../../core/types";
import { EmptyState, NotchButton, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";
import type { GamePageData } from "../utils/gamePageData";

type ReviewFormState = {
  score: string;
  recommend: "" | "yes" | "no";
  shortReview: string;
  longReview: string;
  pros: string;
  cons: string;
  hasSpoiler: boolean;
};

type GamePageScreenProps = {
  data: GamePageData;
  onBack: () => void;
  onOpenEdit: () => void;
  onOpenSession: (gameId?: number) => void;
  onEditSession: (session: PlaySession) => void;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onToggleFavorite: () => void;
  onSendToPlanner: () => void;
  onDelete: () => void;
  onSaveReview: (payload: ReviewFormState) => Promise<void>;
  onSaveTags: (value: string) => Promise<void>;
};

function createReviewFormState(data: GamePageData): ReviewFormState {
  return {
    score: data.review?.score != null ? String(data.review.score) : data.game.score > 0 ? String(data.game.score) : "",
    recommend: data.review?.recommend ?? "",
    shortReview: data.review?.shortReview ?? "",
    longReview: data.review?.longReview ?? "",
    pros: data.review?.pros ?? "",
    cons: data.review?.cons ?? "",
    hasSpoiler: Boolean(data.review?.hasSpoiler),
  };
}

export function GamePageScreen({
  data,
  onBack,
  onOpenEdit,
  onOpenSession,
  onEditSession,
  onDeleteSession,
  onToggleFavorite,
  onSendToPlanner,
  onDelete,
  onSaveReview,
  onSaveTags,
}: GamePageScreenProps) {
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(() => createReviewFormState(data));
  const [tagsValue, setTagsValue] = useState(() => data.tags.map((tag) => tag.name).join(", "));

  useEffect(() => {
    setReviewForm(createReviewFormState(data));
    setTagsValue(data.tags.map((tag) => tag.name).join(", "));
  }, [data]);

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSaveReview(reviewForm);
  };

  const handleTagsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSaveTags(tagsValue);
  };

  return (
    <div className="game-page-layout">
      <div className="game-page-column">
        <Panel>
          <SectionHeader
            icon={Sparkles}
            title={data.game.title}
            description="Página dedicada do jogo com relação do usuário, sessões e leitura tática."
            action={
              <div className="panel-toolbar">
                <NotchButton variant="ghost" onClick={onBack}>
                  <ArrowLeft size={14} />
                  Voltar
                </NotchButton>
                <NotchButton variant="secondary" onClick={onOpenEdit}>
                  <Pencil size={14} />
                  Editar
                </NotchButton>
                <NotchButton variant="ghost" onClick={onDelete}>
                  <Trash2 size={14} />
                  Excluir
                </NotchButton>
              </div>
            }
          />

          <div className="game-page-hero">
            <div className="game-page-hero__copy">
              <div className="game-page-hero__top">
                <span className="detail-panel__eyebrow">Instância ativa</span>
                <div className="detail-panel__badges">
                  <Pill tone={statusTone[data.game.status]}>{data.game.status}</Pill>
                  <Pill tone={priorityTone[data.game.priority]}>{data.game.priority}</Pill>
                  {data.record.libraryEntry.favorite ? <Pill tone="magenta">Favorito</Pill> : null}
                </div>
              </div>
              <p className="game-page-hero__meta">
                {data.game.platform} • {data.game.year} • {data.game.genre}
              </p>
              <p className="game-page-hero__description">{data.game.notes}</p>
            </div>

            <div className="game-page-stat-grid">
              <div className="detail-stat">
                <span>Progresso</span>
                <strong>{data.game.progress}%</strong>
              </div>
              <div className="detail-stat">
                <span>Horas</span>
                <strong>{data.game.hours}h</strong>
              </div>
              <div className="detail-stat">
                <span>ETA</span>
                <strong>{data.game.eta}</strong>
              </div>
              <div className="detail-stat">
                <span>Nota</span>
                <strong>{data.game.score > 0 ? data.game.score.toFixed(1) : "--"}</strong>
              </div>
              <div className="detail-stat">
                <span>Planner score</span>
                <strong>{data.plannerScore}</strong>
              </div>
              <div className="detail-stat">
                <span>Sessões</span>
                <strong>{data.totalSessions}</strong>
              </div>
            </div>
          </div>

          <div className="detail-progress">
            <div className="detail-progress__head">
              <span>Barra de avanço</span>
              <strong>{data.game.progress}%</strong>
            </div>
            <ProgressBar value={data.game.progress} tone="sunset" />
          </div>

          <div className="game-page-action-grid">
            <NotchButton variant="primary" onClick={() => onOpenSession(data.game.id)}>
              <Clock3 size={14} />
              Registrar sessão
            </NotchButton>
            <NotchButton variant="secondary" onClick={onSendToPlanner}>
              <FolderKanban size={14} />
              Priorizar no planner
            </NotchButton>
            <NotchButton variant="ghost" onClick={onToggleFavorite}>
              <Heart size={14} />
              {data.record.libraryEntry.favorite ? "Remover favorito" : "Favoritar"}
            </NotchButton>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={Clock3}
            title="Sessões"
            description="Histórico real de uso com duração média, último registro e notas de execução."
          />

          <div className="game-page-session-metrics">
            <div className="detail-stat">
              <span>Total de tempo</span>
              <strong>{formatDuration(data.totalSessionMinutes)}</strong>
            </div>
            <div className="detail-stat">
              <span>Duração média</span>
              <strong>{formatDuration(data.averageSessionMinutes)}</strong>
            </div>
            <div className="detail-stat">
              <span>Última sessão</span>
              <strong>{data.lastSession ? new Date(data.lastSession.date).toLocaleDateString("pt-BR") : "--"}</strong>
            </div>
          </div>

          <div className="session-list">
            {data.sessions.length === 0 ? (
              <EmptyState message="Nenhuma sessão registrada para este jogo ainda." />
            ) : (
              data.sessions.map((session) => (
                <article className="session-card" key={`${session.libraryEntryId}-${session.date}-${session.durationMinutes}`}>
                  <div>
                    <div className="session-card__title">
                      <h3>{new Date(session.date).toLocaleDateString("pt-BR")}</h3>
                      <Pill tone="neutral">{session.platform}</Pill>
                      <div className="session-card__actions">
                        <NotchButton variant="ghost" onClick={() => onEditSession(session)}>
                          <Pencil size={12} />
                        </NotchButton>
                        <NotchButton variant="ghost" onClick={() => session.id != null && onDeleteSession(session.id)}>
                          <Trash2 size={12} />
                        </NotchButton>
                      </div>
                    </div>
                    <p>{session.note || "Sessão registrada sem anotação adicional."}</p>
                  </div>
                  <div className="session-card__meta">
                    <span>
                      <Clock3 size={14} /> {formatDuration(session.durationMinutes)}
                    </span>
                    <span>{session.completionPercent ?? data.game.progress}%</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={MessageSquareQuote}
            title="Review e nota"
            description="Leitura pessoal do jogo, recomendação e observações persistidas na base local."
          />

          <form className="modal-form" onSubmit={handleReviewSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Nota pessoal</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={reviewForm.score}
                  onChange={(event) => setReviewForm((current) => ({ ...current, score: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Recomendação</span>
                <select
                  value={reviewForm.recommend}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      recommend: event.target.value as ReviewFormState["recommend"],
                    }))
                  }
                >
                  <option value="">Sem posição</option>
                  <option value="yes">Recomendo</option>
                  <option value="no">Não recomendo</option>
                </select>
              </label>
              <label className="field field--wide">
                <span>Resumo rápido</span>
                <textarea
                  rows={3}
                  value={reviewForm.shortReview}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, shortReview: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Prós</span>
                <textarea
                  rows={4}
                  value={reviewForm.pros}
                  onChange={(event) => setReviewForm((current) => ({ ...current, pros: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Contras</span>
                <textarea
                  rows={4}
                  value={reviewForm.cons}
                  onChange={(event) => setReviewForm((current) => ({ ...current, cons: event.target.value }))}
                />
              </label>
              <label className="field field--wide">
                <span>Review longa</span>
                <textarea
                  rows={6}
                  value={reviewForm.longReview}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, longReview: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="game-page-toggle">
              <input
                type="checkbox"
                checked={reviewForm.hasSpoiler}
                onChange={(event) =>
                  setReviewForm((current) => ({ ...current, hasSpoiler: event.target.checked }))
                }
              />
              <span>Marcar review como contendo spoiler</span>
            </label>

            <div className="modal-actions">
              <NotchButton variant="primary" type="submit">
                <Save size={14} />
                Salvar review
              </NotchButton>
            </div>
          </form>
        </Panel>
      </div>

      <div className="game-page-side">
        <Panel>
          <SectionHeader
            icon={FolderKanban}
            title="Leitura tática"
            description="Como o motor está interpretando este item hoje."
          />

          <div className="game-page-insights">
            <div className="detail-note">
              <span className="detail-note__eyebrow">Motivo do planner</span>
              <p>{data.plannerReason}</p>
            </div>
            <div className="detail-note">
              <span className="detail-note__eyebrow">Melhor encaixe</span>
              <p>{data.plannerFit}</p>
              <div className="detail-note__tags">
                <Pill tone="cyan">Mood: {data.game.mood}</Pill>
                <Pill tone="magenta">Dificuldade: {data.game.difficulty}</Pill>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={Tags}
            title="Tags e organização"
            description="Associações rápidas para listas, filtros e recortes pessoais."
          />

          <div className="game-page-tag-list">
            {data.tags.length === 0 ? (
              <EmptyState message="Nenhuma tag vinculada a este jogo." />
            ) : (
              data.tags.map((tag) => (
                <Pill key={tag.id ?? tag.name} tone="neutral">
                  {tag.name}
                </Pill>
              ))
            )}
          </div>

          <form className="modal-form" onSubmit={handleTagsSubmit}>
            <label className="field">
              <span>Tags separadas por vírgula</span>
              <textarea rows={4} value={tagsValue} onChange={(event) => setTagsValue(event.target.value)} />
            </label>
            <div className="modal-actions">
              <NotchButton variant="primary" type="submit">
                <Save size={14} />
                Salvar tags
              </NotchButton>
            </div>
          </form>
        </Panel>

        <Panel>
          <SectionHeader
            icon={Sparkles}
            title="Metas do sistema"
            description="Metas globais persistidas na base e refletidas para esta leitura."
          />

          <div className="goal-stack">
            {data.goals.length === 0 ? (
              <EmptyState message="Nenhuma meta persistida foi configurada ainda." />
            ) : (
              data.goals.map((goal) => (
                <div className="goal-row" key={goal.id}>
                  <div className="goal-row__head">
                    <span>{goal.label}</span>
                    <strong>{goal.currentLabel}</strong>
                  </div>
                  <ProgressBar value={goal.value} tone={goal.tone} thin />
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
