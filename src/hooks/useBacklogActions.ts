import type { FormEvent } from "react";
import { db } from "../core/db";
import {
  syncStructuredRelationsForRecord,
} from "../core/structuredDataSync";
import type {
  Game as DbGameMetadata,
  Goal as DbGoal,
  GoalType,
  LibraryEntry as DbLibraryEntry,
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  List as DbList,
  Period,
  SavedView as DbSavedView,
} from "../core/types";
import {
  attachRawgCandidatesToPreview,
  buildImportPreview,
  buildRestorePreview,
  createDbGameFromForm,
  createDbGameFromImport,
  downloadText,
  gamesToCsv,
  mergeImportedGame,
  mergePlatformList,
  normalizeGameTitle,
  normalizePreferencesDraft,
  onboardingGoalTemplates,
  parseBackupText,
  parseImportText,
  preferencesToSettingPairs,
  recordToImportPayload,
  type BackupPayload,
  type BackupTables,
  type Game,
  type GameFormState,
  type GoalFormState,
  type ImportPayload,
  type LibraryListFilter,
  type LibraryRecord,
  type ScreenKey,
  type SessionFormState,
  type StatusFilter,
} from "../backlog/shared";
import type { AppPreferences, PreferencesDraft } from "../modules/settings/utils/preferences";
import { settingsKeys } from "../modules/settings/utils/preferences";
import type { CatalogAuditReport } from "../modules/settings/utils/catalogAudit";
import { buildSavedViewPayload, type LibraryViewState } from "../modules/library/utils/savedViews";
import {
  applyRawgMetadataToImportPayload,
  fetchRawgMetadata,
  mergeRawgMetadataIntoGame,
  resolveBestRawgCandidate,
  searchRawgCandidates,
} from "../modules/import-export/utils/rawg";
import type { useImportExportState } from "../modules/import-export/hooks/useImportExportState";
import { deletePlaySession, savePlaySession } from "../modules/sessions/utils/sessionMutations";
import { upsertSettingsRows } from "../modules/settings/utils/settingsStorage";
import {
  mergeGameMetadata,
  mergeLibraryEntries,
  mergeReviewRecords,
  type CatalogMaintenanceReport,
} from "../modules/catalog-maintenance/utils/catalogMaintenance";

type ImportExportState = ReturnType<typeof useImportExportState>;

type UseBacklogActionsArgs = {
  records: LibraryRecord[];
  libraryEntryRows: DbLibraryEntry[];
  listRows: DbList[];
  savedViewRows: DbSavedView[];
  selectedRecord?: LibraryRecord;
  selectedGame?: Game;
  selectedListFilter: LibraryListFilter;
  currentLibraryView: LibraryViewState;
  gameModalMode: "create" | "edit" | null;
  gameForm: GameFormState;
  sessionForm: SessionFormState;
  sessionEditId: number | null;
  goalForm: GoalFormState;
  editingGoalId: number | null;
  preferences: AppPreferences;
  catalogAuditReport: CatalogAuditReport;
  catalogMaintenanceReport: CatalogMaintenanceReport;
  importState: ImportExportState;
  refreshData: (seed?: boolean) => Promise<void>;
  readBackupTables: () => Promise<BackupTables>;
  setNotice: (value: string | null) => void;
  setSubmitting: (value: boolean) => void;
  setScreen: (screen: ScreenKey) => void;
  setFilter: (value: StatusFilter) => void;
  setSelectedGameId: (value: number) => void;
  setSelectedListFilter: (value: LibraryListFilter) => void;
  setLibrarySortBy: (value: LibraryViewSortBy) => void;
  setLibrarySortDirection: (value: LibraryViewSortDirection) => void;
  setLibraryGroupBy: (value: LibraryViewGroupBy) => void;
  setQuery: (value: string) => void;
  setGameModalMode: (value: "create" | "edit" | null) => void;
  setSessionModalOpen: (value: boolean) => void;
  setSessionEditId: (value: number | null) => void;
  setGoalModalMode: (value: "create" | "edit" | null) => void;
};

async function fetchRawgCandidateMap(
  preview: Array<{ key: string; payload: { title: string } }>,
  apiKey: string,
) {
  const candidateMap = new Map<string, Awaited<ReturnType<typeof searchRawgCandidates>>>();
  const results = await Promise.allSettled(
    preview.map(async (entry) => ({
      key: entry.key,
      candidates: await searchRawgCandidates(entry.payload.title, apiKey),
    })),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      candidateMap.set(result.value.key, result.value.candidates);
    } else {
      console.warn("[RAWG] Falha ao buscar candidatos:", result.reason);
    }
  }

  return candidateMap;
}

async function fetchSelectedRawgMetadata(
  preview: Array<{ selectedRawgId: number | null }>,
  apiKey: string,
) {
  const uniqueRawgIds = Array.from(
    new Set(
      preview
        .map((entry) => entry.selectedRawgId)
        .filter((rawgId): rawgId is number => typeof rawgId === "number" && rawgId > 0),
    ),
  );
  const metadataMap = new Map<number, Awaited<ReturnType<typeof fetchRawgMetadata>>>();
  const results = await Promise.allSettled(
    uniqueRawgIds.map(async (rawgId) => ({
      rawgId,
      metadata: await fetchRawgMetadata(rawgId, apiKey),
    })),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      metadataMap.set(result.value.rawgId, result.value.metadata);
    } else {
      console.warn("[RAWG] Falha ao buscar metadados:", result.reason);
    }
  }

  return metadataMap;
}

