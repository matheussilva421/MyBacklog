import { ArrowUpRight, Download, FolderKanban, Gamepad2, Heart, ImageIcon, Library, ListChecks, Plus, Upload } from "lucide-react";
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
import type {
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  SavedView,
} from "../../../core/types";
import { EmptyState, NotchButton, Panel, Pill, ProgressBar, SectionHeader } from "../../../components/cyberpunk-ui";
import { formatDatePtBr, formatCurrency } from "../../../core/utils";
import type { GroupedLibraryGames } from "../utils/savedViews";

type ListOption = {
  id: number;
  name: string;
  count: number;
};

type LibraryScreenProps = {
  libraryGames: Game[];
  groupedLibraryGames: GroupedLibraryGames[];
  selectedGame?: Game;
  selectedLibraryIds: number[];
  selectedGameLists: DbList[];
  filter: StatusFilter;
  selectedListFilter: LibraryListFilter;
  sortBy: LibraryViewSortBy;
  sortDirection: LibraryViewSortDirection;
  groupBy: LibraryViewGroupBy;
  listOptions: ListOption[];
  savedViews: SavedView[];
  activeSavedView?: SavedView;
  onFilterChange: (value: StatusFilter) => void;
  onListFilterChange: (value: LibraryListFilter) => void;
  onSortByChange: (value: LibraryViewSortBy) => void;
  onSortDirectionChange: (value: LibraryViewSortDirection) => void;
  onGroupByChange: (value: LibraryViewGroupBy) => void;
  onSaveCurrentView: () => void;
  onApplySavedView: (view: SavedView) => void;
  onDeleteSavedView: (viewId: number) => void;
  onSelectGame: (gameId: number) => void;
  onToggleLibrarySelection: (gameId: number) => void;
  onClearLibrarySelection: () => void;
  onSelectVisibleLibraryGames: (gameIds: number[]) => void;
  onExport: () => void;
  onBackupExport: () => void;
  onOpenRestore: () => void;
  onOpenCreate: () => void;
  onOpenBatchEdit: () => void;
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
  groupedLibraryGames,
  selectedGame,
  selectedLibraryIds,
  selectedGameLists,
  filter,
  selectedListFilter,
  sortBy,
  sortDirection,
  groupBy,
  listOptions,
  savedViews,
  activeSavedView,
  onFilterChange,
  onListFilterChange,
  onSortByChange,
  onSortDirectionChange,
  onGroupByChange,
  onSaveCurrentView,
  onApplySavedView,
  onDeleteSavedView,
  onSelectGame,
  onToggleLibrarySelection,
  onClearLibrarySelection,
  onSelectVisibleLibraryGames,
  onExport,
  onBackupExport,
  onOpenRestore,
  onOpenCreate,
  onOpenBatchEdit,
  onOpenEdit,
  onDeleteSelected,
  onResumeSelected,
  onFavoriteSelected,
  onOpenSession,
  onOpenGamePage,
  onSendSelectedToPlanner,
}: LibraryScreenProps) {
  const visibleLibraryIds = libraryGames.map((game) => game.id);
  const selectedCount = selectedLibraryIds.length;

  const renderLibraryCard = (game: Game) => {
    const isSelected = selectedLibraryIds.includes(game.id);

    return (
      <article
        key={game.id}
        className={cx(
          "library-card-shell",
          selectedGame?.id === game.id && "library-card-shell--active",
          isSelected && "library-card-shell--selected",
        )}
      >
        <div className="library-card__toolbar">
          <button
            type="button"
            className={cx("library-card__select", isSelected && "library-card__select--active")}
            onClick={() => onToggleLibrarySelection(game.id)}
            aria-pressed={isSelected}
            aria-label={isSelected ? `Remover ${game.title} da seleção` : `Selecionar ${game.title}`}
          >
            {isSelected ? "Selecionado" : "Selecionar"}
          </button>
          <span className="library-card__toolbar-meta">
            {(game.platforms ?? [game.platform]).slice(0, 2).join(" • ")}
          </span>
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
  };

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
          <div className="library-batch-bar">
            <div>
              <strong>{selectedCount} selecionado(s)</strong>
              <span>
                {selectedCount > 0
                  ? "Use a edição em lote para stores, plataformas, listas, tags, status e prioridade."
                  : "Selecione itens para aplicar mudanças estruturadas em lote."}
              </span>
            </div>
            <div className="panel-toolbar">
              <NotchButton variant="secondary" onClick={() => onSelectVisibleLibraryGames(visibleLibraryIds)} disabled={visibleLibraryIds.length === 0}>
                Selecionar filtrados
              </NotchButton>
              <NotchButton variant="ghost" onClick={onClearLibrarySelection} disabled={selectedCount === 0}>
                Limpar seleção
              </NotchButton>
              <NotchButton variant="primary" onClick={onOpenBatchEdit} disabled={selectedCount === 0}>
                Editar em lote
              </NotchButton>
            </div>
          </div>

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

          <div className="filter-group">
            <span className="filter-group__label">Organização</span>
            <div className="filter-control-row">
              <label className="filter-select">
                <span>Ordenar</span>
                <select value={sortBy} onChange={(event) => onSortByChange(event.target.value as LibraryViewSortBy)}>
                  <option value="updatedAt">Atualização</option>
                  <option value="title">Título</option>
                  <option value="progress">Progresso</option>
                  <option value="hours">Horas</option>
                  <option value="priority">Prioridade</option>
                  <option value="year">Ano</option>
                  <option value="completionDate">Conclusão</option>
                </select>
              </label>
              <label className="filter-select">
                <span>Direção</span>
                <select value={sortDirection} onChange={(event) => onSortDirectionChange(event.target.value as LibraryViewSortDirection)}>
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </select>
              </label>
              <label className="filter-select">
                <span>Agrupar</span>
                <select value={groupBy} onChange={(event) => onGroupByChange(event.target.value as LibraryViewGroupBy)}>
                  <option value="none">Sem grupo</option>
                  <option value="status">Status</option>
                  <option value="priority">Prioridade</option>
                  <option value="platform">Plataforma</option>
                  <option value="sourceStore">Store</option>
                  <option value="ownership">Acesso</option>
                </select>
              </label>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group__header">
              <span className="filter-group__label">Views salvas</span>
              <NotchButton variant="secondary" onClick={onSaveCurrentView}>
                Salvar view atual
              </NotchButton>
            </div>
            {savedViews.length === 0 ? (
              <p className="filter-empty-copy">Nenhuma view salva ainda. Use os filtros e salve a combinação atual.</p>
            ) : (
              <div className="saved-view-list">
                {savedViews.map((view) => {
                  const savedViewId = view.id;
                  return (
                  <div key={savedViewId ?? `${view.scope}-${view.name}`} className={cx("saved-view-card", activeSavedView?.id === savedViewId && "saved-view-card--active")}>
                    <button type="button" className="saved-view-card__main" onClick={() => onApplySavedView(view)}>
                      <strong>{view.name}</strong>
                      <span>
                        {view.query ? `Busca: ${view.query}` : "Sem busca"} •{" "}
                        {view.groupBy === "none" ? "Sem agrupamento" : `Grupo: ${view.groupBy}`}
                      </span>
                    </button>
                    {view.id != null ? (
                      <button type="button" className="saved-view-card__delete" onClick={() => savedViewId != null && onDeleteSavedView(savedViewId)} aria-label={`Excluir view ${view.name}`}>
                        ×
                      </button>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {libraryGames.length === 0 ? (
          <EmptyState message="Nenhum jogo encontrado para o filtro e a busca atual." />
        ) : (
          <div className="library-groups">
            {groupedLibraryGames.map((group) => (
              <section key={group.key} className="library-group-block">
                {groupBy !== "none" ? <h3 className="library-group-title">{group.label}</h3> : null}
                <div className="library-grid">{group.games.map(renderLibraryCard)}</div>
              </section>
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
            {selectedGame.coverUrl ? (
              <div className="game-page-cover">
                <img src={selectedGame.coverUrl} alt={`Capa de ${selectedGame.title}`} />
              </div>
            ) : null}

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
              <p>{selectedGame.description || selectedGame.notes}</p>
              <div className="detail-note__tags">
                <Pill tone="cyan">Mood: {selectedGame.mood}</Pill>
                <Pill tone="magenta">Dificuldade: {selectedGame.difficulty}</Pill>
              </div>
            </div>

            <div className="detail-note">
              <span className="detail-note__eyebrow">Metadado enriquecido</span>
              <div className="detail-note__tags">
                {(selectedGame.platforms ?? [selectedGame.platform]).map((platform) => (
                  <Pill key={`${selectedGame.id}-platform-${platform}`} tone="neutral">
                    {platform}
                  </Pill>
                ))}
                {(selectedGame.stores ?? [selectedGame.sourceStore]).map((store) => (
                  <Pill key={`${selectedGame.id}-store-${store}`} tone="sunset">
                    {store}
                  </Pill>
                ))}
                {selectedGame.developer ? <Pill tone="cyan">{selectedGame.developer}</Pill> : null}
                {selectedGame.publisher ? <Pill tone="magenta">{selectedGame.publisher}</Pill> : null}
                {selectedGame.rawgId ? <Pill tone="yellow">RAWG #{selectedGame.rawgId}</Pill> : null}
              </div>
            </div>

            {(selectedGame.purchaseDate || selectedGame.pricePaid != null || selectedGame.storeLink) && (
              <div className="detail-note">
                <span className="detail-note__eyebrow">Aquisição</span>
                <div className="detail-note__tags">
                  {selectedGame.purchaseDate && (
                    <Pill tone="neutral">Comprado em: {formatDatePtBr(selectedGame.purchaseDate)}</Pill>
                  )}
                  {selectedGame.pricePaid != null && (
                    <Pill tone="sunset">Pago: {formatCurrency(selectedGame.pricePaid, selectedGame.currency)}</Pill>
                  )}
                  {selectedGame.storeLink && (
                    <a href={selectedGame.storeLink} target="_blank" rel="noopener noreferrer">
                      <Pill tone="cyan">
                        Link da Lo <ArrowUpRight size={12} />
                      </Pill>
                    </a>
                  )}
                </div>
              </div>
            )}

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
