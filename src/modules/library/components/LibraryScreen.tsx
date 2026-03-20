import { Download, Library, Plus, Upload } from "lucide-react";
import {
  cx,
  filterOptions,
  type Game,
  type LibraryListFilter,
  type StatusFilter,
} from "../../../backlog/shared";
import type {
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  SavedView,
} from "../../../core/types";
import { EmptyState, NotchButton, Panel, SectionHeader } from "../../../components/cyberpunk-ui";
import type { GroupedLibraryGames } from "../utils/savedViews";
import { LibraryCard } from "./LibraryCard";

type ListOption = {
  id: number;
  name: string;
  count: number;
};

type LibraryScreenProps = {
  libraryGames: Game[];
  groupedLibraryGames: GroupedLibraryGames[];
  selectedLibraryIds: number[];
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
  onToggleLibrarySelection: (gameId: number) => void;
  onClearLibrarySelection: () => void;
  onSelectVisibleLibraryGames: (gameIds: number[]) => void;
  onExport: () => void;
  onBackupExport: () => void;
  onOpenRestore: () => void;
  onOpenCreate: () => void;
  onOpenBatchEdit: () => void;
  onOpenGamePage: (gameId?: number) => void;
};

export function LibraryScreen({
  libraryGames,
  groupedLibraryGames,
  selectedLibraryIds,
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
  onToggleLibrarySelection,
  onClearLibrarySelection,
  onSelectVisibleLibraryGames,
  onExport,
  onBackupExport,
  onOpenRestore,
  onOpenCreate,
  onOpenBatchEdit,
  onOpenGamePage,
}: LibraryScreenProps) {
  const visibleLibraryIds = libraryGames.map((game) => game.id);
  const selectedCount = selectedLibraryIds.length;

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
                  <div
                    key={savedViewId ?? `${view.scope}-${view.name}`}
                    className={cx(
                      "saved-view-card",
                      "app-card",
                      "app-card--compact",
                      activeSavedView?.id === savedViewId && "saved-view-card--active",
                      activeSavedView?.id === savedViewId && "app-card--selected",
                    )}
                  >
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
                <div className="library-grid">
                  {group.games.map((game) => (
                    <LibraryCard
                      key={game.id}
                      game={game}
                      isSelected={selectedLibraryIds.includes(game.id)}
                      isActive={false}
                      onSelectGame={onOpenGamePage}
                      onToggleSelection={onToggleLibrarySelection}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
