import type { FormEvent } from "react";
import { db } from "../core/db";
import type {
  Goal as DbGoal,
  GoalType,
  LibraryEntry as DbLibraryEntry,
  List as DbList,
  Period,
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
} from "../backlog/shared";
import type { AppPreferences, PreferencesDraft } from "../modules/settings/utils/preferences";
import type { CatalogAuditReport } from "../modules/settings/utils/catalogAudit";
import {
  applyRawgMetadataToImportPayload,
  fetchRawgMetadata,
  resolveBestRawgCandidate,
  searchRawgCandidates,
} from "../modules/import-export/utils/rawg";
import type { useImportExportState } from "../modules/import-export/hooks/useImportExportState";
import { deletePlaySession, savePlaySession } from "../modules/sessions/utils/sessionMutations";
import { upsertSettingsRows } from "../modules/settings/utils/settingsStorage";

type ImportExportState = ReturnType<typeof useImportExportState>;

type UseBacklogActionsArgs = {
  records: LibraryRecord[];
  libraryEntryRows: DbLibraryEntry[];
  listRows: DbList[];
  selectedRecord?: LibraryRecord;
  selectedGame?: Game;
  selectedListFilter: LibraryListFilter;
  gameModalMode: "create" | "edit" | null;
  gameForm: GameFormState;
  sessionForm: SessionFormState;
  sessionEditId: number | null;
  goalForm: GoalFormState;
  editingGoalId: number | null;
  preferences: AppPreferences;
  catalogAuditReport: CatalogAuditReport;
  importState: ImportExportState;
  refreshData: (seed?: boolean) => Promise<void>;
  readBackupTables: () => Promise<BackupTables>;
  setNotice: (value: string | null) => void;
  setSubmitting: (value: boolean) => void;
  setScreen: (screen: ScreenKey) => void;
  setSelectedGameId: (value: number) => void;
  setSelectedListFilter: (value: LibraryListFilter) => void;
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
  selectedRecord,
  selectedGame,
  selectedListFilter,
  gameModalMode,
  gameForm,
  sessionForm,
  sessionEditId,
  goalForm,
  editingGoalId,
  preferences,
  catalogAuditReport,
  importState,
  refreshData,
  readBackupTables,
  setNotice,
  setSubmitting,
  setScreen,
  setSelectedGameId,
  setSelectedListFilter,
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
      await db.transaction("rw", db.games, db.libraryEntries, async () => {
        let gameId = payload.game.id;
        if (gameId == null) {
          const existingMetadata = await db.games
            .where("normalizedTitle")
            .equals(payload.game.normalizedTitle)
            .first();

          if (existingMetadata?.id != null) {
            gameId = existingMetadata.id;
            await db.games.put({
              ...existingMetadata,
              ...payload.game,
              id: existingMetadata.id,
              platforms: mergePlatformList(existingMetadata.platforms, payload.libraryEntry.platform),
            });
          } else {
            gameId = Number(await db.games.add(payload.game));
          }
        } else {
          await db.games.put(payload.game);
        }

        entryId = Number(
          await db.libraryEntries.put({
            ...payload.libraryEntry,
            gameId,
          }),
        );
      });

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

      await db.transaction("rw", db.games, db.libraryEntries, async () => {
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
            const existingMetadata = await db.games
              .where("normalizedTitle")
              .equals(normalizeGameTitle(payload.title))
              .first();
            const createdRecord = createDbGameFromImport(payload, existingMetadata);
            let gameId = existingMetadata?.id;

            if (gameId == null) {
              gameId = Number(await db.games.add(createdRecord.game));
            } else if (existingMetadata) {
              await db.games.put({
                ...existingMetadata,
                ...createdRecord.game,
                id: existingMetadata.id,
                platforms: mergePlatformList(existingMetadata.platforms, createdRecord.libraryEntry.platform),
              });
            }

            await db.libraryEntries.add({ ...createdRecord.libraryEntry, gameId });
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
          await db.libraryEntries.put({
            ...merged.libraryEntry,
            gameId: merged.game.id ?? currentEntry.gameId,
          });
          updated += 1;
        }
      });

      await refreshData();
      importState.closeImportFlow();
      setScreen("library");
      setNotice(`${created} criados, ${updated} atualizados e ${ignored} ignorados na importação.`);
    } catch (error) {
      setNotice(
        `Falha ao processar importação: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
      );
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
      tables.playSessions.length +
      tables.reviews.length +
      tables.lists.length +
      tables.libraryEntryLists.length +
      tables.tags.length +
      tables.gameTags.length +
      tables.goals.length +
      tables.settings.length;

    if (totalRecords === 0) {
      setNotice("A base local está vazia para backup.");
      return;
    }

    const payload: BackupPayload = {
      version: 4,
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
          db.playSessions,
          db.reviews,
          db.lists,
          db.libraryEntryLists,
          db.tags,
          db.gameTags,
          db.goals,
          db.settings,
          db.importJobs,
        ],
        async () => {
          if (importState.restorePreview?.mode === "replace") {
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
            await db.importJobs.clear();

            if (payload.games.length) await db.games.bulkPut(payload.games);
            if (payload.libraryEntries.length) await db.libraryEntries.bulkPut(payload.libraryEntries);
            if (payload.playSessions.length) await db.playSessions.bulkPut(payload.playSessions);
            if (payload.reviews.length) await db.reviews.bulkPut(payload.reviews);
            if (payload.lists.length) await db.lists.bulkPut(payload.lists);
            if (payload.libraryEntryLists.length) await db.libraryEntryLists.bulkPut(payload.libraryEntryLists);
            if (payload.tags.length) await db.tags.bulkPut(payload.tags);
            if (payload.gameTags.length) await db.gameTags.bulkPut(payload.gameTags);
            if (payload.goals.length) await db.goals.bulkPut(payload.goals);
            if (payload.settings.length) await db.settings.bulkPut(payload.settings);
            return;
          }

          const [
            existingGames,
            existingEntries,
            existingTags,
            existingLists,
            existingLibraryEntryLists,
            existingGoals,
            existingReviews,
            existingSessions,
            existingGameTags,
            existingSettings,
          ] = await Promise.all([
            db.games.toArray(),
            db.libraryEntries.toArray(),
            db.tags.toArray(),
            db.lists.toArray(),
            db.libraryEntryLists.toArray(),
            db.goals.toArray(),
            db.reviews.toArray(),
            db.playSessions.toArray(),
            db.gameTags.toArray(),
            db.settings.toArray(),
          ]);

          const existingGamesByTitle = new Map(
            existingGames.map((game) => [game.normalizedTitle || normalizeGameTitle(game.title), game] as const),
          );
          const existingGamesById = new Map(existingGames.map((game) => [game.id, game] as const));
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
          const existingSettingMap = new Map(existingSettings.map((setting) => [setting.key, setting] as const));
          const payloadGamesById = new Map(payload.games.map((game) => [game.id, game] as const));
          const resolvedGameIdByPayloadId = new Map<number, number>();
          const resolvedEntryIdByPayloadId = new Map<number, number>();
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

    await db.transaction("rw", [db.games, db.libraryEntries, db.playSessions, db.reviews, db.gameTags, db.libraryEntryLists], async () => {
      const entryId = selectedRecord.libraryEntry.id!;
      await db.playSessions.where("libraryEntryId").equals(entryId).delete();
      await db.reviews.where("libraryEntryId").equals(entryId).delete();
      await db.gameTags.where("libraryEntryId").equals(entryId).delete();
      await db.libraryEntryLists.where("libraryEntryId").equals(entryId).delete();
      await db.libraryEntries.delete(entryId);
      const siblingCount = await db.libraryEntries.where("gameId").equals(selectedRecord.game.id!).count();
      if (siblingCount === 0) await db.games.delete(selectedRecord.game.id!);
    });

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

  const handleSettingSave = async (key: string, value: string) => {
    await upsertSettingsRows([{ key, value }]);
    await refreshData();
    setNotice("Configuração salva.");
  };

  const handlePreferencesSave = async (draft: PreferencesDraft) => {
    setSubmitting(true);
    try {
      const nextPreferences = normalizePreferencesDraft(draft);
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
      const nextPreferences = normalizePreferencesDraft(payload.draft);
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
    handleSettingSave,
    handlePreferencesSave,
    handleOnboardingSubmit,
    handleSessionDelete,
    handleCatalogRepair,
  };
}
