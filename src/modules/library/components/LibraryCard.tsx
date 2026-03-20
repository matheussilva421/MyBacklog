import { ArrowUpRight, ImageIcon } from "lucide-react";
import { cx, statusTone, priorityTone, type Game } from "../../../backlog/shared";
import { Pill, ProgressBar } from "../../../components/cyberpunk-ui";
import React from "react";

type LibraryCardProps = {
  game: Game;
  isSelected: boolean;
  isActive: boolean;
  onSelectGame: (gameId: number) => void;
  onToggleSelection: (gameId: number) => void;
};

export const LibraryCard = React.memo(function LibraryCard({
  game,
  isSelected,
  isActive,
  onSelectGame,
  onToggleSelection,
}: LibraryCardProps) {
  const platforms = (game.platforms ?? [game.platform]).slice(0, 2).join(" • ");

  return (
    <article
      className={cx(
        "library-card-shell",
        isActive && "library-card-shell--active",
        isSelected && "library-card-shell--selected",
      )}
    >
      <div className="library-card__toolbar">
        <button
          type="button"
          className={cx("library-card__select", isSelected && "library-card__select--active")}
          onClick={() => onToggleSelection(game.id)}
          aria-pressed={isSelected}
          aria-label={isSelected ? `Remover ${game.title} da seleção` : `Selecionar ${game.title}`}
        >
          {isSelected ? "Selecionado" : "Selecionar"}
        </button>
        <span className="library-card__toolbar-meta">{platforms}</span>
      </div>

      <button
        type="button"
        className="library-card"
        onClick={() => onSelectGame(game.id)}
        aria-label={`Abrir ficha de ${game.title}`}
      >
        <div className="library-card__cover">
          {game.coverUrl ? (
            <img src={game.coverUrl} alt={`Capa de ${game.title}`} />
          ) : (
            <div className="library-card__cover-placeholder">
              <ImageIcon size={18} />
              <span>Sem capa</span>
            </div>
          )}
        </div>

        <div className="library-card__content">
          <div className="library-card__platform">
            <span>{game.platform}</span>
            <ArrowUpRight size={15} />
          </div>
          <h3>{game.title}</h3>
          <p className="library-card__genre">{game.genre}</p>
          <div className="library-card__chips">
            <Pill tone={statusTone[game.status]}>{game.status}</Pill>
            <Pill tone={priorityTone[game.priority]}>{game.priority}</Pill>
          </div>
          <div className="library-card__progress">
            <div className="library-card__progress-head">
              <span>Progresso</span>
              <strong>{game.progress}%</strong>
            </div>
            <ProgressBar value={game.progress} tone="cyan" thin />
          </div>
          <div className="library-card__metrics">
            <div>
              <span>Nota</span>
              <strong>{game.score.toFixed(1)}</strong>
            </div>
            <div>
              <span>Horas</span>
              <strong>{game.hours}h</strong>
            </div>
            <div>
              <span>ETA</span>
              <strong>{game.eta}</strong>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
});
