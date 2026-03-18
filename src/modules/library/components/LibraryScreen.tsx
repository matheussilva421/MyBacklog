import { ArrowUpRight, Download, FolderKanban, Gamepad2, Heart, Library, ListChecks, Plus, Upload } from "lucide-react";
import {
  cx,
  filterOptions,
  priorityTone,
  statusTone,
  type Game,
  type LibraryListFilter,
  type StatusFilter,
} from "../../../backlog/shared";
import type { DbList } from "../../../backlog/shared";
import { EmptyState, NotchButton, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";

type ListOption = {
  id: number;
  name: string;
  count: number;
};

type LibraryScreenProps = {
  libraryGames: Game[];
  selectedGame?: Game;
  selectedGameLists: DbList[];
  filter: StatusFilter;
  selectedListFilter: LibraryListFilter;
  listOptions: ListOption[];
  onFilterChange: (value: StatusFilter) => void;
  onListFilterChange: (value: LibraryListFilter) => void;
  onSelectGame: (gameId: number) => void;
  onExport: () => void;
  onBackupExport: () => void;
  onOpenRestore: () => void;
  onOpenCreate: () => void;
  onOpenEdit: () => void;
  onDeleteSelected: () => void;
  onResumeSelected: () => void;
  onFavoriteSelected: () => void;
  onOpenSession: (gameId?: number) => void;
  onOpenGamePage: (gameId?: number) => void;
  onSendSelectedToPlanner: () => void;
};

export function LibraryScreen({
  libraryGames,
  selectedGame,
  selectedGameLists,
  filter,
  selectedListFilter,
  listOptions,
  onFilterChange,
  onListFilterChange,
  onSelectGame,
  onExport,
  onBackupExport,
  onOpenRestore,
  onOpenCreate,
  onOpenEdit,
  onDeleteSelected,
  onResumeSelected,
  onFavoriteSelected,
  onOpenSession,
  onOpenGamePage,
  onSendSelectedToPlanner,
}: LibraryScreenProps) {
  return (
    <div className="library-layout">
      <Panel>
        <SectionHeader
          icon={Library}
          title="Biblioteca"
          description="Catálogo completo com filtros por status, listas e seleção rápida."
          action={
            <div className="panel-toolbar">
              <NotchButton variant="secondary" onClick={onExport}>
                <Download size={14} />
                Exportar CSV
              </NotchButton>
              <NotchButton variant="secondary" onClick={onBackupExport}>
                <Download size={14} />
                Backup JSON
              </NotchButton>
              <NotchButton variant="ghost" onClick={onOpenRestore}>
                <Upload size={14} />
                Restaurar
              </NotchButton>
              <NotchButton variant="primary" onClick={onOpenCreate}>
                <Plus size={14} />
                Adicionar
              </NotchButton>
            </div>
          }
        />

        <div className="filter-stack">
          <div className="filter-group">
            <span className="filter-group__label">Status</span>
            <div className="filter-bar">
              {filterOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={cx("filter-chip", filter === option && "filter-chip--active")}
                  onClick={() => onFilterChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Listas</span>
            <div className="filter-bar">
              <button
                type="button"
                className={cx("filter-chip", selectedListFilter === "all" && "filter-chip--active")}
                onClick={() => onListFilterChange("all")}
              >
                Todas as listas
              </button>
              {listOptions.map((list) => (
                <button
                  type="button"
                  key={list.id}
                  className={cx("filter-chip", selectedListFilter === list.id && "filter-chip--active")}
                  onClick={() => onListFilterChange(list.id)}
                >
                  {list.name} ({list.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {libraryGames.length === 0 ? (
          <EmptyState message="Nenhum jogo encontrado para o filtro e a busca atual." />
        ) : (
          <div className="library-grid">
            {libraryGames.map((game) => (
              <button
                type="button"
                key={game.id}
                className={cx("library-card", selectedGame?.id === game.id && "library-card--active")}
                onClick={() => onSelectGame(game.id)}
              >
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
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="detail-panel">
        <SectionHeader
          icon={Gamepad2}
          title="Ficha do jogo"
          description="Painel lateral com detalhes, listas e ações rápidas."
          action={
            <div className="panel-toolbar">
              <NotchButton variant="secondary" onClick={onOpenEdit} disabled={!selectedGame}>
                Editar
              </NotchButton>
              <NotchButton variant="ghost" onClick={onDeleteSelected} disabled={!selectedGame}>
                Excluir
              </NotchButton>
            </div>
          }
        />

        {selectedGame ? (
          <div className="detail-panel__body">
            <div className="detail-panel__headline">
              <div>
                <span className="detail-panel__eyebrow">Selecionado</span>
                <h3>{selectedGame.title}</h3>
                <p>
                  {selectedGame.platform} • {selectedGame.year} • {selectedGame.genre}
                </p>
              </div>
              <div className="detail-panel__badges">
                <Pill tone={statusTone[selectedGame.status]}>{selectedGame.status}</Pill>
                <Pill tone={priorityTone[selectedGame.priority]}>{selectedGame.priority}</Pill>
              </div>
            </div>

            <div className="detail-stats">
              <div className="detail-stat">
                <span>Progresso</span>
                <strong>{selectedGame.progress}%</strong>
              </div>
              <div className="detail-stat">
                <span>Horas</span>
                <strong>{selectedGame.hours}h</strong>
              </div>
              <div className="detail-stat">
                <span>ETA</span>
                <strong>{selectedGame.eta}</strong>
              </div>
              <div className="detail-stat">
                <span>Nota</span>
                <strong>{selectedGame.score.toFixed(1)}</strong>
              </div>
            </div>

            <div className="detail-progress">
              <div className="detail-progress__head">
                <span>Barra de avanço</span>
                <strong>{selectedGame.progress}%</strong>
              </div>
              <ProgressBar value={selectedGame.progress} tone="sunset" />
            </div>

            <div className="detail-note">
              <span className="detail-note__eyebrow">Leitura do sistema</span>
              <p>{selectedGame.notes}</p>
              <div className="detail-note__tags">
                <Pill tone="cyan">Mood: {selectedGame.mood}</Pill>
                <Pill tone="magenta">Dificuldade: {selectedGame.difficulty}</Pill>
              </div>
            </div>

            <div className="detail-note">
              <span className="detail-note__eyebrow">Listas ativas</span>
              <div className="detail-note__tags">
                {selectedGameLists.length === 0 ? (
                  <Pill tone="neutral">Sem listas vinculadas</Pill>
                ) : (
                  selectedGameLists.map((list) => (
                    <Pill key={list.id ?? list.name} tone="cyan">
                      <ListChecks size={12} />
                      {list.name}
                    </Pill>
                  ))
                )}
              </div>
            </div>

            <div className="detail-actions">
              <NotchButton variant="primary" onClick={() => onOpenGamePage(selectedGame.id)}>
                Abrir página
              </NotchButton>
              <NotchButton variant="secondary" onClick={onResumeSelected}>
                Retomar
              </NotchButton>
              <NotchButton variant="secondary" onClick={onFavoriteSelected}>
                <Heart size={15} />
                Favoritar
              </NotchButton>
              <NotchButton variant="ghost" onClick={() => onOpenSession(selectedGame.id)}>
                <Plus size={15} />
                Nova sessão
              </NotchButton>
              <NotchButton variant="ghost" onClick={onSendSelectedToPlanner}>
                <FolderKanban size={15} />
                Enviar ao planner
              </NotchButton>
            </div>
          </div>
        ) : (
          <EmptyState message="Selecione um jogo na biblioteca para abrir a ficha lateral." />
        )}
      </Panel>
    </div>
  );
}
