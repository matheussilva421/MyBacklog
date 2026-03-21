import type { FormEvent } from "react";
import { db } from "../core/db";
import { syncStructuredRelationsForRecord } from "../core/structuredDataSync";
import {
  buildPlatformNamesByGameId,
  buildStoreNamesByEntryId,
  derivePrimaryPlatform,
  derivePrimaryStore,
  resolveStructuredPlatforms,
  resolveStructuredStores,
} from "../core/structuredRelations";
import { normalizeToken, splitCsvTokens, generateUuid } from "../core/utils";
import { softDelete, getDeviceId } from "../lib/softDelete";
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
  downloadText,
  normalizePreferencesDraft,
  onboardingGoalTemplates,
  priorityToDbPriority,
  preferencesToSettingPairs,
  statusToDbStatus,
  type BackupTables,
  type Game,
  type LibraryBatchEditState,
  type GameFormState,
  type GoalFormState,
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
  fetchRawgMetadata,
  mergeRawgMetadataIntoGame,
  resolveBestRawgCandidate,
} from "../modules/import-export/utils/rawg";
import type { useImportExportState } from "../modules/import-export/hooks/useImportExportState";
import { deletePlaySession, savePlaySession } from "../modules/sessions/utils/sessionMutations";
import { upsertSettingsRows } from "../modules/settings/utils/settingsStorage";
import { enqueueMutation } from "../lib/mutationQueue";
import {
  mergeGameMetadata,
  mergeLibraryEntries,
  mergeReviewRecords,
  type CatalogMaintenanceReport,
} from "../modules/catalog-maintenance/utils/catalogMaintenance";
import { normalizeStructuredEntry, saveGameFromForm } from "../services/gameCatalogService";
import {
  applyImportPreview,
  applyRestorePreview,
  exportBackupPayload,
  exportLibraryCsv,
  prepareImportPreview,
  prepareRestorePreview,
} from "../services/importExportService";

type ImportExportState = ReturnType<typeof useImportExportState>;

type UseBacklogActionsArgs = {
  records: LibraryRecord[];
  libraryEntryRows: DbLibraryEntry[];
  listRows: DbList[];
  savedViewRows: DbSavedView[];
  selectedRecord?: LibraryRecord;
  selectedGame?: Game;
  selectedListFilter: LibraryListFilter;
  selectedLibraryIds: number[];
  currentLibraryView: LibraryViewState;
  gameModalMode: "create" | "edit" | null;
  gameForm: GameFormState;
  batchEditForm: LibraryBatchEditState;
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
  setSelectedLibraryIds: (value: number[]) => void;
  setSessionModalOpen: (value: boolean) => void;
  setSessionEditId: (value: number | null) => void;
  setGoalModalMode: (value: "create" | "edit" | null) => void;
  setBatchEditModalOpen: (value: boolean) => void;
};

function mergeTokenLists(current: string[], incoming: string[], mode: "merge" | "replace"): string[] {
  if (incoming.length === 0) return current;
  return mode === "replace" ? splitCsvTokens(incoming) : splitCsvTokens([...current, ...incoming]);
}