export function useBacklogActions({
  records,
  libraryEntryRows,
  listRows,
  savedViewRows,
  selectedRecord,
  selectedGame,
  selectedListFilter,
  currentLibraryView,
  gameModalMode,
  gameForm,
  sessionForm,
  sessionEditId,
  goalForm,
  editingGoalId,
  preferences,
  catalogAuditReport,
  catalogMaintenanceReport,
  importState,
  refreshData,
  readBackupTables,
  setNotice,
  setSubmitting,
  setScreen,
  setFilter,
  setSelectedGameId,
  setSelectedListFilter,
  setLibrarySortBy,
  setLibrarySortDirection,
  setLibraryGroupBy,
  setQuery,
  setGameModalMode,
  setSessionModalOpen,
  setSessionEditId,
  setGoalModalMode,
}: UseBacklogActionsArgs) {
  const persistSession = async (payload: {
    sessionId?: number | null;
    libraryEntryId: number;
    date: string;
    durationMinutes: number;
    completionPercent?: number;
    mood?: string;
    note?: string;
  }) => {
    const result = await savePlaySession(payload);
    await refreshData();
    setSelectedGameId(result.libraryEntryId);
    return result;
  };

  const handleGameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gameForm.title.trim()) {
      setNotice("Informe um título para o jogo.");
      return;
    }

    setSubmitting(true);
    try {
      const current = gameModalMode === "edit" ? selectedRecord : undefined;
      let payload = createDbGameFromForm(gameForm, current);

      if (preferences.rawgApiKey.trim() && !current?.game.rawgId) {
        try {
          const bestCandidate = await resolveBestRawgCandidate(
            payload.game.title,
            preferences.rawgApiKey.trim(),
          );
          if (bestCandidate) {
            const metadata = await fetchRawgMetadata(bestCandidate.rawgId, preferences.rawgApiKey.trim());
            if (metadata) {
              payload = {
                game: {
                  ...payload.game,
                  slug: payload.game.slug || metadata.slug,
                  coverUrl: payload.game.coverUrl || metadata.coverUrl,
                  rawgId: payload.game.rawgId ?? metadata.rawgId,
                  genres: payload.game.genres || metadata.genres,
                  releaseYear: payload.game.releaseYear ?? metadata.releaseYear,
                  platforms: mergePlatformList(
                    payload.game.platforms || metadata.platforms,
                    payload.libraryEntry.platform,
                  ),
                  developer: payload.game.developer || metadata.developer,
                  publisher: payload.game.publisher || metadata.publisher,
                },
                libraryEntry: payload.libraryEntry,
              };
            }
          }
        } catch (rawgError) {
          console.warn("[RAWG] Enriquecimento de metadados falhou:", rawgError);
        }
      }

      let entryId = payload.libraryEntry.id;
      await db.transaction(
        "rw",
        [
          db.games,
          db.libraryEntries,
          db.stores,
          db.libraryEntryStores,
          db.platforms,
          db.gamePlatforms,
        ],
        async () => {
          let gameId = payload.game.id;
          let persistedGame = payload.game;
          if (gameId == null) {
            const existingMetadata = await db.games
              .where("normalizedTitle")
              .equals(payload.game.normalizedTitle)
              .first();

            if (existingMetadata?.id != null) {
              gameId = existingMetadata.id;
              persistedGame = {
                ...existingMetadata,
                ...payload.game,
                id: existingMetadata.id,
                platforms: mergePlatformList(existingMetadata.platforms, payload.libraryEntry.platform),
              };
              await db.games.put(persistedGame);
            } else {
              gameId = Number(await db.games.add(payload.game));
              persistedGame = { ...payload.game, id: gameId };
            }
          } else {
            await db.games.put(payload.game);
            persistedGame = payload.game;
          }

          entryId = Number(
            await db.libraryEntries.put({
              ...payload.libraryEntry,
              gameId,
            }),
          );
          await syncStructuredRelationsForRecord({
            game: { ...persistedGame, id: gameId },
            libraryEntry: { ...payload.libraryEntry, id: entryId },
          });
        },
      );

      await refreshData();
      setGameModalMode(null);
      if (entryId) setSelectedGameId(entryId);
      setScreen("library");
      setNotice(gameModalMode === "edit" ? "Jogo atualizado no catálogo." : "Jogo adicionado ao catálogo.");
    } catch (error) {
      setNotice(`Falha ao salvar jogo: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!importState.importPreview) {
        const parsed = parseImportText(importState.importSource, importState.importText, {
          platform: preferences.primaryPlatforms[0],
          sourceStore: preferences.defaultStores[0],
        });

        if (parsed.length === 0) {
          setNotice("Nenhum item válido foi encontrado na importação.");
          return;
        }

        let preview = buildImportPreview(parsed, records);
        if (preview.length === 0) {
          setNotice("Nenhum item novo ou atualizável foi encontrado.");
          return;
        }

        if (preferences.rawgApiKey.trim()) {
          const candidateMap = await fetchRawgCandidateMap(
            preview.filter((entry) => entry.status !== "existing" || !entry.payload.rawgId),
            preferences.rawgApiKey.trim(),
          );
          preview = attachRawgCandidatesToPreview(preview, candidateMap);
        }

        importState.setImportPreview(preview);
        setNotice(`Preview pronto com ${preview.length} itens consolidados.`);
        return;
      }

      const rawgMetadataMap = preferences.rawgApiKey.trim()
        ? await fetchSelectedRawgMetadata(importState.importPreview, preferences.rawgApiKey.trim())
        : new Map();
      let created = 0;
      let updated = 0;
      let ignored = 0;

      await db.transaction(
        "rw",
        [
          db.games,
          db.libraryEntries,
          db.stores,
          db.libraryEntryStores,
          db.platforms,
          db.gamePlatforms,
        ],
        async () => {
          for (const previewEntry of importState.importPreview ?? []) {
            if (previewEntry.action === "ignore") {
              ignored += 1;
              continue;
            }

            let payload: ImportPayload = previewEntry.payload;
            if (previewEntry.selectedRawgId) {
              payload = applyRawgMetadataToImportPayload(
                payload,
                rawgMetadataMap.get(previewEntry.selectedRawgId) ?? null,
              );
            }

            const targetEntryId = previewEntry.selectedMatchId ?? previewEntry.existingId;
            if (previewEntry.action === "create" || targetEntryId == null) {
              const selectedGame =
                previewEntry.selectedGameId != null ? await db.games.get(previewEntry.selectedGameId) : undefined;
              const existingMetadata =
                selectedGame ??
                (await db.games
                  .where("normalizedTitle")
                  .equals(normalizeGameTitle(payload.title))
                  .first());
              const createdRecord = createDbGameFromImport(payload, existingMetadata);
              let gameId = existingMetadata?.id;
              let persistedGame = createdRecord.game;

              if (gameId == null) {
                gameId = Number(await db.games.add(createdRecord.game));
                persistedGame = { ...createdRecord.game, id: gameId };
              } else if (existingMetadata) {
                persistedGame = {
                  ...existingMetadata,
                  ...createdRecord.game,
                  id: existingMetadata.id,
                  platforms: mergePlatformList(existingMetadata.platforms, createdRecord.libraryEntry.platform),
                };
                await db.games.put(persistedGame);
              }

              const libraryEntryId = Number(await db.libraryEntries.add({ ...createdRecord.libraryEntry, gameId }));
              await syncStructuredRelationsForRecord({
                game: { ...persistedGame, id: gameId },
                libraryEntry: { ...createdRecord.libraryEntry, id: libraryEntryId },
                extraStoreNames: payload.stores,
                extraPlatformNames: payload.platforms,
              });
              created += 1;
              continue;
            }

            const currentEntry = await db.libraryEntries.get(targetEntryId);
            const currentGame = currentEntry ? await db.games.get(currentEntry.gameId) : undefined;
            if (!currentEntry || !currentGame) {
              ignored += 1;
              continue;
            }

            const merged = mergeImportedGame({ game: currentGame, libraryEntry: currentEntry }, payload);
            await db.games.put(merged.game);
            const libraryEntryId = Number(
              await db.libraryEntries.put({
                ...merged.libraryEntry,
                gameId: merged.game.id ?? currentEntry.gameId,
              }),
            );
            await syncStructuredRelationsForRecord({
              game: merged.game,
              libraryEntry: { ...merged.libraryEntry, id: libraryEntryId },
              extraStoreNames: payload.stores,
              extraPlatformNames: payload.platforms,
            });
            updated += 1;
          }
        },
      );

      const now = new Date().toISOString();
      const changeList = importState.importPreview
        ?.filter((p) => p.action !== "ignore")
        .map((p) => ({ title: p.payload.title, action: p.action }));

      await db.importJobs.add({
        source: importState.importSource,
        status: "completed",
        totalItems: importState.importPreview?.length ?? 0,
        processedItems: created + updated,
        summary: `Importação concluída: ${created} novos, ${updated} atualizados, ${ignored} ignorados.`,
        changes: JSON.stringify(changeList || []),
        createdAt: now,
        updatedAt: now,
      }).catch(() => {});

      await refreshData();
      importState.closeImportFlow();
      setScreen("library");
      setNotice(`${created} criados, ${updated} atualizados e ${ignored} ignorados na importação.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "erro desconhecido";
      const now = new Date().toISOString();
      await db.importJobs.add({
        source: importState.importSource,
        status: "failed",
        totalItems: importState.importPreview?.length ?? 0,
        processedItems: 0,
        summary: `Falha: ${errorMessage}`,
        createdAt: now,
        updatedAt: now,
      }).catch(() => {});
      
      setNotice(`Falha ao processar importação: ${errorMessage}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (records.length === 0) {
      setNotice("A biblioteca está vazia para exportar.");
      return;
    }

    downloadText(
      `arsenal-gamer-${new Date().toISOString().slice(0, 10)}.csv`,
      gamesToCsv(records.map(recordToImportPayload)),
      "text/csv;charset=utf-8",
    );
    setNotice("Biblioteca exportada em CSV.");
  };

  const handleBackupExport = async () => {
    const tables = await readBackupTables();
    const totalRecords =
      tables.games.length +
      tables.libraryEntries.length +
      tables.stores.length +
      tables.libraryEntryStores.length +
      tables.platforms.length +
      tables.gamePlatforms.length +
      tables.playSessions.length +
      tables.reviews.length +
      tables.lists.length +
      tables.libraryEntryLists.length +
      tables.tags.length +
      tables.gameTags.length +
      tables.goals.length +
      tables.settings.length +
      tables.savedViews.length;

    if (totalRecords === 0) {
      setNotice("A base local está vazia para backup.");
      return;
    }

    const payload: BackupPayload = {
      version: 6,
      exportedAt: new Date().toISOString(),
      source: "mybacklog",
      ...tables,
    };

    downloadText(
      `arsenal-gamer-backup-${payload.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
    setNotice("Backup JSON exportado.");
  };

  const handleRestoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!importState.restorePreview) {
        const payload = parseBackupText(importState.restoreText);
        if (!payload) {
          setNotice("Arquivo de backup inválido.");
          return;
        }

        const preview = buildRestorePreview(payload, importState.restoreMode, await readBackupTables());
        importState.setRestorePreview(preview);
        setNotice(`Preview de restore pronto para ${payload.libraryEntries.length} itens da biblioteca.`);
        return;
      }

      if (importState.restorePreview.mode === "replace") {
        const confirmed = window.confirm(
          "Modo replace: toda a base local será apagada antes de restaurar. Deseja continuar?",
        );
        if (!confirmed) return;
      }

      const payload = importState.restorePreview.payload;

      await db.transaction(
        "rw",
        [
          db.games,
          db.libraryEntries,
          db.stores,
          db.libraryEntryStores,
          db.platforms,
          db.gamePlatforms,
          db.playSessions,
          db.reviews,
          db.lists,
          db.libraryEntryLists,
          db.tags,
          db.gameTags,
          db.goals,
          db.settings,
          db.savedViews,
          db.importJobs,
        ],
        async () => {
          if (importState.restorePreview?.mode === "replace") {
            await db.gamePlatforms.clear();
            await db.platforms.clear();
            await db.libraryEntryStores.clear();
            await db.stores.clear();
            await db.libraryEntryLists.clear();
            await db.gameTags.clear();
            await db.reviews.clear();
            await db.playSessions.clear();
            await db.goals.clear();
            await db.tags.clear();
            await db.lists.clear();
            await db.libraryEntries.clear();
            await db.games.clear();
            await db.settings.clear();
            await db.savedViews.clear();
            await db.importJobs.clear();

            if (payload.games.length) await db.games.bulkPut(payload.games);
            if (payload.libraryEntries.length) await db.libraryEntries.bulkPut(payload.libraryEntries);
            if (payload.stores.length) await db.stores.bulkPut(payload.stores);
            if (payload.libraryEntryStores.length) await db.libraryEntryStores.bulkPut(payload.libraryEntryStores);
            if (payload.platforms.length) await db.platforms.bulkPut(payload.platforms);
            if (payload.gamePlatforms.length) await db.gamePlatforms.bulkPut(payload.gamePlatforms);
            if (payload.playSessions.length) await db.playSessions.bulkPut(payload.playSessions);
            if (payload.reviews.length) await db.reviews.bulkPut(payload.reviews);
            if (payload.lists.length) await db.lists.bulkPut(payload.lists);
            if (payload.libraryEntryLists.length) await db.libraryEntryLists.bulkPut(payload.libraryEntryLists);
            if (payload.tags.length) await db.tags.bulkPut(payload.tags);
            if (payload.gameTags.length) await db.gameTags.bulkPut(payload.gameTags);
            if (payload.goals.length) await db.goals.bulkPut(payload.goals);
            if (payload.settings.length) await db.settings.bulkPut(payload.settings);
            if (payload.savedViews.length) await db.savedViews.bulkPut(payload.savedViews);
            return;
          }

          const [
            existingGames,
            existingEntries,
            existingStores,
            existingLibraryEntryStores,
            existingPlatforms,
            existingGamePlatforms,
            existingTags,
            existingLists,
            existingLibraryEntryLists,
            existingGoals,
            existingReviews,
            existingSessions,
            existingGameTags,
            existingSettings,
            existingSavedViews,
          ] = await Promise.all([
            db.games.toArray(),
            db.libraryEntries.toArray(),
            db.stores.toArray(),
            db.libraryEntryStores.toArray(),
            db.platforms.toArray(),
            db.gamePlatforms.toArray(),
            db.tags.toArray(),
            db.lists.toArray(),
            db.libraryEntryLists.toArray(),
            db.goals.toArray(),
            db.reviews.toArray(),
            db.playSessions.toArray(),
            db.gameTags.toArray(),
            db.settings.toArray(),
            db.savedViews.toArray(),
          ]);

          const existingGamesByTitle = new Map(
            existingGames.map((game) => [game.normalizedTitle || normalizeGameTitle(game.title), game] as const),
          );
          const existingGamesById = new Map(existingGames.map((game) => [game.id, game] as const));
          const existingStoreMap = new Map(
            existingStores.map((store) => [store.name.trim().toLowerCase(), store] as const),
          );
          const existingPlatformMap = new Map(
            existingPlatforms.map((platform) => [platform.name.trim().toLowerCase(), platform] as const),
          );
          const existingEntryByKey = new Map(
            existingEntries.map((entry) => {
              const game = existingGamesById.get(entry.gameId);
              return [`${game?.title.trim().toLowerCase() || ""}::${entry.platform.trim().toLowerCase()}`, entry] as const;
            }),
          );
          const existingTagMap = new Map(existingTags.map((tag) => [tag.name.trim().toLowerCase(), tag] as const));
          const existingListMap = new Map(existingLists.map((list) => [list.name.trim().toLowerCase(), list] as const));
          const libraryEntryListSet = new Set(existingLibraryEntryLists.map((entry) => `${entry.libraryEntryId}::${entry.listId}`));
          const existingGoalMap = new Map<string, DbGoal>(
            existingGoals.map((goal) => [`${goal.type}::${goal.period}`, goal] as const),
          );
          const existingReviewMap = new Map(existingReviews.map((review) => [review.libraryEntryId, review] as const));
          const sessionSet = new Set(
            existingSessions.map(
              (session) =>
                `${session.libraryEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`,
            ),
          );
          const gameTagSet = new Set(existingGameTags.map((entry) => `${entry.libraryEntryId}::${entry.tagId}`));
          const libraryEntryStoreSet = new Set(
            existingLibraryEntryStores.map((relation) => `${relation.libraryEntryId}::${relation.storeId}`),
          );
          const gamePlatformSet = new Set(
            existingGamePlatforms.map((relation) => `${relation.gameId}::${relation.platformId}`),
          );
          const existingSettingMap = new Map(existingSettings.map((setting) => [setting.key, setting] as const));
          const existingSavedViewMap = new Map<string, DbSavedView>(
            existingSavedViews.map((view) => [`${view.scope}::${view.name.trim().toLowerCase()}`, view] as const),
          );
          const payloadGamesById = new Map(payload.games.map((game) => [game.id, game] as const));
          const resolvedGameIdByPayloadId = new Map<number, number>();
          const resolvedEntryIdByPayloadId = new Map<number, number>();
          const resolvedStoreIdByPayloadId = new Map<number, number>();
          const resolvedPlatformIdByPayloadId = new Map<number, number>();
          const resolvedListIdByPayloadId = new Map<number, number>();
          const resolvedTagIdByPayloadId = new Map<number, number>();

          for (const game of payload.games) {
            const normalized = game.normalizedTitle || normalizeGameTitle(game.title);
            const existing = existingGamesByTitle.get(normalized);
            if (existing?.id != null) {
              if (game.id != null) resolvedGameIdByPayloadId.set(game.id, existing.id);
              await db.games.put({
                ...existing,
                ...game,
                id: existing.id,
                normalizedTitle: normalized,
                platforms: mergePlatformList(existing.platforms, game.platforms || ""),
              });
            } else {
              const nextId = Number(await db.games.add({ ...game, normalizedTitle: normalized }));
              if (game.id != null) resolvedGameIdByPayloadId.set(game.id, nextId);
            }
          }

          for (const entry of payload.libraryEntries) {
            const payloadGame = payloadGamesById.get(entry.gameId);
            if (!payloadGame) continue;
            const key = `${payloadGame.title.trim().toLowerCase()}::${entry.platform.trim().toLowerCase()}` as `${string}::${string}`;
            const existing = existingEntryByKey.get(key);
            const gameId = resolvedGameIdByPayloadId.get(entry.gameId) ?? existing?.gameId;
            if (!gameId) continue;

            if (existing?.id != null) {
              if (entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, existing.id);
              await db.libraryEntries.put({ ...existing, ...entry, id: existing.id, gameId });
            } else {
              const nextId = Number(await db.libraryEntries.add({ ...entry, id: undefined, gameId }));
              if (entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, nextId);
            }
          }

          for (const store of payload.stores) {
            const key = store.name.trim().toLowerCase();
            if (!key) continue;
            const existing = existingStoreMap.get(key);
            if (existing?.id != null) {
              if (store.id != null) resolvedStoreIdByPayloadId.set(store.id, existing.id);
              await db.stores.put({ ...existing, ...store, id: existing.id, normalizedName: key });
            } else {
              const nextId = Number(
                await db.stores.add({ ...store, id: undefined, name: store.name.trim(), normalizedName: key }),
              );
              existingStoreMap.set(key, { ...store, id: nextId, name: store.name.trim(), normalizedName: key });
              if (store.id != null) resolvedStoreIdByPayloadId.set(store.id, nextId);
            }
          }

          for (const platform of payload.platforms) {
            const key = platform.name.trim().toLowerCase();
            if (!key) continue;
            const existing = existingPlatformMap.get(key);
            if (existing?.id != null) {
              if (platform.id != null) resolvedPlatformIdByPayloadId.set(platform.id, existing.id);
              await db.platforms.put({ ...existing, ...platform, id: existing.id, normalizedName: key });
            } else {
              const nextId = Number(
                await db.platforms.add({
                  ...platform,
                  id: undefined,
                  name: platform.name.trim(),
                  normalizedName: key,
                }),
              );
              existingPlatformMap.set(key, {
                ...platform,
                id: nextId,
                name: platform.name.trim(),
                normalizedName: key,
              });
              if (platform.id != null) resolvedPlatformIdByPayloadId.set(platform.id, nextId);
            }
          }

          for (const relation of payload.libraryEntryStores) {
            const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
            const storeId = resolvedStoreIdByPayloadId.get(relation.storeId);
            if (!libraryEntryId || !storeId) continue;
            const key = `${libraryEntryId}::${storeId}`;
            if (libraryEntryStoreSet.has(key)) {
              if (relation.isPrimary) {
                const existingPrimary = await db.libraryEntryStores.where("libraryEntryId").equals(libraryEntryId).toArray();
                for (const item of existingPrimary) {
                  if (item.id != null) {
                    await db.libraryEntryStores.update(item.id, { isPrimary: item.storeId === storeId });
                  }
                }
              }
              continue;
            }
            if (relation.isPrimary) {
              const existingPrimary = await db.libraryEntryStores.where("libraryEntryId").equals(libraryEntryId).toArray();
              for (const item of existingPrimary) {
                if (item.id != null && item.isPrimary) {
                  await db.libraryEntryStores.update(item.id, { isPrimary: false });
                }
              }
            }
            libraryEntryStoreSet.add(key);
            await db.libraryEntryStores.add({
              libraryEntryId,
              storeId,
              isPrimary: relation.isPrimary,
              createdAt: relation.createdAt || new Date().toISOString(),
            });
          }

          for (const relation of payload.gamePlatforms) {
            const gameId = resolvedGameIdByPayloadId.get(relation.gameId);
            const platformId = resolvedPlatformIdByPayloadId.get(relation.platformId);
            if (!gameId || !platformId) continue;
            const key = `${gameId}::${platformId}`;
            if (gamePlatformSet.has(key)) continue;
            gamePlatformSet.add(key);
            await db.gamePlatforms.add({
              gameId,
              platformId,
              createdAt: relation.createdAt || new Date().toISOString(),
            });
          }

          for (const list of payload.lists) {
            const key = list.name.trim().toLowerCase();
            if (!key) continue;
            const existing = existingListMap.get(key);
            if (existing?.id != null) {
              if (list.id != null) resolvedListIdByPayloadId.set(list.id, existing.id);
              await db.lists.put({ ...existing, ...list, id: existing.id });
            } else {
              const nextId = Number(await db.lists.add({ ...list, id: undefined, name: list.name.trim() }));
              if (list.id != null) resolvedListIdByPayloadId.set(list.id, nextId);
            }
          }

          for (const relation of payload.libraryEntryLists) {
            const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
            const listId = resolvedListIdByPayloadId.get(relation.listId);
            if (!libraryEntryId || !listId) continue;
            const key = `${libraryEntryId}::${listId}`;
            if (libraryEntryListSet.has(key)) continue;
            libraryEntryListSet.add(key);
            await db.libraryEntryLists.add({ libraryEntryId, listId, createdAt: relation.createdAt || new Date().toISOString() });
          }

          for (const tag of payload.tags) {
            const key = tag.name.trim().toLowerCase();
            if (!key) continue;
            const existing = existingTagMap.get(key);
            if (existing?.id != null) {
              if (tag.id != null) resolvedTagIdByPayloadId.set(tag.id, existing.id);
            } else {
              const nextId = Number(await db.tags.add({ ...tag, id: undefined, name: tag.name.trim() }));
              if (tag.id != null) resolvedTagIdByPayloadId.set(tag.id, nextId);
            }
          }

          for (const goal of payload.goals) {
            const key = `${goal.type}::${goal.period}`;
            const existing = existingGoalMap.get(key);
            if (existing?.id != null) await db.goals.put({ ...existing, ...goal, id: existing.id });
            else await db.goals.add({ ...goal, id: undefined });
          }

          const reviewSeen = new Set<number>();
          for (const review of payload.reviews) {
            const libraryEntryId = resolvedEntryIdByPayloadId.get(review.libraryEntryId);
            if (!libraryEntryId || reviewSeen.has(libraryEntryId)) continue;
            reviewSeen.add(libraryEntryId);
            const existing = existingReviewMap.get(libraryEntryId);
            if (existing?.id != null) await db.reviews.put({ ...existing, ...review, id: existing.id, libraryEntryId });
            else await db.reviews.add({ ...review, id: undefined, libraryEntryId });
          }

          for (const session of payload.playSessions) {
            const libraryEntryId = resolvedEntryIdByPayloadId.get(session.libraryEntryId);
            if (!libraryEntryId) continue;
            const signature = `${libraryEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`;
            if (sessionSet.has(signature)) continue;
            sessionSet.add(signature);
            const libraryEntry = await db.libraryEntries.get(libraryEntryId);
            await db.playSessions.add({ ...session, id: undefined, libraryEntryId, platform: libraryEntry?.platform || session.platform });
          }

          for (const relation of payload.gameTags) {
            const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
            const tagId = resolvedTagIdByPayloadId.get(relation.tagId);
            if (!libraryEntryId || !tagId) continue;
            const key = `${libraryEntryId}::${tagId}`;
            if (gameTagSet.has(key)) continue;
            gameTagSet.add(key);
            await db.gameTags.add({ libraryEntryId, tagId });
          }

          for (const setting of payload.settings) {
            const existing = existingSettingMap.get(setting.key);
            if (existing?.id != null) await db.settings.put({ ...existing, ...setting, id: existing.id });
            else await db.settings.add({ ...setting, id: undefined });
          }

          for (const view of payload.savedViews) {
            const key = `${view.scope}::${view.name.trim().toLowerCase()}`;
            const existing = existingSavedViewMap.get(key);
            if (existing?.id != null) {
              await db.savedViews.put({
                ...existing,
                ...view,
                id: existing.id,
                createdAt: existing.createdAt || view.createdAt,
                updatedAt: existing.updatedAt > view.updatedAt ? existing.updatedAt : view.updatedAt,
              });
            } else {
              const nextId = Number(await db.savedViews.add({ ...view, id: undefined }));
              existingSavedViewMap.set(key, { ...view, id: nextId });
            }
          }
        },
      );

      await refreshData();
      importState.closeRestoreFlow();
      setScreen("library");
      setNotice(importState.restorePreview.mode === "replace" ? "Backup restaurado com substituição total da base local." : "Backup mesclado com a base local.");
    } catch (error) {
      setNotice(`Falha ao restaurar o backup: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSessionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const libraryEntryId = Number(sessionForm.gameId);
    const rawDuration = Number(sessionForm.durationMinutes) || 0;
    const currentEntry = libraryEntryRows.find((row) => row.id === libraryEntryId);

    if (!libraryEntryId || !currentEntry || rawDuration < 1) {
      setNotice("Preencha um jogo e uma duração válida para a sessão.");
      return;
    }

    setSubmitting(true);
    try {
      await persistSession({
        sessionId: sessionEditId,
        libraryEntryId,
        date: sessionForm.date,
        durationMinutes: rawDuration,
        completionPercent: sessionForm.completionPercent ? Number(sessionForm.completionPercent) : undefined,
        mood: sessionForm.mood.trim() || undefined,
        note: sessionForm.note.trim() || undefined,
      });
      setSessionModalOpen(false);
      setSessionEditId(null);
      setNotice(sessionEditId != null ? "Sessão atualizada." : "Sessão registrada com sucesso.");
    } catch (error) {
      setNotice(`Falha ao salvar sessão: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSessionCreate = async (payload: {
    libraryEntryId: number;
    date: string;
    durationMinutes: number;
    completionPercent?: number;
    mood?: string;
    note?: string;
  }) => {
    setSubmitting(true);
    try {
      await persistSession(payload);
      setNotice("Sessão rápida registrada.");
    } catch (error) {
      setNotice(`Falha ao registrar sessão: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGameReviewSave = async (payload: { score: string; recommend: "" | "yes" | "no"; shortReview: string; longReview: string; pros: string; cons: string; hasSpoiler: boolean }) => {
    if (!selectedRecord?.libraryEntry.id) return;
    const libraryEntryId = selectedRecord.libraryEntry.id;
    const normalizedScore = payload.score.trim();
    const parsedScore = normalizedScore === "" ? undefined : Number.parseFloat(normalizedScore);
    const score = typeof parsedScore === "number" && Number.isFinite(parsedScore) ? Math.max(0, Math.min(10, parsedScore)) : undefined;
    const reviewData = { libraryEntryId, score, shortReview: payload.shortReview.trim() || undefined, longReview: payload.longReview.trim() || undefined, pros: payload.pros.trim() || undefined, cons: payload.cons.trim() || undefined, recommend: payload.recommend || undefined, hasSpoiler: payload.hasSpoiler || undefined };
    const hasContent = Object.entries(reviewData).some(([key, value]) => key !== "libraryEntryId" && value != null && value !== "");

    await db.transaction("rw", db.reviews, db.libraryEntries, async () => {
      const existingReview = await db.reviews.where("libraryEntryId").equals(libraryEntryId).first();
      if (hasContent) {
        if (existingReview?.id != null) await db.reviews.put({ ...existingReview, ...reviewData, id: existingReview.id });
        else await db.reviews.add(reviewData);
      } else if (existingReview?.id != null) {
        await db.reviews.delete(existingReview.id);
      }
      await db.libraryEntries.update(libraryEntryId, { personalRating: score, updatedAt: new Date().toISOString() });
    });

    await refreshData();
    setNotice(hasContent ? "Review do jogo atualizada." : "Review removida.");
  };

  const handleGameTagsSave = async (value: string) => {
    if (!selectedRecord?.libraryEntry.id) return;
    const libraryEntryId = selectedRecord.libraryEntry.id;
    const names = Array.from(new Set(value.split(",").map((token) => token.trim()).filter(Boolean)));

    await db.transaction("rw", db.tags, db.gameTags, async () => {
      const existingTags = await db.tags.toArray();
      const tagsByName = new Map(existingTags.map((tag) => [tag.name.trim().toLowerCase(), tag] as const));
      const currentRelations = await db.gameTags.where("libraryEntryId").equals(libraryEntryId).toArray();
      const nextTagIds = new Set<number>();

      for (const name of names) {
        const key = name.toLowerCase();
        const existing = tagsByName.get(key);
        if (existing?.id != null) nextTagIds.add(existing.id);
        else {
          const tagId = Number(await db.tags.add({ name }));
          tagsByName.set(key, { id: tagId, name });
          nextTagIds.add(tagId);
        }
      }

      for (const relation of currentRelations) {
        if (!nextTagIds.has(relation.tagId) && relation.id != null) await db.gameTags.delete(relation.id);
      }

      const currentTagIds = new Set(currentRelations.map((relation) => relation.tagId));
      for (const tagId of nextTagIds) {
        if (!currentTagIds.has(tagId)) await db.gameTags.add({ libraryEntryId, tagId });
      }
    });

    await refreshData();
    setNotice(names.length > 0 ? "Tags sincronizadas para este jogo." : "Tags removidas deste jogo.");
  };

  const handleGameListsSave = async (listIds: number[]) => {
    if (!selectedRecord?.libraryEntry.id) return;
    const libraryEntryId = selectedRecord.libraryEntry.id;
    const validListIds = new Set(listRows.map((list) => list.id).filter((listId): listId is number => listId != null));
    const nextListIds = Array.from(new Set(listIds)).filter((listId) => validListIds.has(listId));

    await db.transaction("rw", db.libraryEntryLists, async () => {
      const currentRelations = await db.libraryEntryLists.where("libraryEntryId").equals(libraryEntryId).toArray();
      const currentListIds = new Set(currentRelations.map((relation) => relation.listId));
      for (const relation of currentRelations) {
        if (!nextListIds.includes(relation.listId) && relation.id != null) await db.libraryEntryLists.delete(relation.id);
      }
      for (const listId of nextListIds) {
        if (!currentListIds.has(listId)) await db.libraryEntryLists.add({ libraryEntryId, listId, createdAt: new Date().toISOString() });
      }
    });

    await refreshData();
    setNotice(nextListIds.length > 0 ? "Listas sincronizadas para este jogo." : "Jogo removido de todas as listas.");
  };

  const handleDeleteSelectedGame = async () => {
    if (!selectedRecord || !selectedGame) return;
    const confirmed = window.confirm(`Excluir ${selectedGame.title} da biblioteca?`);
    if (!confirmed) return;

    await db.transaction(
      "rw",
      [
        db.games,
        db.libraryEntries,
        db.stores,
        db.libraryEntryStores,
        db.platforms,
        db.gamePlatforms,
        db.playSessions,
        db.reviews,
        db.gameTags,
        db.libraryEntryLists,
      ],
      async () => {
      const entryId = selectedRecord.libraryEntry.id!;
      await db.playSessions.where("libraryEntryId").equals(entryId).delete();
      await db.reviews.where("libraryEntryId").equals(entryId).delete();
      await db.gameTags.where("libraryEntryId").equals(entryId).delete();
      await db.libraryEntryLists.where("libraryEntryId").equals(entryId).delete();
      await db.libraryEntryStores.where("libraryEntryId").equals(entryId).delete();
      await db.libraryEntries.delete(entryId);
      const siblingCount = await db.libraryEntries.where("gameId").equals(selectedRecord.game.id!).count();
      if (siblingCount === 0) {
        await db.gamePlatforms.where("gameId").equals(selectedRecord.game.id!).delete();
        await db.games.delete(selectedRecord.game.id!);
      }
    },
    );

    await refreshData();
    setScreen("library");
    setNotice("Jogo removido da biblioteca.");
  };

  const handleResumeSelectedGame = async () => {
    if (!selectedRecord?.libraryEntry.id || !selectedGame) return;
    const currentStatus = selectedRecord.libraryEntry.progressStatus;
    if (currentStatus === "finished" || currentStatus === "completed_100") {
      const confirmed = window.confirm(`${selectedGame.title} já está concluído. Deseja realmente retomar como "Jogando"?`);
      if (!confirmed) return;
    }
    await db.libraryEntries.update(selectedRecord.libraryEntry.id, { ownershipStatus: "owned", progressStatus: "playing", updatedAt: new Date().toISOString() });
    await refreshData();
    setNotice(`${selectedGame.title} voltou para a fila ativa.`);
  };

  const handleFavoriteSelectedGame = async () => {
    if (!selectedRecord?.libraryEntry.id) return;
    await db.libraryEntries.update(selectedRecord.libraryEntry.id, { favorite: !selectedRecord.libraryEntry.favorite, updatedAt: new Date().toISOString() });
    await refreshData();
    setNotice(selectedRecord.libraryEntry.favorite ? "Favorito removido." : "Jogo marcado como favorito.");
  };

  const handleSendSelectedToPlanner = async () => {
    if (!selectedRecord?.libraryEntry.id || !selectedGame) return;
    const updates: Partial<DbLibraryEntry> = { priority: "high", updatedAt: new Date().toISOString() };
    if (selectedGame.status === "Wishlist") {
      updates.ownershipStatus = "owned";
      updates.progressStatus = "not_started";
    }
    await db.libraryEntries.update(selectedRecord.libraryEntry.id, updates);
    await refreshData();
    setScreen("planner");
    setNotice(`${selectedGame.title} recebeu prioridade alta no planner.`);
  };

  const handleGoalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = Number(goalForm.target);
    if (!target || target <= 0) {
      setNotice("Informe um valor alvo maior que zero.");
      return;
    }
    setSubmitting(true);
    try {
      const goalData = { type: goalForm.type as GoalType, target, current: 0, period: goalForm.period as Period };
      if (editingGoalId != null) await db.goals.update(editingGoalId, { type: goalData.type, target: goalData.target, period: goalData.period });
      else await db.goals.add(goalData);
      await refreshData();
      setGoalModalMode(null);
      setNotice(editingGoalId != null ? "Meta atualizada." : "Meta criada com sucesso.");
    } catch (error) {
      setNotice(`Falha ao salvar meta: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoalDelete = async (goalId: number) => {
    const confirmed = window.confirm("Excluir esta meta?");
    if (!confirmed) return;
    await db.goals.delete(goalId);
    await refreshData();
    setNotice("Meta removida.");
  };

  const handleListCreate = async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return void setNotice("Informe um nome para a lista.");
    const existing = await db.lists.filter((list) => list.name.trim().toLowerCase() === normalizedName.toLowerCase()).first();
    if (existing) return void setNotice("Essa lista já existe.");
    await db.lists.add({ name: normalizedName, createdAt: new Date().toISOString() });
    await refreshData();
    setNotice("Lista criada com sucesso.");
  };

  const handleListDelete = async (listId: number) => {
    const confirmed = window.confirm("Excluir esta lista?");
    if (!confirmed) return;
    await db.transaction("rw", db.lists, db.libraryEntryLists, async () => {
      await db.libraryEntryLists.where("listId").equals(listId).delete();
      await db.lists.delete(listId);
    });
    if (selectedListFilter === listId) setSelectedListFilter("all");
    await refreshData();
    setNotice("Lista removida.");
  };

  const handleSaveLibraryView = async (name?: string) => {
    const normalizedName = String(name ?? window.prompt("Nome da view salva:", "") ?? "").trim();
    if (!normalizedName) {
      setNotice("Informe um nome para salvar a view.");
      return;
    }

    const existing = savedViewRows.find(
      (view) => view.scope === "library" && view.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );
    const payload = buildSavedViewPayload(currentLibraryView, normalizedName, existing);

    await db.savedViews.put(payload);
    await refreshData();
    setNotice(existing ? "View salva atualizada." : "View salva criada.");
  };

  const handleDeleteSavedView = async (viewId: number) => {
    const confirmed = window.confirm("Excluir esta view salva?");
    if (!confirmed) return;
    await db.savedViews.delete(viewId);
    await refreshData();
    setNotice("View salva removida.");
  };

  const handleApplySavedView = (view: DbSavedView) => {
    setQuery(view.query ?? "");
    setSelectedListFilter(view.listId ?? "all");
    setLibrarySortBy(view.sortBy);
    setLibrarySortDirection(view.sortDirection);
    setLibraryGroupBy(view.groupBy);
    const nextFilter: StatusFilter =
      view.statusFilter === "backlog"
        ? "Backlog"
        : view.statusFilter === "playing"
          ? "Jogando"
          : view.statusFilter === "paused"
            ? "Pausado"
            : view.statusFilter === "completed"
              ? "Terminado"
              : view.statusFilter === "wishlist"
                ? "Wishlist"
                : "Todos";
    setFilter(nextFilter);
    setScreen("library");
    setNotice(`View aplicada: ${view.name}.`);
  };

  const handleSettingSave = async (key: string, value: string) => {
    await upsertSettingsRows([{ key, value }]);
    await refreshData();
    setNotice("Configuração salva.");
  };

  const handlePreferencesSave = async (draft: PreferencesDraft) => {
    setSubmitting(true);
    try {
      const nextPreferences = normalizePreferencesDraft(draft, {
        onboardingCompleted: preferences.onboardingCompleted,
        guidedTourCompleted: preferences.guidedTourCompleted,
      });
      await db.transaction("rw", db.settings, async () => {
        await upsertSettingsRows(preferencesToSettingPairs(nextPreferences));
      });
      await refreshData();
      setNotice("Preferências atualizadas.");
    } catch (error) {
      setNotice(`Falha ao salvar preferências: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardingSubmit = async (payload: { draft: PreferencesDraft; starterLists: string[]; goalTemplateIds: string[] }) => {
    setSubmitting(true);
    try {
      const nextPreferences = normalizePreferencesDraft(payload.draft, {
        onboardingCompleted: true,
        guidedTourCompleted: false,
      });
      const starterLists = Array.from(new Set(payload.starterLists.map((item) => item.trim()).filter(Boolean)));
      const selectedTemplates = onboardingGoalTemplates.filter((template) => payload.goalTemplateIds.includes(template.id));
      await db.transaction("rw", db.settings, db.lists, db.goals, async () => {
        await upsertSettingsRows(preferencesToSettingPairs(nextPreferences));
        const existingLists = new Map((await db.lists.toArray()).map((list) => [list.name.trim().toLowerCase(), list] as const));
        for (const listName of starterLists) {
          const key = listName.toLowerCase();
          if (existingLists.has(key)) continue;
          const createdList: DbList = { name: listName, createdAt: new Date().toISOString() };
          await db.lists.add(createdList);
          existingLists.set(key, createdList);
        }
        const existingGoals = new Map<string, DbGoal>((await db.goals.toArray()).map((goal) => [`${goal.type}::${goal.period}`, goal] as const));
        for (const template of selectedTemplates) {
          const key = `${template.type}::${template.period}`;
          if (existingGoals.has(key)) continue;
          const goal: DbGoal = { type: template.type, target: template.target, current: 0, period: template.period };
          await db.goals.add(goal);
          existingGoals.set(key, goal);
        }
      });
      await refreshData();
      setScreen("dashboard");
      setNotice("Onboarding concluído. Preferências aplicadas ao sistema.");
    } catch (error) {
      setNotice(`Falha ao concluir onboarding: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSessionDelete = async (sessionId: number) => {
    const confirmed = window.confirm("Excluir esta sessão?");
    if (!confirmed) return;
    const libraryEntryId = await deletePlaySession(sessionId);
    if (libraryEntryId != null) setSelectedGameId(libraryEntryId);
    await refreshData();
    setNotice("Sessão excluída.");
  };

  const handleCatalogRepair = async () => {
    const { entryUpdates, orphanSessionIds } = catalogAuditReport.repairPlan;
    if (entryUpdates.length === 0 && orphanSessionIds.length === 0) {
      setNotice("Nenhum reparo automático foi necessário no catálogo.");
      return;
    }

    const confirmed = window.confirm(
      `Executar reparo automático em ${entryUpdates.length} item(ns) e remover ${orphanSessionIds.length} sessão(ões) órfã(s)?`,
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await db.transaction("rw", db.libraryEntries, db.playSessions, async () => {
        for (const orphanSessionId of orphanSessionIds) {
          await db.playSessions.delete(orphanSessionId);
        }

        for (const entryUpdate of entryUpdates) {
          await db.libraryEntries.update(entryUpdate.libraryEntryId, {
            ...entryUpdate.updates,
            updatedAt: new Date().toISOString(),
          });
        }
      });

      await refreshData();
      setNotice(
        `Reparo concluído: ${entryUpdates.length} item(ns) ajustado(s) e ${orphanSessionIds.length} sessão(ões) órfã(s) removida(s).`,
      );
    } catch (error) {
      setNotice(`Falha ao reparar o catálogo: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogDuplicateMerge = async (primaryEntryId: number, mergedEntryIds: number[]) => {
    const uniqueMergedIds = Array.from(new Set(mergedEntryIds)).filter((entryId) => entryId !== primaryEntryId);
    if (uniqueMergedIds.length === 0) {
      setNotice("Nenhum item auxiliar foi selecionado para mesclagem.");
      return;
    }

    const confirmed = window.confirm(
      `Mesclar ${uniqueMergedIds.length} entrada(s) no item principal #${primaryEntryId}? Sessões, review, tags e listas serão consolidadas.`,
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await db.transaction(
        "rw",
        [
          db.games,
          db.libraryEntries,
          db.stores,
          db.libraryEntryStores,
          db.platforms,
          db.gamePlatforms,
          db.playSessions,
          db.reviews,
          db.gameTags,
          db.libraryEntryLists,
        ],
        async () => {
          const allEntryIds = [primaryEntryId, ...uniqueMergedIds];
          const entries = (await db.libraryEntries.bulkGet(allEntryIds)).filter(
            (entry): entry is DbLibraryEntry => Boolean(entry?.id),
          );
          const primaryEntry = entries.find((entry) => entry.id === primaryEntryId);
          if (!primaryEntry?.id) throw new Error("Entrada principal não encontrada.");

          const duplicateEntries = entries.filter((entry) => entry.id !== primaryEntryId);
          if (duplicateEntries.length === 0) return;

          const gamesById = new Map(
            (await db.games.bulkGet(
              Array.from(new Set(entries.map((entry) => entry.gameId))),
            ))
              .filter((game): game is DbGameMetadata => Boolean(game?.id))
              .map((game) => [game.id, game] as const),
          );
          const primaryGame = gamesById.get(primaryEntry.gameId);
          const duplicateGameIds = Array.from(
            new Set(duplicateEntries.map((entry) => entry.gameId).filter((gameId) => gameId !== primaryGame?.id)),
          );
          const storeNameById = new Map(
            (await db.stores.toArray()).map((store) => [store.id, store.name] as const),
          );
          const extraStoreNames = (
            await db.libraryEntryStores.where("libraryEntryId").anyOf(allEntryIds).toArray()
          )
            .map((relation) => storeNameById.get(relation.storeId))
            .filter((name): name is string => Boolean(name));
          const platformNameById = new Map(
            (await db.platforms.toArray()).map((platform) => [platform.id, platform.name] as const),
          );
          const extraPlatformNames = (
            await db.gamePlatforms.where("gameId").anyOf([primaryGame?.id ?? 0, ...duplicateGameIds]).toArray()
          )
            .map((relation) => platformNameById.get(relation.platformId))
            .filter((name): name is string => Boolean(name));
          if (!primaryGame?.id) throw new Error("Metadado principal do jogo não encontrado.");

          const primarySessions = await db.playSessions.where("libraryEntryId").equals(primaryEntryId).toArray();
          const duplicateSessions = await db.playSessions.where("libraryEntryId").anyOf(uniqueMergedIds).toArray();
          const mergedSessions = [
            ...primarySessions,
            ...duplicateSessions.map((session) => ({
              ...session,
              libraryEntryId: primaryEntryId,
              platform: primaryEntry.platform,
            })),
          ];

          let mergedGame = { ...primaryGame };
          for (const duplicateEntry of duplicateEntries) {
            const duplicateGame = gamesById.get(duplicateEntry.gameId);
            if (duplicateGame) mergedGame = mergeGameMetadata(mergedGame, duplicateGame);
          }
          await db.games.put({ ...mergedGame, id: primaryGame.id, updatedAt: new Date().toISOString() });

          for (const session of duplicateSessions) {
            if (session.id == null) continue;
            await db.playSessions.update(session.id, {
              libraryEntryId: primaryEntryId,
              platform: primaryEntry.platform,
            });
          }

          const reviews = await db.reviews.where("libraryEntryId").anyOf(allEntryIds).toArray();
          const primaryReview = reviews.find((review) => review.libraryEntryId === primaryEntryId);
          let mergedReview = primaryReview;
          for (const duplicateEntryId of uniqueMergedIds) {
            mergedReview = mergeReviewRecords(
              mergedReview,
              reviews.find((review) => review.libraryEntryId === duplicateEntryId),
            );
          }

          if (mergedReview) {
            if (primaryReview?.id != null) {
              await db.reviews.put({ ...mergedReview, id: primaryReview.id, libraryEntryId: primaryEntryId });
            } else {
              await db.reviews.add({ ...mergedReview, id: undefined, libraryEntryId: primaryEntryId });
            }
          }
          for (const review of reviews) {
            if (review.libraryEntryId === primaryEntryId || review.id == null) continue;
            await db.reviews.delete(review.id);
          }

          const primaryTagRelations = await db.gameTags.where("libraryEntryId").equals(primaryEntryId).toArray();
          const duplicateTagRelations = await db.gameTags.where("libraryEntryId").anyOf(uniqueMergedIds).toArray();
          const primaryTagSet = new Set(primaryTagRelations.map((relation) => relation.tagId));
          for (const relation of duplicateTagRelations) {
            if (primaryTagSet.has(relation.tagId)) {
              if (relation.id != null) await db.gameTags.delete(relation.id);
              continue;
            }
            primaryTagSet.add(relation.tagId);
            if (relation.id != null) await db.gameTags.update(relation.id, { libraryEntryId: primaryEntryId });
          }

          const primaryListRelations = await db.libraryEntryLists.where("libraryEntryId").equals(primaryEntryId).toArray();
          const duplicateListRelations = await db.libraryEntryLists.where("libraryEntryId").anyOf(uniqueMergedIds).toArray();
          const primaryListSet = new Set(primaryListRelations.map((relation) => relation.listId));
          for (const relation of duplicateListRelations) {
            if (primaryListSet.has(relation.listId)) {
              if (relation.id != null) await db.libraryEntryLists.delete(relation.id);
              continue;
            }
            primaryListSet.add(relation.listId);
            if (relation.id != null) await db.libraryEntryLists.update(relation.id, { libraryEntryId: primaryEntryId });
          }

          const mergedEntry = mergeLibraryEntries(primaryEntry, duplicateEntries, mergedSessions);
          await db.libraryEntries.put({
            ...mergedEntry,
            id: primaryEntryId,
            gameId: primaryGame.id,
            updatedAt: new Date().toISOString(),
          });
          await syncStructuredRelationsForRecord({
            game: { ...mergedGame, id: primaryGame.id },
            libraryEntry: { ...mergedEntry, id: primaryEntryId },
            extraStoreNames,
            extraPlatformNames,
          });

          for (const duplicateEntry of duplicateEntries) {
            if (duplicateEntry.id != null) await db.libraryEntries.delete(duplicateEntry.id);
          }
          await db.libraryEntryStores.where("libraryEntryId").anyOf(uniqueMergedIds).delete();

          for (const duplicateGameId of duplicateGameIds) {
            const remainingEntries = await db.libraryEntries.where("gameId").equals(duplicateGameId).count();
            if (remainingEntries === 0) {
              await db.gamePlatforms.where("gameId").equals(duplicateGameId).delete();
              await db.games.delete(duplicateGameId);
            }
          }
        },
      );

      await refreshData();
      setSelectedGameId(primaryEntryId);
      setScreen("maintenance");
      setNotice(`Mesclagem concluída no item #${primaryEntryId}. Histórico e relações foram preservados.`);
    } catch (error) {
      setNotice(`Falha ao mesclar duplicados: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogMetadataEnrich = async (gameId: number) => {
    if (!preferences.rawgApiKey.trim()) {
      setNotice("Adicione uma chave RAWG nas preferências para enriquecer metadados.");
      return;
    }

    const currentGame = await db.games.get(gameId);
    if (!currentGame?.id) {
      setNotice("Jogo não encontrado para enriquecimento.");
      return;
    }

    setSubmitting(true);
    try {
      const bestCandidate = await resolveBestRawgCandidate(currentGame.title, preferences.rawgApiKey.trim());
      if (!bestCandidate) {
        setNotice(`Nenhum match RAWG confiável foi encontrado para ${currentGame.title}.`);
        return;
      }

      const metadata = await fetchRawgMetadata(bestCandidate.rawgId, preferences.rawgApiKey.trim());
      if (!metadata) {
        setNotice(`A RAWG não retornou metadado útil para ${currentGame.title}.`);
        return;
      }

      await db.games.put(mergeRawgMetadataIntoGame(currentGame, metadata));
      await refreshData();
      setNotice(`Metadado de ${currentGame.title} enriquecido via RAWG.`);
    } catch (error) {
      setNotice(`Falha ao enriquecer metadado: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogMetadataEnrichQueue = async () => {
    if (!preferences.rawgApiKey.trim()) {
      setNotice("Adicione uma chave RAWG nas preferências para enriquecer a fila de metadado.");
      return;
    }
    if (catalogMaintenanceReport.metadataQueue.length === 0) {
      setNotice("Nenhum jogo pendente na fila de metadado.");
      return;
    }

    setSubmitting(true);
    try {
      let updated = 0;
      let skipped = 0;

      for (const item of catalogMaintenanceReport.metadataQueue) {
        const game = await db.games.get(item.gameId);
        if (!game?.id) {
          skipped += 1;
          continue;
        }

        const bestCandidate = await resolveBestRawgCandidate(game.title, preferences.rawgApiKey.trim());
        if (!bestCandidate) {
          skipped += 1;
          continue;
        }

        const metadata = await fetchRawgMetadata(bestCandidate.rawgId, preferences.rawgApiKey.trim());
        if (!metadata) {
          skipped += 1;
          continue;
        }

        await db.games.put(mergeRawgMetadataIntoGame(game, metadata));
        updated += 1;
      }

      await refreshData();
      setNotice(`Fila processada: ${updated} jogo(s) enriquecido(s) e ${skipped} sem match confiável.`);
    } catch (error) {
      setNotice(`Falha ao enriquecer a fila de metadado: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuidedTourComplete = async () => {
    if (preferences.guidedTourCompleted) return true;

    try {
      await upsertSettingsRows([{ key: settingsKeys.guidedTourCompleted, value: "true" }]);
      await refreshData();
      return true;
    } catch (error) {
      setNotice(`Falha ao registrar o tutorial guiado: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
      return false;
    }
  };

  const handleClearImportHistory = async () => {
    try {
      await db.importJobs.clear();
      await refreshData();
      setNotice("Histórico de importação removido.");
    } catch (error) {
      setNotice(`Falha ao limpar histórico: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    }
  };

  return {
    persistSession,
    handleGameSubmit,
    handleImportSubmit,
    handleExport,
    handleBackupExport,
    handleRestoreSubmit,
    handleSessionSubmit,
    handleQuickSessionCreate,
    handleGameReviewSave,
    handleGameTagsSave,
    handleGameListsSave,
    handleDeleteSelectedGame,
    handleResumeSelectedGame,
    handleFavoriteSelectedGame,
    handleSendSelectedToPlanner,
    handleGoalSubmit,
    handleGoalDelete,
    handleListCreate,
    handleListDelete,
    handleSaveLibraryView,
    handleDeleteSavedView,
    handleApplySavedView,
    handleSettingSave,
    handlePreferencesSave,
    handleOnboardingSubmit,
    handleSessionDelete,
    handleCatalogRepair,
    handleCatalogDuplicateMerge,
    handleCatalogMetadataEnrich,
    handleCatalogMetadataEnrichQueue,
    handleGuidedTourComplete,
    handleClearImportHistory,
  };
}
