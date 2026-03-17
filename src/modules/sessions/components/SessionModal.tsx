import type { FormEvent } from "react";
import type { Game, SessionFormState } from "../../../backlog/shared";
import { Modal, NotchButton } from "../../../components/cyberpunk-ui";

export function SessionModal({
  open,
  sessionForm,
  games,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  sessionForm: SessionFormState;
  games: Game[];
  onChange: <K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Modal
      title="Registrar sessão"
      description="Atualize o diário de jogo e alimente as estatísticas do sistema."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field field--wide">
            <span>Jogo</span>
            <select value={sessionForm.gameId} onChange={(event) => onChange("gameId", event.target.value)}>
              <option value="">Selecione...</option>
              {games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Data</span>
            <input type="date" value={sessionForm.date} onChange={(event) => onChange("date", event.target.value)} />
          </label>
          <label className="field">
            <span>Duração (min)</span>
            <input type="number" min="1" value={sessionForm.durationMinutes} onChange={(event) => onChange("durationMinutes", event.target.value)} />
          </label>
          <label className="field">
            <span>Progresso após sessão</span>
            <input type="number" min="0" max="100" value={sessionForm.completionPercent} onChange={(event) => onChange("completionPercent", event.target.value)} />
          </label>
          <label className="field">
            <span>Mood</span>
            <input value={sessionForm.mood} onChange={(event) => onChange("mood", event.target.value)} />
          </label>
          <label className="field field--wide">
            <span>Nota rápida</span>
            <textarea rows={4} value={sessionForm.note} onChange={(event) => onChange("note", event.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={onClose}>Cancelar</NotchButton>
          <NotchButton variant="primary" type="submit">Salvar sessão</NotchButton>
        </div>
      </form>
    </Modal>
  );
}