export function useBacklogActions({
  records,
  libraryEntryRows,
  listRows,
  savedViewRows,
  selectedRecord,
  selectedGame,
  selectedListFilter,
  selectedLibraryIds,
  currentLibraryView,
  gameModalMode,
  gameForm,
  batchEditForm,
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
  setSelectedLibraryIds,
  setSessionModalOpen,
  setSessionEditId,
  setGoalModalMode,
  setBatchEditModalOpen,
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

    // Enqueue mutation for session
    let session;
    if (payload.sessionId != null) {
      session = await db.playSessions.get(payload.sessionId);
    } else {
      // Buscar sessão recém-criada pela entry
      const sessions = await db.playSessions
        .where("libraryEntryId")
        .equals(payload.libraryEntryId)
        .reverse()
        .limit(1)
        .toArray();
      session = sessions[0];
    }

    if (session) {
      await enqueueMutation(
        session.uuid,
        "playSession",
        payload.sessionId != null ? "update" : "create",
        session,
      );
    }

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
      const { entryId } = await saveGameFromForm({
        mode: gameModalMode,
        gameForm,
        selectedRecord,
        preferences,
      });

      // Enqueue mutations for game and libraryEntry
      if (entryId) {
        const entry = await db.libraryEntries.get(entryId);
        if (entry) {
          await enqueueMutation(
            entry.uuid,
            "libraryEntry",
            gameModalMode === "edit" ? "update" : "create",
            entry,
          );
          if (entry.gameId) {
            const game = await db.games.get(entry.gameId);
            if (game) {
              await enqueueMutation(
                game.uuid,
                "game",
                gameModalMode === "edit" ? "update" : "create",
                game,
              );
            }
          }
        }
      }

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
        const preview = await prepareImportPreview({
          importSource: importState.importSource,
          importText: importState.importText,
          preferences,
          records,
        });

        if (importState.importText.trim() && preview.length === 0) {
          setNotice("Nenhum item válido foi encontrado na importação.");
          return;
        }
        if (preview.length === 0) {
          setNotice("Nenhum item novo ou atualizável foi encontrado.");
          return;
        }

        importState.setImportPreview(preview);
        setNotice(`Preview pronto com ${preview.length} itens consolidados.`);
        return;
      }

      const { created, updated, ignored } = await applyImportPreview({
        importSource: importState.importSource,
        importPreview: importState.importPreview,
        preferences,
      });

      await refreshData();
      importState.closeImportFlow();
      setScreen("library");
      setNotice(`${created} criados, ${updated} atualizados e ${ignored} ignorados na importação.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "erro desconhecido";
      const now = new Date().toISOString();
      await db.importJobs
        .add({
          uuid: generateUuid(),
          version: 1,
          source: importState.importSource,
          status: "failed",
          totalItems: importState.importPreview?.length ?? 0,
          processedItems: 0,
          summary: `Falha: ${errorMessage}`,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .catch(() => {});

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

    const exportFile = exportLibraryCsv({
      records,
      tables: await readBackupTables(),
    });
    downloadText(exportFile.filename, exportFile.content, exportFile.mimeType);
    setNotice("Biblioteca exportada em CSV.");
  };

  const handleBackupExport = async () => {
    const exportFile = exportBackupPayload({
      tables: await readBackupTables(),
    });
    if (exportFile.totalRecords === 0) {
      setNotice("A base local está vazia para backup.");
      return;
    }

    downloadText(exportFile.filename, exportFile.content, exportFile.mimeType);
    setNotice("Backup JSON exportado.");
  };

  const handleRestoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!importState.restorePreview) {
        const preview = prepareRestorePreview({
          restoreText: importState.restoreText,
          restoreMode: importState.restoreMode,
          currentTables: await readBackupTables(),
        });
        if (!preview) {
          setNotice("Arquivo de backup inválido.");
          return;
        }

        importState.setRestorePreview(preview);
        setNotice(`Preview de restore pronto para ${preview.payload.libraryEntries.length} itens da biblioteca.`);
        return;
      }

      if (importState.restorePreview.mode === "replace") {
        const confirmed = window.confirm(
          "Modo replace: toda a base local será apagada antes de restaurar. Deseja continuar?",
        );
        if (!confirmed) return;
      }

      await applyRestorePreview(importState.restorePreview);

      await refreshData();
      importState.closeRestoreFlow();
      setScreen("library");
      setNotice(
        importState.restorePreview.mode === "replace"
          ? "Backup restaurado com substituição total da base local."
          : "Backup mesclado com a base local.",
      );
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

  const handleGameReviewSave = async (payload: {
    score: string;
    recommend: "" | "yes" | "no";
    shortReview: string;
    longReview: string;
    pros: string;
    cons: string;
    hasSpoiler: boolean;
  }) => {
    if (!selectedRecord?.libraryEntry.id) return;
    const libraryEntryId = selectedRecord.libraryEntry.id;
    const normalizedScore = payload.score.trim();
    const parsedScore = normalizedScore === "" ? undefined : Number.parseFloat(normalizedScore);
    const score =
      typeof parsedScore === "number" && Number.isFinite(parsedScore)
        ? Math.max(0, Math.min(10, parsedScore))
        : undefined;
    const now = new Date().toISOString();
    const reviewData = {
      uuid: generateUuid(),
      version: 1,
      libraryEntryId,
      score,
      shortReview: payload.shortReview.trim() || undefined,
      longReview: payload.longReview.trim() || undefined,
      pros: payload.pros.trim() || undefined,
      cons: payload.cons.trim() || undefined,
      recommend: payload.recommend || undefined,
      hasSpoiler: payload.hasSpoiler || undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const hasContent = Object.entries(reviewData).some(
      ([key, value]) => key !== "libraryEntryId" && value != null && value !== "",
    );

    const deviceId = await getDeviceId();
    await db.transaction("rw", db.reviews, db.libraryEntries, async () => {
      const existingReview = await db.reviews.where("libraryEntryId").equals(libraryEntryId).first();
      if (hasContent) {
        if (existingReview?.id != null) {
          const updatedReview = { ...existingReview, ...reviewData, id: existingReview.id };
          await db.reviews.put(updatedReview);
          await enqueueMutation(updatedReview.uuid, "review", "update", updatedReview);
        } else {
          await db.reviews.add(reviewData);
          await enqueueMutation(reviewData.uuid, "review", "create", reviewData);
        }
      } else if (existingReview?.id != null) {
        await enqueueMutation(existingReview.uuid, "review", "delete", { id: existingReview.id, uuid: existingReview.uuid });
        await softDelete("reviews", existingReview.id, deviceId);
      }
      await db.libraryEntries.update(libraryEntryId, { personalRating: score, updatedAt: new Date().toISOString() });
    });

    await refreshData();
    setNotice(hasContent ? "Review do jogo atualizada." : "Review removida.");
  };

  const handleGameTagsSave = async (value: string) => {
    if (!selectedRecord?.libraryEntry.id) return;
    const libraryEntryId = selectedRecord.libraryEntry.id;
    const names = Array.from(
      new Set(
        value
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean),
      ),
    );

    const deviceId = await getDeviceId();
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
          const now = new Date().toISOString();
          const tagId = Number(
            await db.tags.add({
              uuid: generateUuid(),
              version: 1,
              name,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            }),
          );
          tagsByName.set(key, {
            id: tagId,
            name,
            uuid: generateUuid(),
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });
          nextTagIds.add(tagId);
        }
      }

      for (const relation of currentRelations) {
        if (!nextTagIds.has(relation.tagId) && relation.id != null) {
          await enqueueMutation(relation.uuid, "gameTag", "delete", { id: relation.id, uuid: relation.uuid });
          await softDelete("gameTags", relation.id, deviceId);
        }
      }

      const currentTagIds = new Set(currentRelations.map((relation) => relation.tagId));
      for (const tagId of nextTagIds) {
        if (!currentTagIds.has(tagId)) {
          const now = new Date().toISOString();
          const newRelation = {
            uuid: generateUuid(),
            version: 1,
            libraryEntryId,
            tagId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          await db.gameTags.add(newRelation);
          await enqueueMutation(newRelation.uuid, "gameTag", "create", newRelation);
        }
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

    const deviceId = await getDeviceId();
    await db.transaction("rw", db.libraryEntryLists, async () => {
      const currentRelations = await db.libraryEntryLists.where("libraryEntryId").equals(libraryEntryId).toArray();
      const currentListIds = new Set(currentRelations.map((relation) => relation.listId));
      for (const relation of currentRelations) {
        if (!nextListIds.includes(relation.listId) && relation.id != null) {
          await enqueueMutation(relation.uuid, "libraryEntryList", "delete", { id: relation.id, uuid: relation.uuid });
          await softDelete("libraryEntryLists", relation.id, deviceId);
        }
      }
      for (const listId of nextListIds) {
        if (!currentListIds.has(listId)) {
          const now = new Date().toISOString();
          const newRelation = {
            uuid: generateUuid(),
            version: 1,
            libraryEntryId,
            listId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          await db.libraryEntryLists.add(newRelation);
          await enqueueMutation(newRelation.uuid, "libraryEntryList", "create", newRelation);
        }
      }
    });

    await refreshData();
    setNotice(nextListIds.length > 0 ? "Listas sincronizadas para este jogo." : "Jogo removido de todas as listas.");
  };

  const handleBatchEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const entryIds = Array.from(new Set(selectedLibraryIds)).filter((entryId) => entryId > 0);
    if (entryIds.length === 0) {
      setNotice("Selecione ao menos um jogo para editar em lote.");
      return;
    }

    const normalizedStores = splitCsvTokens(batchEditForm.stores);
    const normalizedPlatforms = splitCsvTokens(batchEditForm.platforms);
    const normalizedTagNames = splitCsvTokens(batchEditForm.tags);
    const validListIds = Array.from(new Set(batchEditForm.listIds)).filter((listId) =>
      listRows.some((list) => list.id === listId),
    );
    const hasChanges =
      normalizedStores.length > 0 ||
      normalizedPlatforms.length > 0 ||
      normalizedTagNames.length > 0 ||
      validListIds.length > 0 ||
      batchEditForm.applyMode === "replace" ||
      Boolean(batchEditForm.status) ||
      Boolean(batchEditForm.priority) ||
      Boolean(batchEditForm.primaryPlatform.trim()) ||
      Boolean(batchEditForm.primaryStore.trim());

    if (!hasChanges) {
      setNotice("Defina ao menos um campo para aplicar na edição em lote.");
      return;
    }

    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      await db.transaction(
        "rw",
        [
          db.games,
          db.libraryEntries,
          db.stores,
          db.libraryEntryStores,
          db.platforms,
          db.gamePlatforms,
          db.tags,
          db.gameTags,
          db.libraryEntryLists,
        ],
        async () => {
          const entries = (await db.libraryEntries.bulkGet(entryIds)).filter((entry): entry is DbLibraryEntry =>
            Boolean(entry?.id),
          );
          const gamesById = new Map(
            (await db.games.bulkGet(Array.from(new Set(entries.map((entry) => entry.gameId)))))
              .filter((game): game is DbGameMetadata => Boolean(game?.id))
              .map((game) => [game.id, game] as const),
          );
          const storeRows = await db.stores.toArray();
          const libraryEntryStoreRows = await db.libraryEntryStores.where("libraryEntryId").anyOf(entryIds).toArray();
          const platformRows = await db.platforms.toArray();
          const gamePlatformRows = await db.gamePlatforms
            .where("gameId")
            .anyOf(Array.from(new Set(entries.map((entry) => entry.gameId))))
            .toArray();
          const storeNamesByEntryId = buildStoreNamesByEntryId(storeRows, libraryEntryStoreRows);
          const platformNamesByGameId = buildPlatformNamesByGameId(platformRows, gamePlatformRows);
          const currentTagRows = await db.tags.toArray();
          const tagsByName = new Map(currentTagRows.map((tag) => [tag.name.trim().toLowerCase(), tag] as const));
          const ensuredTagIds: number[] = [];

          for (const tagName of normalizedTagNames) {
            const key = tagName.trim().toLowerCase();
            if (!key) continue;
            const existing = tagsByName.get(key);
            if (existing?.id != null) {
              ensuredTagIds.push(existing.id);
              continue;
            }
            const tagId = Number(
              await db.tags.add({
                uuid: generateUuid(),
                version: 1,
                name: tagName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
              }),
            );
            tagsByName.set(key, {
              id: tagId,
              name: tagName,
              uuid: generateUuid(),
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            });
            ensuredTagIds.push(tagId);
          }

          const now = new Date().toISOString();
          for (const entry of entries) {
            const game = gamesById.get(entry.gameId);
            if (!game?.id || !entry.id) continue;

            const existingStores = resolveStructuredStores(entry, storeNamesByEntryId);
            const existingPlatforms = resolveStructuredPlatforms(game, entry.platform, platformNamesByGameId);
            const nextStores = mergeTokenLists(existingStores, normalizedStores, batchEditForm.applyMode);
            const nextPlatforms = mergeTokenLists(existingPlatforms, normalizedPlatforms, batchEditForm.applyMode);
            const nextEntry: DbLibraryEntry = {
              ...entry,
              sourceStore: batchEditForm.primaryStore.trim() || derivePrimaryStore(nextStores, entry.sourceStore),
              platform: batchEditForm.primaryPlatform.trim() || derivePrimaryPlatform(nextPlatforms, entry.platform),
              ownershipStatus: batchEditForm.status
                ? batchEditForm.status === "Wishlist"
                  ? "wishlist"
                  : "owned"
                : entry.ownershipStatus,
              progressStatus: batchEditForm.status ? statusToDbStatus(batchEditForm.status) : entry.progressStatus,
              priority: batchEditForm.priority ? priorityToDbPriority(batchEditForm.priority) : entry.priority,
              updatedAt: now,
            };
            const nextGame: DbGameMetadata = {
              ...game,
              platforms: nextPlatforms.join(", "),
              updatedAt: now,
            };

            await db.libraryEntries.put(nextEntry);
            await db.games.put(nextGame);
            await syncStructuredRelationsForRecord({
              game: nextGame,
              libraryEntry: nextEntry,
              extraStoreNames: nextStores,
              extraPlatformNames: nextPlatforms,
            });

            const currentListRelations = await db.libraryEntryLists.where("libraryEntryId").equals(entry.id).toArray();
            const currentListIds = currentListRelations.map((relation) => relation.listId);
            const nextListIds =
              batchEditForm.applyMode === "replace"
                ? validListIds
                : Array.from(new Set([...currentListIds, ...validListIds]));
            for (const relation of currentListRelations) {
              if (!nextListIds.includes(relation.listId) && relation.id != null) {
                await softDelete("libraryEntryLists", relation.id, deviceId);
              }
            }
            for (const listId of nextListIds) {
              if (!currentListIds.includes(listId)) {
                await db.libraryEntryLists.add({
                  uuid: generateUuid(),
                  version: 1,
                  libraryEntryId: entry.id,
                  listId,
                  createdAt: now,
                  updatedAt: now,
                  deletedAt: null,
                });
              }
            }

            const currentTagRelations = await db.gameTags.where("libraryEntryId").equals(entry.id).toArray();
            const currentTagIds = currentTagRelations.map((relation) => relation.tagId);
            const nextTagIds =
              batchEditForm.applyMode === "replace"
                ? ensuredTagIds
                : Array.from(new Set([...currentTagIds, ...ensuredTagIds]));
            for (const relation of currentTagRelations) {
              if (!nextTagIds.includes(relation.tagId) && relation.id != null) {
                await softDelete("gameTags", relation.id, deviceId);
              }
            }
            for (const tagId of nextTagIds) {
              if (!currentTagIds.includes(tagId)) {
                await db.gameTags.add({
                  uuid: generateUuid(),
                  version: 1,
                  libraryEntryId: entry.id,
                  tagId,
                  createdAt: now,
                  updatedAt: now,
                  deletedAt: null,
                });
              }
            }
          }
        },
      );

      await refreshData();
      setBatchEditModalOpen(false);
      setSelectedLibraryIds([]);
      setNotice(`Edição em lote aplicada a ${entryIds.length} jogo(s).`);
    } catch (error) {
      setNotice(`Falha na edição em lote: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelectedGame = async () => {
    if (!selectedRecord || !selectedGame) return;
    const confirmed = window.confirm(`Excluir ${selectedGame.title} da biblioteca?`);
    if (!confirmed) return;
    const deletedEntryId = selectedRecord.libraryEntry.id!;
    const deviceId = await getDeviceId();

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
        // Enqueue mutations antes de deletar
        const sessions = await db.playSessions.where("libraryEntryId").equals(deletedEntryId).toArray();
        for (const session of sessions) {
          await enqueueMutation(session.uuid, "playSession", "delete", { id: session.id, uuid: session.uuid });
        }

        const review = await db.reviews.where("libraryEntryId").equals(deletedEntryId).first();
        if (review) {
          await enqueueMutation(review.uuid, "review", "delete", { id: review.id, uuid: review.uuid });
        }

        const gameTags = await db.gameTags.where("libraryEntryId").equals(deletedEntryId).toArray();
        for (const gameTag of gameTags) {
          await enqueueMutation(gameTag.uuid, "gameTag", "delete", { id: gameTag.id, uuid: gameTag.uuid });
        }

        const entryLists = await db.libraryEntryLists.where("libraryEntryId").equals(deletedEntryId).toArray();
        for (const entryList of entryLists) {
          await enqueueMutation(entryList.uuid, "libraryEntryList", "delete", { id: entryList.id, uuid: entryList.uuid });
        }

        const entryStores = await db.libraryEntryStores.where("libraryEntryId").equals(deletedEntryId).toArray();
        for (const entryStore of entryStores) {
          await enqueueMutation(entryStore.uuid, "libraryEntryStore", "delete", { id: entryStore.id, uuid: entryStore.uuid });
        }

        // Library entry
        const entry = await db.libraryEntries.get(deletedEntryId);
        if (entry) {
          await enqueueMutation(entry.uuid, "libraryEntry", "delete", { id: entry.id, uuid: entry.uuid });
        }

        // Soft delete nas entidades relacionadas
        for (const session of sessions) {
          await softDelete("playSessions", session.id!, deviceId);
        }

        if (review?.id) await softDelete("reviews", review.id, deviceId);

        for (const gameTag of gameTags) {
          await softDelete("gameTags", gameTag.id!, deviceId);
        }

        for (const entryList of entryLists) {
          await softDelete("libraryEntryLists", entryList.id!, deviceId);
        }

        for (const entryStore of entryStores) {
          await softDelete("libraryEntryStores", entryStore.id!, deviceId);
        }

        // Soft delete na library entry
        await softDelete("libraryEntries", deletedEntryId, deviceId);

        // Verificar se deve deletar o jogo (sem outras entradas)
        const siblingCount = await db.libraryEntries
          .where("gameId")
          .equals(selectedRecord.game.id!)
          .filter((e) => !e.deletedAt)
          .count();
        if (siblingCount === 0) {
          const game = await db.games.get(selectedRecord.game.id!);
          if (game) {
            await enqueueMutation(game.uuid, "game", "delete", { id: game.id, uuid: game.uuid });
          }
          const gamePlatforms = await db.gamePlatforms.where("gameId").equals(selectedRecord.game.id!).toArray();
          for (const gp of gamePlatforms) {
            await enqueueMutation(gp.uuid, "gamePlatform", "delete", { id: gp.id, uuid: gp.uuid });
            await softDelete("gamePlatforms", gp.id!, deviceId);
          }
          await softDelete("games", selectedRecord.game.id!, deviceId);
        }
      },
    );

    await refreshData();
    setSelectedLibraryIds(selectedLibraryIds.filter((entryId) => entryId !== deletedEntryId));
    setScreen("library");
    setNotice("Jogo removido da biblioteca.");
  };

  const handleResumeSelectedGame = async () => {
    if (!selectedRecord?.libraryEntry.id || !selectedGame) return;
    const currentStatus = selectedRecord.libraryEntry.progressStatus;
    if (currentStatus === "finished" || currentStatus === "completed_100") {
      const confirmed = window.confirm(
        `${selectedGame.title} já está concluído. Deseja realmente retomar como "Jogando"?`,
      );
      if (!confirmed) return;
    }
    const entry = await db.libraryEntries.get(selectedRecord.libraryEntry.id);
    if (entry) {
      const updatedEntry = {
        ...entry,
        ownershipStatus: "owned" as const,
        progressStatus: "playing" as const,
        updatedAt: new Date().toISOString(),
      };
      await db.libraryEntries.update(selectedRecord.libraryEntry.id, updatedEntry);
      await enqueueMutation(entry.uuid, "libraryEntry", "update", updatedEntry);
    } else {
      await db.libraryEntries.update(selectedRecord.libraryEntry.id, {
        ownershipStatus: "owned",
        progressStatus: "playing",
        updatedAt: new Date().toISOString(),
      });
    }
    await refreshData();
    setNotice(`${selectedGame.title} voltou para a fila ativa.`);
  };

  const handleFavoriteSelectedGame = async () => {
    if (!selectedRecord?.libraryEntry.id) return;
    const entry = await db.libraryEntries.get(selectedRecord.libraryEntry.id);
    if (entry) {
      const updatedEntry = {
        ...entry,
        favorite: !entry.favorite,
        updatedAt: new Date().toISOString(),
      };
      await db.libraryEntries.update(selectedRecord.libraryEntry.id, updatedEntry);
      await enqueueMutation(entry.uuid, "libraryEntry", "update", updatedEntry);
    } else {
      await db.libraryEntries.update(selectedRecord.libraryEntry.id, {
        favorite: !selectedRecord.libraryEntry.favorite,
        updatedAt: new Date().toISOString(),
      });
    }
    await refreshData();
    setNotice(selectedRecord.libraryEntry.favorite ? "Favorito removido." : "Jogo marcado como favorito.");
  };

  const handleSendSelectedToPlanner = async () => {
    if (!selectedRecord?.libraryEntry.id || !selectedGame) return;
    const entry = await db.libraryEntries.get(selectedRecord.libraryEntry.id);
    const updates: Partial<DbLibraryEntry> = { priority: "high", updatedAt: new Date().toISOString() };
    if (selectedGame.status === "Wishlist") {
      updates.ownershipStatus = "owned";
      updates.progressStatus = "not_started";
    }
    if (entry) {
      const updatedEntry = { ...entry, ...updates };
      await db.libraryEntries.update(selectedRecord.libraryEntry.id, updatedEntry);
      await enqueueMutation(entry.uuid, "libraryEntry", "update", updatedEntry);
    } else {
      await db.libraryEntries.update(selectedRecord.libraryEntry.id, updates);
    }
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
      const now = new Date().toISOString();
      const goalData = {
        uuid: generateUuid(),
        version: 1,
        type: goalForm.type as GoalType,
        target,
        current: 0,
        period: goalForm.period as Period,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      if (editingGoalId != null) {
        const existingGoal = await db.goals.get(editingGoalId);
        if (existingGoal) {
          const updatedGoal = { ...existingGoal, type: goalData.type, target: goalData.target, period: goalData.period };
          await db.goals.update(editingGoalId, updatedGoal);
          await enqueueMutation(updatedGoal.uuid, "goal", "update", updatedGoal);
        }
      } else {
        await db.goals.add(goalData);
        await enqueueMutation(goalData.uuid, "goal", "create", goalData);
      }
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
    const deviceId = await getDeviceId();
    const existingGoal = await db.goals.get(goalId);
    if (existingGoal) {
      await enqueueMutation(existingGoal.uuid, "goal", "delete", { id: existingGoal.id, uuid: existingGoal.uuid });
    }
    await softDelete("goals", goalId, deviceId);
    await refreshData();
    setNotice("Meta removida.");
  };

  const handleListCreate = async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return void setNotice("Informe um nome para a lista.");
    const existing = await db.lists
      .filter((list) => list.name.trim().toLowerCase() === normalizedName.toLowerCase())
      .first();
    if (existing) return void setNotice("Essa lista já existe.");
    const now = new Date().toISOString();
    const newList = {
      uuid: generateUuid(),
      version: 1,
      name: normalizedName,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await db.lists.add(newList);
    await enqueueMutation(newList.uuid, "list", "create", newList);
    await refreshData();
    setNotice("Lista criada com sucesso.");
  };

  const handleListDelete = async (listId: number) => {
    const confirmed = window.confirm("Excluir esta lista?");
    if (!confirmed) return;
    const deviceId = await getDeviceId();
    await db.transaction("rw", db.lists, db.libraryEntryLists, async () => {
      const relations = await db.libraryEntryLists.where("listId").equals(listId).toArray();
      for (const relation of relations) {
        if (relation.id != null) {
          await enqueueMutation(relation.uuid, "libraryEntryList", "delete", { id: relation.id, uuid: relation.uuid });
          await softDelete("libraryEntryLists", relation.id, deviceId);
        }
      }
      const list = await db.lists.get(listId);
      if (list) {
        await enqueueMutation(list.uuid, "list", "delete", { id: list.id, uuid: list.uuid });
      }
      await softDelete("lists", listId, deviceId);
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

    if (existing?.id) {
      await db.savedViews.put(payload);
      await enqueueMutation(payload.uuid, "savedView", "update", payload);
    } else {
      await db.savedViews.add(payload);
      await enqueueMutation(payload.uuid, "savedView", "create", payload);
    }
    await refreshData();
    setNotice(existing ? "View salva atualizada." : "View salva criada.");
  };

  const handleDeleteSavedView = async (viewId: number) => {
    const confirmed = window.confirm("Excluir esta view salva?");
    if (!confirmed) return;
    const deviceId = await getDeviceId();
    const existingView = await db.savedViews.get(viewId);
    if (existingView) {
      await enqueueMutation(existingView.uuid, "savedView", "delete", { id: existingView.id, uuid: existingView.uuid });
    }
    await softDelete("savedViews", viewId, deviceId);
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
    const existing = await db.settings.get({ key });
    const now = new Date().toISOString();
    const settingData = { key, value, updatedAt: now };
    if (existing?.id) {
      const updatedSetting = { ...existing, ...settingData };
      await db.settings.put(updatedSetting);
      await enqueueMutation(`setting-${key}`, "setting", "update", updatedSetting);
    } else {
      const newSetting = { ...settingData, id: undefined };
      await db.settings.add(newSetting);
      await enqueueMutation(`setting-${key}`, "setting", "create", newSetting);
    }
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
      const settingPairs = preferencesToSettingPairs(nextPreferences);
      await db.transaction("rw", db.settings, async () => {
        for (const pair of settingPairs) {
          const existing = await db.settings.get({ key: pair.key });
          const now = new Date().toISOString();
          if (existing?.id) {
            const updatedSetting = { ...existing, ...pair, updatedAt: now };
            await db.settings.put(updatedSetting);
            await enqueueMutation(`setting-${pair.key}`, "setting", "update", updatedSetting);
          } else {
            const newSetting = { ...pair, updatedAt: now };
            await db.settings.add(newSetting);
            await enqueueMutation(`setting-${pair.key}`, "setting", "create", newSetting);
          }
        }
      });
      await refreshData();
      setNotice("Preferências atualizadas.");
    } catch (error) {
      setNotice(`Falha ao salvar preferências: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardingSubmit = async (payload: {
    draft: PreferencesDraft;
    starterLists: string[];
    goalTemplateIds: string[];
  }) => {
    setSubmitting(true);
    try {
      const nextPreferences = normalizePreferencesDraft(payload.draft, {
        onboardingCompleted: true,
        guidedTourCompleted: false,
      });
      const starterLists = Array.from(new Set(payload.starterLists.map((item) => item.trim()).filter(Boolean)));
      const selectedTemplates = onboardingGoalTemplates.filter((template) =>
        payload.goalTemplateIds.includes(template.id),
      );
      await db.transaction("rw", db.settings, db.lists, db.goals, async () => {
        // Settings
        const settingPairs = preferencesToSettingPairs(nextPreferences);
        for (const pair of settingPairs) {
          const existing = await db.settings.get({ key: pair.key });
          const now = new Date().toISOString();
          if (existing?.id) {
            const updatedSetting = { ...existing, ...pair, updatedAt: now };
            await db.settings.put(updatedSetting);
            await enqueueMutation(`setting-${pair.key}`, "setting", "update", updatedSetting);
          } else {
            const newSetting = { ...pair, updatedAt: now };
            await db.settings.add(newSetting);
            await enqueueMutation(`setting-${pair.key}`, "setting", "create", newSetting);
          }
        }

        // Lists
        const existingLists = new Map(
          (await db.lists.toArray()).map((list) => [list.name.trim().toLowerCase(), list] as const),
        );
        for (const listName of starterLists) {
          const key = listName.toLowerCase();
          if (existingLists.has(key)) continue;
          const now = new Date().toISOString();
          const createdList: DbList = {
            uuid: generateUuid(),
            version: 1,
            name: listName,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          await db.lists.add(createdList);
          await enqueueMutation(createdList.uuid, "list", "create", createdList);
          existingLists.set(key, createdList);
        }

        // Goals
        const existingGoals = new Map<string, DbGoal>(
          (await db.goals.toArray()).map((goal) => [`${goal.type}::${goal.period}`, goal] as const),
        );
        for (const template of selectedTemplates) {
          const key = `${template.type}::${template.period}`;
          if (existingGoals.has(key)) continue;
          const now = new Date().toISOString();
          const goal: DbGoal = {
            uuid: generateUuid(),
            version: 1,
            type: template.type,
            target: template.target,
            current: 0,
            period: template.period,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          await db.goals.add(goal);
          await enqueueMutation(goal.uuid, "goal", "create", goal);
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
    const session = await db.playSessions.get(sessionId);
    if (session) {
      await enqueueMutation(session.uuid, "playSession", "delete", { id: session.id, uuid: session.uuid });
    }
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
        const deviceId = await getDeviceId();
        for (const orphanSessionId of orphanSessionIds) {
          await softDelete("playSessions", orphanSessionId, deviceId);
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
      const deviceId = await getDeviceId();
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
          const entries = (await db.libraryEntries.bulkGet(allEntryIds)).filter((entry): entry is DbLibraryEntry =>
            Boolean(entry?.id),
          );
          const primaryEntry = entries.find((entry) => entry.id === primaryEntryId);
          if (!primaryEntry?.id) throw new Error("Entrada principal não encontrada.");

          const duplicateEntries = entries.filter((entry) => entry.id !== primaryEntryId);
          if (duplicateEntries.length === 0) return;

          const gamesById = new Map(
            (await db.games.bulkGet(Array.from(new Set(entries.map((entry) => entry.gameId)))))
              .filter((game): game is DbGameMetadata => Boolean(game?.id))
              .map((game) => [game.id, game] as const),
          );
          const primaryGame = gamesById.get(primaryEntry.gameId);
          const duplicateGameIds = Array.from(
            new Set(duplicateEntries.map((entry) => entry.gameId).filter((gameId) => gameId !== primaryGame?.id)),
          );
          const storeNameById = new Map((await db.stores.toArray()).map((store) => [store.id, store.name] as const));
          const extraStoreNames = (await db.libraryEntryStores.where("libraryEntryId").anyOf(allEntryIds).toArray())
            .map((relation) => storeNameById.get(relation.storeId))
            .filter((name): name is string => Boolean(name));
          const platformNameById = new Map(
            (await db.platforms.toArray()).map((platform) => [platform.id, platform.name] as const),
          );
          const extraPlatformNames = (
            await db.gamePlatforms
              .where("gameId")
              .anyOf([primaryGame?.id ?? 0, ...duplicateGameIds])
              .toArray()
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
              platform: session.platform || primaryEntry.platform,
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
              platform: session.platform || primaryEntry.platform,
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
            await softDelete("reviews", review.id, deviceId);
          }

          const primaryTagRelations = await db.gameTags.where("libraryEntryId").equals(primaryEntryId).toArray();
          const duplicateTagRelations = await db.gameTags.where("libraryEntryId").anyOf(uniqueMergedIds).toArray();
          const primaryTagSet = new Set(primaryTagRelations.map((relation) => relation.tagId));
          for (const relation of duplicateTagRelations) {
            if (primaryTagSet.has(relation.tagId)) {
              if (relation.id != null) await softDelete("gameTags", relation.id, deviceId);
              continue;
            }
            primaryTagSet.add(relation.tagId);
            if (relation.id != null) await db.gameTags.update(relation.id, { libraryEntryId: primaryEntryId });
          }

          const primaryListRelations = await db.libraryEntryLists
            .where("libraryEntryId")
            .equals(primaryEntryId)
            .toArray();
          const duplicateListRelations = await db.libraryEntryLists
            .where("libraryEntryId")
            .anyOf(uniqueMergedIds)
            .toArray();
          const primaryListSet = new Set(primaryListRelations.map((relation) => relation.listId));
          for (const relation of duplicateListRelations) {
            if (primaryListSet.has(relation.listId)) {
              if (relation.id != null) await softDelete("libraryEntryLists", relation.id, deviceId);
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
            if (duplicateEntry.id != null) await softDelete("libraryEntries", duplicateEntry.id, deviceId);
          }
          const duplicateEntryStores = await db.libraryEntryStores.where("libraryEntryId").anyOf(uniqueMergedIds).toArray();
          for (const store of duplicateEntryStores) {
            if (store.id != null) await softDelete("libraryEntryStores", store.id, deviceId);
          }

          for (const duplicateGameId of duplicateGameIds) {
            const remainingEntries = await db.libraryEntries.where("gameId").equals(duplicateGameId).count();
            if (remainingEntries === 0) {
              const duplicateGamePlatforms = await db.gamePlatforms.where("gameId").equals(duplicateGameId).toArray();
              for (const gp of duplicateGamePlatforms) {
                if (gp.id != null) await softDelete("gamePlatforms", gp.id, deviceId);
              }
              await softDelete("games", duplicateGameId, deviceId);
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

  const handleCatalogNormalizeEntry = async (libraryEntryId: number) => {
    setSubmitting(true);
    try {
      await db.transaction(
        "rw",
        [db.games, db.libraryEntries, db.stores, db.libraryEntryStores, db.platforms, db.gamePlatforms],
        async () => {
          await normalizeStructuredEntry(libraryEntryId);
        },
      );

      await refreshData();
      setSelectedGameId(libraryEntryId);
      setNotice(`Estrutura normalizada para a entrada #${libraryEntryId}.`);
    } catch (error) {
      setNotice(`Falha ao normalizar entrada: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogNormalizeQueue = async () => {
    if (catalogMaintenanceReport.normalizationQueue.length === 0) {
      setNotice("Nenhum item pendente na fila de normalização.");
      return;
    }

    setSubmitting(true);
    try {
      const entryIds = Array.from(
        new Set(catalogMaintenanceReport.normalizationQueue.map((item) => item.libraryEntryId)),
      );

      await db.transaction(
        "rw",
        [db.games, db.libraryEntries, db.stores, db.libraryEntryStores, db.platforms, db.gamePlatforms],
        async () => {
          for (const entryId of entryIds) {
            await normalizeStructuredEntry(entryId);
          }
        },
      );

      await refreshData();
      setNotice(`Fila de normalização aplicada em ${entryIds.length} entrada(s).`);
    } catch (error) {
      setNotice(`Falha ao normalizar a fila: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogConsolidateAliasGroup = async (kind: "store" | "platform", normalizedName: string) => {
    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      if (kind === "store") {
        await db.transaction("rw", [db.stores, db.libraryEntryStores, db.libraryEntries], async () => {
          const rows = (await db.stores.toArray()).filter(
            (store) => normalizeToken(store.normalizedName || store.name) === normalizedName,
          );
          const ids = rows.map((row) => row.id).filter((id): id is number => typeof id === "number");
          if (ids.length < 2) return;

          const relations = await db.libraryEntryStores.where("storeId").anyOf(ids).toArray();
          const relationCountByStoreId = new Map<number, number>();
          for (const relation of relations) {
            relationCountByStoreId.set(relation.storeId, (relationCountByStoreId.get(relation.storeId) ?? 0) + 1);
          }

          const canonical = [...rows].sort((left, right) => {
            const leftCount = relationCountByStoreId.get(left.id ?? 0) ?? 0;
            const rightCount = relationCountByStoreId.get(right.id ?? 0) ?? 0;
            return rightCount - leftCount || left.name.localeCompare(right.name, "pt-BR");
          })[0];
          if (!canonical?.id) return;

          const duplicateIds = ids.filter((id) => id !== canonical.id);
          const canonicalRelationByEntryId = new Map(
            relations
              .filter((relation) => relation.storeId === canonical.id)
              .map((relation) => [relation.libraryEntryId, relation] as const),
          );

          for (const relation of relations) {
            if (!duplicateIds.includes(relation.storeId)) continue;
            const canonicalRelation = canonicalRelationByEntryId.get(relation.libraryEntryId);
            if (canonicalRelation?.id != null) {
              if (relation.isPrimary && !canonicalRelation.isPrimary) {
                await db.libraryEntryStores.update(canonicalRelation.id, { isPrimary: true });
              }
              if (relation.id != null) await softDelete("libraryEntryStores", relation.id, deviceId);
              continue;
            }
            if (relation.id != null) {
              await db.libraryEntryStores.update(relation.id, { storeId: canonical.id });
              canonicalRelationByEntryId.set(relation.libraryEntryId, {
                ...relation,
                storeId: canonical.id,
              });
            }
          }

          const entries = await db.libraryEntries.toArray();
          for (const entry of entries) {
            if (normalizeToken(entry.sourceStore) !== normalizedName || entry.id == null) continue;
            await db.libraryEntries.update(entry.id, {
              sourceStore: canonical.name,
              updatedAt: new Date().toISOString(),
            });
          }

          for (const duplicateId of duplicateIds) {
            await softDelete("stores", duplicateId, deviceId);
          }
        });
      } else {
        await db.transaction("rw", [db.platforms, db.gamePlatforms, db.games, db.libraryEntries], async () => {
          const rows = (await db.platforms.toArray()).filter(
            (platform) => normalizeToken(platform.normalizedName || platform.name) === normalizedName,
          );
          const ids = rows.map((row) => row.id).filter((id): id is number => typeof id === "number");
          if (ids.length < 2) return;

          const relations = await db.gamePlatforms.where("platformId").anyOf(ids).toArray();
          const relationCountByPlatformId = new Map<number, number>();
          for (const relation of relations) {
            relationCountByPlatformId.set(
              relation.platformId,
              (relationCountByPlatformId.get(relation.platformId) ?? 0) + 1,
            );
          }

          const canonical = [...rows].sort((left, right) => {
            const leftCount = relationCountByPlatformId.get(left.id ?? 0) ?? 0;
            const rightCount = relationCountByPlatformId.get(right.id ?? 0) ?? 0;
            return rightCount - leftCount || left.name.localeCompare(right.name, "pt-BR");
          })[0];
          if (!canonical?.id) return;

          const duplicateIds = ids.filter((id) => id !== canonical.id);
          const canonicalRelationByGameId = new Map(
            relations
              .filter((relation) => relation.platformId === canonical.id)
              .map((relation) => [relation.gameId, relation] as const),
          );

          for (const relation of relations) {
            if (!duplicateIds.includes(relation.platformId)) continue;
            const canonicalRelation = canonicalRelationByGameId.get(relation.gameId);
            if (canonicalRelation?.id != null) {
              if (relation.id != null) await softDelete("gamePlatforms", relation.id, deviceId);
              continue;
            }
            if (relation.id != null) {
              await db.gamePlatforms.update(relation.id, { platformId: canonical.id });
              canonicalRelationByGameId.set(relation.gameId, {
                ...relation,
                platformId: canonical.id,
              });
            }
          }

          const games = await db.games.toArray();
          for (const game of games) {
            const nextPlatforms = splitCsvTokens(game.platforms).map((platformName) =>
              normalizeToken(platformName) === normalizedName ? canonical.name : platformName,
            );
            if (nextPlatforms.length === 0 || game.id == null) continue;
            await db.games.update(game.id, {
              platforms: splitCsvTokens(nextPlatforms).join(", "),
              updatedAt: new Date().toISOString(),
            });
          }

          const entries = await db.libraryEntries.toArray();
          for (const entry of entries) {
            if (normalizeToken(entry.platform) !== normalizedName || entry.id == null) continue;
            await db.libraryEntries.update(entry.id, {
              platform: canonical.name,
              updatedAt: new Date().toISOString(),
            });
          }

          for (const duplicateId of duplicateIds) {
            await softDelete("platforms", duplicateId, deviceId);
          }
        });
      }

      await refreshData();
      setNotice(
        kind === "store"
          ? `Aliases de store consolidados para "${normalizedName}".`
          : `Aliases de plataforma consolidados para "${normalizedName}".`,
      );
    } catch (error) {
      setNotice(`Falha ao consolidar aliases: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
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
      setNotice(
        `Falha ao enriquecer a fila de metadado: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
      );
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
      setNotice(
        `Falha ao registrar o tutorial guiado: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
      );
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
    handleBatchEditSubmit,
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
    handleCatalogNormalizeEntry,
    handleCatalogNormalizeQueue,
    handleCatalogConsolidateAliasGroup,
    handleCatalogMetadataEnrich,
    handleCatalogMetadataEnrichQueue,
    handleGuidedTourComplete,
    handleClearImportHistory,
  };
}
