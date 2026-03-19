import type { ChangeEvent, FormEvent, MutableRefObject } from "react";
import { Download, Upload } from "lucide-react";
import {
  cx,
  gamePriorities,
  gameStatuses,
  goalPeriodOptions,
  goalTypeOptions,
  importSources,
  type Game,
  type GameFormState,
  type GoalFormState,
  type ImportPreviewAction,
  type ImportPreviewEntry,
  type ImportSource,
  type RestoreMode,
  type RestorePreview,
  type SessionFormState,
} from "../backlog/shared";
import { Modal, NotchButton, Pill } from "./cyberpunk-ui";

type ImportPreviewSummary = {
  create: number;
  update: number;
  ignore: number;
  fresh: number;
  existing: number;
  duplicates: number;
};

type RestorePreviewTotals = {
  create: number;
  update: number;
  skip: number;
};

export function GameModal({
  mode,
  form,
  submitting = false,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit" | null;
  form: GameFormState;
  submitting?: boolean;
  onChange: <K extends keyof GameFormState>(field: K, value: GameFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  if (!mode) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar jogo" : "Novo jogo"}
      description="Cadastro manual do catálogo com os campos principais do backlog."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field field--wide">
            <span>Título</span>
            <input value={form.title} onChange={(event) => onChange("title", event.target.value)} />
          </label>
          <label className="field">
            <span>Plataforma</span>
            <input value={form.platform} onChange={(event) => onChange("platform", event.target.value)} />
          </label>
          <label className="field">
            <span>Loja / fonte</span>
            <input value={form.sourceStore} onChange={(event) => onChange("sourceStore", event.target.value)} />
          </label>
          <label className="field">
            <span>Gênero</span>
            <input value={form.genre} onChange={(event) => onChange("genre", event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => onChange("status", event.target.value as GameFormState["status"])}>
              {gameStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select
              value={form.priority}
              onChange={(event) => onChange("priority", event.target.value as GameFormState["priority"])}
            >
              {gamePriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Progresso %</span>
            <input type="number" min="0" max="100" value={form.progress} onChange={(event) => onChange("progress", event.target.value)} />
          </label>
          <label className="field">
            <span>Horas</span>
            <input type="number" min="0" step="0.5" value={form.hours} onChange={(event) => onChange("hours", event.target.value)} />
          </label>
          <label className="field">
            <span>ETA</span>
            <input value={form.eta} onChange={(event) => onChange("eta", event.target.value)} />
          </label>
          <label className="field">
            <span>Nota</span>
            <input type="number" min="0" max="10" step="0.1" value={form.score} onChange={(event) => onChange("score", event.target.value)} />
          </label>
          <label className="field">
            <span>Ano</span>
            <input type="number" min="1980" max="2100" value={form.year} onChange={(event) => onChange("year", event.target.value)} />
          </label>
          <label className="field">
            <span>Mood</span>
            <input value={form.mood} onChange={(event) => onChange("mood", event.target.value)} />
          </label>
          <label className="field">
            <span>Dificuldade</span>
            <input value={form.difficulty} onChange={(event) => onChange("difficulty", event.target.value)} />
          </label>
          <label className="field field--wide">
            <span>Notas</span>
            <textarea rows={4} value={form.notes} onChange={(event) => onChange("notes", event.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {mode === "edit" ? "Salvar alterações" : "Criar jogo"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function ImportModal({
  open,
  source,
  text,
  fileName,
  preview,
  summary,
  fileInputRef,
  submitting = false,
  onSourceChange,
  onTextChange,
  onFileChange,
  onActionChange,
  onMatchChange,
  onGameChange,
  onRawgChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  source: ImportSource;
  text: string;
  fileName: string;
  preview: ImportPreviewEntry[] | null;
  summary: ImportPreviewSummary;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  submitting?: boolean;
  onSourceChange: (value: ImportSource) => void;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onActionChange: (entryId: string, action: ImportPreviewAction) => void;
  onMatchChange: (entryId: string, matchId: number | null) => void;
  onGameChange: (entryId: string, gameId: number | null) => void;
  onRawgChange: (entryId: string, rawgId: number | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Modal
      title="Importar biblioteca"
      description="Cole CSV ou JSON exportado de Steam, Playnite ou uma planilha genérica."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className={cx("form-grid", preview && "flow-hidden")}>
          <label className="field">
            <span>Origem</span>
            <select value={source} onChange={(event) => onSourceChange(event.target.value as ImportSource)}>
              {importSources.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Arquivo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="sr-only"
              onChange={onFileChange}
            />
            <div className="field__aux">
              <NotchButton type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Download size={14} />
                Carregar arquivo
              </NotchButton>
              <small>{fileName || "CSV, JSON ou TXT"}</small>
            </div>
          </div>
          <label className="field field--wide">
            <span>Conteúdo</span>
            <textarea
              rows={10}
              value={text}
              placeholder="Cole aqui o CSV ou JSON exportado..."
              onChange={(event) => onTextChange(event.target.value)}
            />
          </label>
        </div>

        {preview ? (
          <>
            <div className="preview-summary-grid">
              <article className="preview-summary-card">
                <span>Novos itens</span>
                <strong>{summary.fresh}</strong>
                <small>Entradas sem match local</small>
              </article>
              <article className="preview-summary-card">
                <span>Matches diretos</span>
                <strong>{summary.existing}</strong>
                <small>Itens que podem atualizar</small>
              </article>
              <article className="preview-summary-card">
                <span>Repetições no arquivo</span>
                <strong>{summary.duplicates}</strong>
                <small>Linhas consolidadas no preview</small>
              </article>
              <article className="preview-summary-card">
                <span>Aplicação atual</span>
                <strong>{summary.create + summary.update}</strong>
                <small>{summary.ignore} ignorados</small>
              </article>
            </div>

            <div className="preview-list">
              {preview.map((entry) => (
                <article className="preview-card" key={entry.id}>
                  <div className="preview-card__head">
                    <div>
                      <strong>{entry.payload.title}</strong>
                      <span>
                        {entry.payload.platform} • {entry.payload.sourceStore}
                      </span>
                    </div>
                    <label className="field preview-card__field">
                      <span>Ação</span>
                      <select
                        value={entry.action}
                        onChange={(event) => onActionChange(entry.id, event.target.value as ImportPreviewAction)}
                      >
                        <option value="create">Criar</option>
                        <option value="update">Atualizar</option>
                        <option value="ignore">Ignorar</option>
                      </select>
                    </label>
                  </div>

                  <p>
                    {entry.status === "existing"
                      ? `Match encontrado no catálogo: ${entry.existingTitle}`
                      : entry.status === "review"
                        ? "Há conflitos locais ou oportunidades de vínculo/enriquecimento. Revise antes de aplicar."
                        : "Novo item pronto para entrar na biblioteca."}
                  </p>

                  {entry.reviewReasons.length > 0 ? (
                    <div className="detail-note__tags">
                      {entry.reviewReasons.map((reason) => (
                        <Pill key={`${entry.id}-${reason}`} tone="neutral">
                          {reason}
                        </Pill>
                      ))}
                    </div>
                  ) : null}

                  {entry.matchCandidates.length > 0 ? (
                    <label className="field preview-card__field preview-card__field--wide">
                      <span>Atualizar LibraryEntry existente</span>
                      <select
                        value={entry.selectedMatchId ?? ""}
                        onChange={(event) =>
                          onMatchChange(entry.id, event.target.value ? Number(event.target.value) : null)
                        }
                      >
                        <option value="">Criar nova LibraryEntry</option>
                        {entry.matchCandidates.map((candidate) => (
                          <option key={`${candidate.entryId}-${candidate.platform}`} value={candidate.entryId}>
                            {candidate.title} • {candidate.platform} • {candidate.sourceStore}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {entry.gameCandidates.length > 0 ? (
                    <label className="field preview-card__field preview-card__field--wide">
                      <span>Vincular ao Game existente</span>
                      <select
                        value={entry.selectedGameId ?? ""}
                        onChange={(event) =>
                          onGameChange(entry.id, event.target.value ? Number(event.target.value) : null)
                        }
                      >
                        <option value="">Criar Game novo</option>
                        {entry.gameCandidates.map((candidate) => (
                          <option key={`${entry.id}-game-${candidate.gameId}`} value={candidate.gameId}>
                            {candidate.title}
                            {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                            {candidate.platforms.length > 0 ? ` • ${candidate.platforms.join(", ")}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {entry.rawgCandidates.length > 0 ? (
                    <label className="field preview-card__field preview-card__field--wide">
                      <span>Enriquecimento RAWG</span>
                      <select
                        value={entry.selectedRawgId ?? ""}
                        onChange={(event) =>
                          onRawgChange(entry.id, event.target.value ? Number(event.target.value) : null)
                        }
                      >
                        <option value="">Sem enriquecimento</option>
                        {entry.rawgCandidates.map((candidate) => (
                          <option key={candidate.rawgId} value={candidate.rawgId}>
                            {candidate.title}
                            {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                            {candidate.platforms.length > 0 ? ` • ${candidate.platforms.join(", ")}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : entry.enrichmentStatus === "missing" ? (
                    <p className="preview-card__hint">Nenhum candidato RAWG confiável foi encontrado para este item.</p>
                  ) : null}

                  <div className="preview-card__meta">
                    <Pill tone={entry.status === "new" ? "yellow" : entry.status === "review" ? "cyan" : "magenta"}>
                      {entry.status === "new" ? "Novo" : entry.status === "review" ? "Conflito" : "Duplicado"}
                    </Pill>
                    {entry.duplicateCount > 0 ? <Pill tone="neutral">+{entry.duplicateCount} repetições</Pill> : null}
                    {entry.selectedGameId ? <Pill tone="yellow">Game vinculado</Pill> : null}
                    {entry.selectedRawgId ? <Pill tone="cyan">RAWG ativo</Pill> : null}
                    <Pill tone={entry.action === "ignore" ? "neutral" : entry.action === "update" ? "magenta" : "cyan"}>
                      {entry.action === "create" ? "Criar" : entry.action === "update" ? "Atualizar" : "Ignorar"}
                    </Pill>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {preview ? "Aplicar importação" : "Gerar preview"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function RestoreModal({
  open,
  mode,
  text,
  fileName,
  preview,
  totals,
  fileInputRef,
  submitting = false,
  onModeChange,
  onTextChange,
  onFileChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: RestoreMode;
  text: string;
  fileName: string;
  preview: RestorePreview | null;
  totals: RestorePreviewTotals;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  submitting?: boolean;
  onModeChange: (value: RestoreMode) => void;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Modal
      title="Restaurar backup"
      description="Carregue um backup JSON do app e escolha entre mesclar ou substituir a base local."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className={cx("form-grid", preview && "flow-hidden")}>
          <label className="field">
            <span>Modo</span>
            <select value={mode} onChange={(event) => onModeChange(event.target.value as RestoreMode)}>
              <option value="merge">Mesclar com a base atual</option>
              <option value="replace">Substituir toda a base local</option>
            </select>
          </label>
          <div className="field">
            <span>Arquivo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt"
              className="sr-only"
              onChange={onFileChange}
            />
            <div className="field__aux">
              <NotchButton type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Carregar backup
              </NotchButton>
              <small>{fileName || "JSON exportado pelo app"}</small>
            </div>
          </div>
          <label className="field field--wide">
            <span>Backup JSON</span>
            <textarea
              rows={10}
              value={text}
              placeholder="Cole aqui o JSON de backup..."
              onChange={(event) => onTextChange(event.target.value)}
            />
          </label>
        </div>

        {preview ? (
          <>
            <div className="preview-summary-grid">
              <article className="preview-summary-card">
                <span>Modo</span>
                <strong>{preview.mode === "replace" ? "Replace" : "Merge"}</strong>
                <small>{new Date(preview.exportedAt).toLocaleString("pt-BR")}</small>
              </article>
              <article className="preview-summary-card">
                <span>Novos registros</span>
                <strong>{totals.create}</strong>
                <small>Itens que serão criados</small>
              </article>
              <article className="preview-summary-card">
                <span>Atualizações</span>
                <strong>{totals.update}</strong>
                <small>Itens existentes reaproveitados</small>
              </article>
              <article className="preview-summary-card">
                <span>Ignorados</span>
                <strong>{totals.skip}</strong>
                <small>Duplicados ou sem relação válida</small>
              </article>
            </div>

            <div className="preview-list preview-list--compact">
              {preview.items.map((item) => (
                <article className="preview-card preview-card--compact" key={item.label}>
                  <div className="preview-card__head">
                    <strong>{item.label}</strong>
                    <Pill tone="neutral">{item.create + item.update + item.skip} itens</Pill>
                  </div>
                  <div className="preview-card__stats">
                    <span>
                      Novo <strong>{item.create}</strong>
                    </span>
                    <span>
                      Atualizar <strong>{item.update}</strong>
                    </span>
                    <span>
                      Ignorar <strong>{item.skip}</strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="preview-hint">
            {mode === "replace"
              ? "Replace limpa a base local antes de restaurar tudo do arquivo."
              : "Merge reaproveita jogos existentes por título + plataforma e evita duplicar sessões."}
          </div>
        )}

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {preview ? (preview.mode === "replace" ? "Substituir base local" : "Aplicar restore") : "Gerar preview"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function SessionModal({
  open,
  mode = "create",
  form,
  libraryGames,
  submitting = false,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode?: "create" | "edit";
  form: SessionFormState;
  libraryGames: Game[];
  submitting?: boolean;
  onChange: <K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar sessão" : "Registrar sessão"}
      description={
        mode === "edit"
          ? "Altere os dados desta sessão de jogo."
          : "Atualize o diário de jogo e alimente as estatísticas do sistema."
      }
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field field--wide">
            <span>Jogo</span>
            <select value={form.gameId} onChange={(event) => onChange("gameId", event.target.value)} disabled={mode === "edit"}>
              <option value="">Selecione...</option>
              {libraryGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Data</span>
            <input type="date" value={form.date} onChange={(event) => onChange("date", event.target.value)} />
          </label>
          <label className="field">
            <span>Duração (min)</span>
            <input type="number" min="1" value={form.durationMinutes} onChange={(event) => onChange("durationMinutes", event.target.value)} />
          </label>
          <label className="field">
            <span>Progresso após sessão</span>
            <input type="number" min="0" max="100" value={form.completionPercent} onChange={(event) => onChange("completionPercent", event.target.value)} />
          </label>
          <label className="field">
            <span>Mood</span>
            <input value={form.mood} onChange={(event) => onChange("mood", event.target.value)} />
          </label>
          <label className="field field--wide">
            <span>Nota rápida</span>
            <textarea rows={4} value={form.note} onChange={(event) => onChange("note", event.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {mode === "edit" ? "Salvar alterações" : "Salvar sessão"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function GoalModal({
  mode,
  form,
  submitting = false,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit" | null;
  form: GoalFormState;
  submitting?: boolean;
  onChange: <K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  if (!mode) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar meta" : "Nova meta"}
      description="Defina um objetivo para acompanhar seu progresso no backlog."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Tipo</span>
            <select value={form.type} onChange={(event) => onChange("type", event.target.value)}>
              {goalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Período</span>
            <select value={form.period} onChange={(event) => onChange("period", event.target.value)}>
              {goalPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Alvo</span>
            <input type="number" min="1" value={form.target} onChange={(event) => onChange("target", event.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {mode === "edit" ? "Salvar alterações" : "Criar meta"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}
