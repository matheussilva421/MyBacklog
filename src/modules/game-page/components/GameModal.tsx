import type { FormEvent } from "react";
import {
  gamePriorities,
  gameStatuses,
  type GameFormState,
} from "../../../backlog/shared";
import { Modal, NotchButton } from "../../../components/cyberpunk-ui";

export function GameModal({
  mode,
  form,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit" | null;
  form: GameFormState;
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
            <span>Gênero</span>
            <input value={form.genre} onChange={(event) => onChange("genre", event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => onChange("status", event.target.value as GameFormState["status"])}>
              {gameStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select value={form.priority} onChange={(event) => onChange("priority", event.target.value as GameFormState["priority"])}>
              {gamePriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
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
          <NotchButton variant="ghost" type="button" onClick={onClose}>Cancelar</NotchButton>
          <NotchButton variant="primary" type="submit">{mode === "edit" ? "Salvar alterações" : "Criar jogo"}</NotchButton>
        </div>
      </form>
    </Modal>
  );
}
