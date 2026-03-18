import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { db } from "../core/db";
import type {
  Game as DbGameMetadata,
  GameTag as DbGameTag,
  Goal as DbGoal,
  GoalType,
  LibraryEntry as DbLibraryEntry,
  LibraryEntryList as DbLibraryEntryList,
  List as DbList,
  Period,
  PlaySession as DbPlaySession,
  Review as DbReview,
  Setting as DbSetting,
  Tag as DbTag,
} from "../core/types";
import { useDashboardInsights } from "../modules/dashboard/hooks/useDashboardInsights";
import { useSelectedGamePage } from "../modules/game-page/hooks/useSelectedGamePage";
import { useLibraryState } from "../modules/library/hooks/useLibraryState";
import { usePlannerInsights } from "../modules/planner/hooks/usePlannerInsights";
import {
  buildImportPreview,
  buildRestorePreview,
  composeLibraryRecords,
  computePlannerScore,
  createDbGameFromForm,
  createDbGameFromImport,
  createGameFormState,
  createSessionFormState,
  dbGameToUiGame,
  defaultGameToDbGame,
  defaultGameToDbLibraryEntry,
  defaultGames,
  defaultSessionToDbSession,
  defaultSessions,
  downloadText,
  formatDuration,
  mergeImportedGame,
  parseBackupText,
  recordToImportPayload,
  screenMeta,
  systemRules,
  tacticalGoals,
  mergePlatformList,
  type BackupPayload,
  type BackupTables,
  type GameFormState,
  type GoalFormState,
  type ImportPreviewAction,
  type ImportPreviewEntry,
  type LibraryListFilter,
  type RestoreMode,
  type RestorePreview,
  type ScreenKey,
  type SessionFormState,
  type StatusFilter,
  type ImportSource,
  gamesToCsv,
  parseImportText,
} from "../backlog/shared";

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function useBacklogApp() {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [selectedListFilter, setSelectedListFilter] = useState<LibraryListFilter>("all");
  const [selectedGameId, setSelectedGameId] = useState(0);
  const [gameRows, setGameRows] = useState<DbGameMetadata[]>([]);
  const [libraryEntryRows, setLibraryEntryRows] = useState<DbLibraryEntry[]>([]);
  const [libraryEntryListRows, setLibraryEntryListRows] = useState<DbLibraryEntryList[]>([]);
  const [sessionRows, setSessionRows] = useState<DbPlaySession[]>([]);
  const [reviewRows, setReviewRows] = useState<DbReview[]>([]);
  const [tagRows, setTagRows] = useState<DbTag[]>([]);
  const [gameTagRows, setGameTagRows] = useState<DbGameTag[]>([]);
  const [goalRows, setGoalRows] = useState<DbGoal[]>([]);
  const [listRows, setListRows] = useState<DbList[]>([]);
  const [settingRows, setSettingRows] = useState<DbSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gameModalMode, setGameModalMode] = useState<"create" | "edit" | null>(null);
  const [gameForm, setGameForm] = useState<GameFormState>(() => createGameFormState());
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(() => createSessionFormState());
  const [sessionEditId, setSessionEditId] = useState<number | null>(null);
  const [goalModalMode, setGoalModalMode] = useState<"create" | "edit" | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>({ type: "finished", target: "", period: "monthly" });
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSource, setImportSource] = useState<ImportSource>("csv");
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreviewEntry[] | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [restoreText, setRestoreText] = useState("");
  const [restoreFileName, setRestoreFileName] = useState("");
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const refreshData = async (seed = false) => {
    let storedEntries = await db.libraryEntries.orderBy("updatedAt").reverse().toArray();
    if (seed && storedEntries.length === 0) {
      await db.transaction("rw", db.games, db.libraryEntries, async () => {
        await db.games.bulkPut(defaultGames.map(defaultGameToDbGame));
        await db.libraryEntries.bulkPut(defaultGames.map(defaultGameToDbLibraryEntry));
      });
      const existingSessions = await db.playSessions.count();
      if (existingSessions === 0) {
        await db.playSessions.bulkAdd(defaultSessions.map(defaultSessionToDbSession));
      }
      storedEntries = await db.libraryEntries.orderBy("updatedAt").reverse().toArray();
    }

    const [storedGames, storedSessions, storedReviews, storedTags, storedGameTags, storedGoals, storedLists, storedLibraryEntryLists, storedSettings] = await Promise.all([
      db.games.toArray(),
      db.playSessions.orderBy("date").reverse().toArray(),
      db.reviews.toArray(),
      db.tags.toArray(),
      db.gameTags.toArray(),
      db.goals.toArray(),
      db.lists.toArray(),
      db.libraryEntryLists.toArray(),
      db.settings.toArray(),
    ]);
    setGameRows(sortByUpdatedAtDesc(storedGames));
    setLibraryEntryRows(storedEntries);
    setSessionRows(storedSessions);
    setReviewRows(storedReviews);
    setTagRows(storedTags);
    setGameTagRows(storedGameTags);
    setGoalRows(storedGoals);
    setListRows(storedLists);
    setLibraryEntryListRows(storedLibraryEntryLists);
    setSettingRows(storedSettings);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await refreshData(true);
      } catch {
        if (active) setNotice("Falha ao carregar a biblioteca local.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (selectedListFilter === "all") return;
    if (listRows.some((list) => list.id === selectedListFilter)) return;
    setSelectedListFilter("all");
  }, [listRows, selectedListFilter]);

  const records = useMemo(() => composeLibraryRecords(gameRows, libraryEntryRows), [gameRows, libraryEntryRows]);
  const recordsByEntryId = useMemo(
    () => new Map(records.map((record) => [record.libraryEntry.id, record] as const)),
    [records],
  );
  const reviewByEntryId = useMemo(
    () => new Map(reviewRows.map((review) => [review.libraryEntryId, review] as const)),
    [reviewRows],
  );
  const tagById = useMemo(() => new Map(tagRows.map((tag) => [tag.id, tag] as const)), [tagRows]);
  const listById = useMemo(() => new Map(listRows.map((list) => [list.id, list] as const)), [listRows]);
  const games = useMemo(() => records.map(dbGameToUiGame), [records]);
  const displayName = useMemo(() => {
    const setting = settingRows.find((s) => s.key === "displayName");
    return setting?.value || "Backlog OS";
  }, [settingRows]);

  const findGame = (id: number) => games.find((game) => game.id === id);

  const { monthlyProgress, platformData, durationBuckets, stats, achievementCards } = useDashboardInsights({
    games,
    libraryEntryRows,
    sessionRows,
  });

  const { resolvedGoalRows, plannerGoalSignals, computedPlannerQueue, goalProgress } = usePlannerInsights({
    games,
    libraryEntryRows,
    sessionRows,
    goalRows,
    fallbackGoalProgress: tacticalGoals,
  });

  const matchesQuery = (values: Array<string | number>) => {
    if (!deferredQuery) return true;
    return values.some((value) => String(value).toLowerCase().includes(deferredQuery));
  };

  const { listOptions, searchedGames, libraryGames, selectedGame, selectedRecord, selectedGameLists } = useLibraryState({
    games,
    recordsByEntryId,
    tagById,
    listById,
    gameTagRows,
    libraryEntryListRows,
    query: deferredQuery,
    filter,
    selectedListFilter,
    selectedGameId,
  });

  useEffect(() => {
    if (selectedGameId > 0 && libraryGames.some((game) => game.id === selectedGameId)) {
      return;
    }
    if (libraryGames.length > 0) {
      setSelectedGameId(libraryGames[0].id);
      return;
    }
    if (selectedGameId > 0 && searchedGames.some((game) => game.id === selectedGameId)) {
      return;
    }
    if (searchedGames.length > 0) {
      setSelectedGameId(searchedGames[0].id);
      return;
    }
    if (games.length > 0) {
      setSelectedGameId(games[0].id);
      return;
    }
    if (selectedGameId !== 0) {
      setSelectedGameId(0);
    }
  }, [games, libraryGames, searchedGames, selectedGameId]);

  const selectedGamePage = useSelectedGamePage({
    selectedGame,
    selectedRecord,
    sessionRows,
    gameTagRows,
    libraryEntryListRows,
    tagById,
    listById,
    reviewByEntryId,
    goalRows: resolvedGoalRows,
    plannerGoalSignals,
  });

  const continuePlayingGames = useMemo(
    () =>
      games
        .filter((game) => game.status === "Jogando" || game.status === "Pausado")
        .sort(
          (left, right) =>
            computePlannerScore(right, plannerGoalSignals) - computePlannerScore(left, plannerGoalSignals),
        )
        .slice(0, 3)
        .filter((game) => matchesQuery([game.title, game.genre, game.platform, game.notes])),
    [games, plannerGoalSignals, deferredQuery],
  );
  const visiblePlannerQueue = useMemo(
    () =>
      computedPlannerQueue.filter((entry) => {
        const game = findGame(entry.gameId);
        return matchesQuery([game?.title ?? "", entry.reason, entry.fit, entry.eta]);
      }),
    [computedPlannerQueue, deferredQuery, games],
  );
  const visibleSessions = useMemo(
    () =>
      sessionRows.filter((entry) => {
        const game = findGame(entry.libraryEntryId);
        return matchesQuery([game?.title ?? "", game?.platform ?? "", entry.note ?? "", formatDuration(entry.durationMinutes)]);
      }),
    [deferredQuery, games, sessionRows],
  );

  const importPreviewSummary = useMemo(() => {
    const summary = { create: 0, update: 0, ignore: 0, fresh: 0, existing: 0, duplicates: 0 };
    for (const entry of importPreview ?? []) {
      if (entry.action === "create") summary.create += 1;
      if (entry.action === "update") summary.update += 1;
      if (entry.action === "ignore") summary.ignore += 1;
      if (entry.status === "new") summary.fresh += 1;
      if (entry.status === "existing") summary.existing += 1;
      summary.duplicates += entry.duplicateCount;
    }
    return summary;
  }, [importPreview]);

  const restorePreviewTotals = useMemo(() => (restorePreview?.items ?? []).reduce((totals, item) => { totals.create += item.create; totals.update += item.update; totals.skip += item.skip; return totals; }, { create: 0, update: 0, skip: 0 }), [restorePreview]);
  const heroCopy = screenMeta[screen];

  const closeGameModal = () => setGameModalMode(null);
  const openCreateGameModal = () => {
    setGameForm(createGameFormState());
    setGameModalMode("create");
  };
  const openEditGameModal = () => {
    if (!selectedGame) return;
    setGameForm(createGameFormState(selectedGame));
    setGameModalMode("edit");
  };
  const closeSessionModal = () => {
    setSessionModalOpen(false);
    setSessionEditId(null);
  };
  const openSessionModal = (gameId?: number) => {
    setSessionEditId(null);
    setSessionForm(createSessionFormState(gameId));
    setSessionModalOpen(true);
  };
  const openEditSessionModal = (session: DbPlaySession) => {
    if (!session.id) return;
    setSessionEditId(session.id);
    setSessionForm({
      gameId: String(session.libraryEntryId),
      date: session.date,
      durationMinutes: String(session.durationMinutes),
      completionPercent: session.completionPercent != null ? String(session.completionPercent) : "",
      mood: session.mood ?? "",
      note: session.note ?? "",
    });
    setSessionModalOpen(true);
  };
  const openGamePage = (gameId?: number) => {
    const nextGameId = typeof gameId === "number" ? gameId : selectedGame?.id;
    if (typeof nextGameId === "number" && nextGameId > 0) {
      setSelectedGameId(nextGameId);
      setScreen("game");
      return;
    }
    setScreen("library");
  };
  const resetImportPreview = () => setImportPreview(null);
  const openImportFlow = () => {
    setImportPreview(null);
    setImportModalOpen(true);
  };
  const closeImportFlow = () => {
    setImportModalOpen(false);
    setImportPreview(null);
    setImportText("");
    setImportFileName("");
    if (importFileInputRef.current) importFileInputRef.current.value = "";
  };
  const resetRestorePreview = () => setRestorePreview(null);
  const openRestoreFlow = () => {
    setRestorePreview(null);
    setRestoreModalOpen(true);
  };
  const closeRestoreFlow = () => {
    setRestoreModalOpen(false);
    setRestoreMode("merge");
    setRestoreText("");
    setRestoreFileName("");
    setRestorePreview(null);
    if (restoreFileInputRef.current) restoreFileInputRef.current.value = "";
  };

  const readBackupTables = async (): Promise<BackupTables> => {
    const [games, libraryEntries, playSessions, reviews, lists, libraryEntryLists, tags, gameTags, goals] = await Promise.all([
      db.games.toArray(),
      db.libraryEntries.toArray(),
      db.playSessions.toArray(),
      db.reviews.toArray(),
      db.lists.toArray(),
      db.libraryEntryLists.toArray(),
      db.tags.toArray(),
      db.gameTags.toArray(),
      db.goals.toArray(),
    ]);
    return { games, libraryEntries, playSessions, reviews, lists, libraryEntryLists, tags, gameTags, goals };
  };

  const handleGameFormChange = <K extends keyof GameFormState>(field: K, value: GameFormState[K]) => {
    setGameForm((current) => ({ ...current, [field]: value }));
  };
  const handleSessionFormChange = <K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) => {
    setSessionForm((current) => ({ ...current, [field]: value }));
  };
  const handleImportSourceChange = (value: ImportSource) => {
    setImportPreview(null);
    setImportSource(value);
  };
  const handleImportTextChange = (value: string) => {
    setImportPreview(null);
    setImportText(value);
  };
  const handleRestoreModeChange = (value: RestoreMode) => {
    setRestorePreview(null);
    setRestoreMode(value);
  };
  const handleRestoreTextChange = (value: string) => {
    setRestorePreview(null);
    setRestoreText(value);
  };
  const handleImportPreviewActionChange = (entryId: string, action: ImportPreviewAction) => {
    setImportPreview((current) => current?.map((entry) => (entry.id === entryId ? { ...entry, action } : entry)) ?? null);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setNotice("Arquivo muito grande. O limite é 10MB.");
      return;
    }
    try {
      const nextText = await file.text();
      setImportPreview(null);
      setImportText(nextText);
      setImportFileName(file.name);
      setNotice(`Arquivo ${file.name} carregado. Revise os dados e confirme a importação.`);
    } catch {
      setNotice("Falha ao ler o arquivo de importação.");
    }
  };

  const handleRestoreFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setNotice("Arquivo muito grande. O limite é 10MB.");
      return;
    }
    try {
      const nextText = await file.text();
      setRestorePreview(null);
      setRestoreText(nextText);
      setRestoreFileName(file.name);
      setNotice(`Backup ${file.name} carregado. Gere o preview antes de restaurar.`);
    } catch {
      setNotice("Falha ao ler o arquivo de backup.");
    }
  };

  const handleGameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!gameForm.title.trim()) {
      setNotice("Informe um título para o jogo.");
      return;
    }
    setSubmitting(true);

    const current = gameModalMode === "edit" ? selectedRecord : undefined;
    const payload = createDbGameFromForm(gameForm, current);
    let entryId = payload.libraryEntry.id;

    await db.transaction("rw", db.games, db.libraryEntries, async () => {
      let gameId = payload.game.id;
      if (gameId == null) {
        const existingMetadata = await db.games.where("normalizedTitle").equals(payload.game.normalizedTitle).first();
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
      entryId = Number(await db.libraryEntries.put({ ...payload.libraryEntry, gameId }));
    });

    await refreshData();
    setSubmitting(false);
    setGameModalMode(null);
    setSelectedGameId(entryId ?? selectedGameId);
    setScreen("library");
    setNotice(gameModalMode === "edit" ? "Jogo atualizado no catálogo." : "Jogo adicionado ao catálogo.");
  };

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      if (!importPreview) {
        const parsed = parseImportText(importSource, importText);
        if (parsed.length === 0) {
          setNotice("Nenhum item válido foi encontrado na importação.");
          return;
        }
        const preview = buildImportPreview(parsed, records);
        if (preview.length === 0) {
          setNotice("Nenhum item novo ou atualizável foi encontrado.");
          return;
        }
        setImportPreview(preview);
        setNotice(`Preview pronto com ${preview.length} itens consolidados.`);
        return;
      }

      let created = 0;
      let updated = 0;
      let ignored = 0;

      await db.transaction("rw", db.games, db.libraryEntries, async () => {
        for (const previewEntry of importPreview) {
          if (previewEntry.action === "ignore") {
            ignored += 1;
            continue;
          }

          if (previewEntry.action === "create" || previewEntry.existingId == null) {
            const existingMetadata = await db.games.where("normalizedTitle").equals(normalizeTitle(previewEntry.payload.title)).first();
            const createdRecord = createDbGameFromImport(previewEntry.payload, existingMetadata);
            let gameId = existingMetadata?.id;
            if (gameId == null) gameId = Number(await db.games.add(createdRecord.game));
            else {
              const baseMetadata = existingMetadata;
              if (!baseMetadata) continue;
              await db.games.put({
                ...baseMetadata,
                ...createdRecord.game,
                id: baseMetadata.id,
                platforms: mergePlatformList(baseMetadata.platforms, createdRecord.libraryEntry.platform),
              });
            }
            await db.libraryEntries.add({ ...createdRecord.libraryEntry, gameId });
            created += 1;
            continue;
          }

          const currentEntry = await db.libraryEntries.get(previewEntry.existingId);
          const currentGame = currentEntry ? await db.games.get(currentEntry.gameId) : undefined;
          if (!currentEntry || !currentGame) {
            ignored += 1;
            continue;
          }

          const merged = mergeImportedGame({ game: currentGame, libraryEntry: currentEntry }, previewEntry.payload);
          await db.games.put(merged.game);
          await db.libraryEntries.put({ ...merged.libraryEntry, gameId: merged.game.id ?? currentEntry.gameId });
          updated += 1;
        }
      });

      await refreshData();
      closeImportFlow();
      setScreen("library");
      setNotice(`${created} criados, ${updated} atualizados e ${ignored} ignorados na importação.`);
    } catch (error) {
      setNotice(`Falha ao processar importação: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (records.length === 0) {
      setNotice("A biblioteca está vazia para exportar.");
      return;
    }
    downloadText(`arsenal-gamer-${new Date().toISOString().slice(0, 10)}.csv`, gamesToCsv(records.map(recordToImportPayload)), "text/csv;charset=utf-8");
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
      tables.goals.length;
    if (totalRecords === 0) {
      setNotice("A base local está vazia para backup.");
      return;
    }
    const payload: BackupPayload = { version: 3, exportedAt: new Date().toISOString(), source: "mybacklog", ...tables };
    downloadText(`arsenal-gamer-backup-${payload.exportedAt.slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    setNotice("Backup JSON exportado.");
  };

  const handleRestoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      if (!restorePreview) {
        const payload = parseBackupText(restoreText);
        if (!payload) {
          setNotice("Arquivo de backup inválido.");
          return;
        }
        const preview = buildRestorePreview(payload, restoreMode, await readBackupTables());
        
        setRestorePreview(preview);
        setNotice(`Preview de restore pronto para ${payload.libraryEntries.length} itens da biblioteca.`);
        return;
      }

      if (restorePreview.mode === "replace") {
        const confirmed = window.confirm("Modo replace: toda a base local será apagada antes de restaurar. Deseja continuar?");
        if (!confirmed) return;
      }

      const payload = restorePreview.payload;
      await db.transaction("rw", [db.games, db.libraryEntries, db.playSessions, db.reviews, db.lists, db.libraryEntryLists, db.tags, db.gameTags, db.goals], async () => {
        if (restorePreview.mode === "replace") {
          await db.libraryEntryLists.clear();
          await db.gameTags.clear();
          await db.reviews.clear();
          await db.playSessions.clear();
          await db.goals.clear();
          await db.tags.clear();
          await db.lists.clear();
          await db.libraryEntries.clear();
          await db.games.clear();
          if (payload.games.length) await db.games.bulkPut(payload.games);
          if (payload.libraryEntries.length) await db.libraryEntries.bulkPut(payload.libraryEntries);
          if (payload.playSessions.length) await db.playSessions.bulkPut(payload.playSessions);
          if (payload.reviews.length) await db.reviews.bulkPut(payload.reviews);
          if (payload.lists.length) await db.lists.bulkPut(payload.lists);
          if (payload.libraryEntryLists.length) await db.libraryEntryLists.bulkPut(payload.libraryEntryLists);
          if (payload.tags.length) await db.tags.bulkPut(payload.tags);
          if (payload.gameTags.length) await db.gameTags.bulkPut(payload.gameTags);
          if (payload.goals.length) await db.goals.bulkPut(payload.goals);
          return;
        }

        const [existingGames, existingEntries, existingTags, existingLists, existingLibraryEntryLists, existingGoals, existingReviews, existingSessions, existingGameTags] = await Promise.all([
          db.games.toArray(),
          db.libraryEntries.toArray(),
          db.tags.toArray(),
          db.lists.toArray(),
          db.libraryEntryLists.toArray(),
          db.goals.toArray(),
          db.reviews.toArray(),
          db.playSessions.toArray(),
          db.gameTags.toArray(),
        ]);

        const existingGamesByTitle = new Map(existingGames.map((game) => [game.normalizedTitle || normalizeTitle(game.title), game]));
        const existingGamesById = new Map(existingGames.map((game) => [game.id, game]));
        const existingEntryByKey = new Map(
          existingEntries.map((entry) => {
            const game = existingGamesById.get(entry.gameId);
            return [`${game?.title.trim().toLowerCase() || ""}::${entry.platform.trim().toLowerCase()}`, entry] as const;
          }),
        );
        const existingTagMap = new Map(existingTags.map((tag) => [tag.name.trim().toLowerCase(), tag]));
        const existingListMap = new Map(existingLists.map((list) => [list.name.trim().toLowerCase(), list]));
        const libraryEntryListSet = new Set(existingLibraryEntryLists.map((entry) => `${entry.libraryEntryId}::${entry.listId}`));
        const existingGoalMap = new Map(existingGoals.map((goal) => [`${goal.type}::${goal.period}`, goal]));
        const existingReviewMap = new Map(existingReviews.map((review) => [review.libraryEntryId, review]));
        const sessionSet = new Set(existingSessions.map((session) => `${session.libraryEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`));
        const gameTagSet = new Set(existingGameTags.map((entry) => `${entry.libraryEntryId}::${entry.tagId}`));

        const payloadGamesById = new Map(payload.games.map((game) => [game.id, game]));
        const resolvedGameIdByPayloadId = new Map<number, number>();
        const resolvedEntryIdByPayloadId = new Map<number, number>();
        const resolvedListIdByPayloadId = new Map<number, number>();
        const resolvedTagIdByPayloadId = new Map<number, number>();

        for (const game of payload.games) {
          const normalized = game.normalizedTitle || normalizeTitle(game.title);
          const existing = existingGamesByTitle.get(normalized);
          if (existing?.id != null) {
            if (game.id != null) resolvedGameIdByPayloadId.set(game.id, existing.id);
            await db.games.put({ ...existing, ...game, id: existing.id, normalizedTitle: normalized, platforms: mergePlatformList(existing.platforms, game.platforms || "") });
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
      });

      await refreshData();
      closeRestoreFlow();
      setScreen("library");
      setNotice(restorePreview.mode === "replace" ? "Backup restaurado com substituição total da base local." : "Backup mesclado com a base local.");
    } catch (error) {
      setNotice(`Falha ao restaurar o backup: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSessionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const libraryEntryId = Number(sessionForm.gameId);
    const rawDuration = Number(sessionForm.durationMinutes) || 0;
    const currentEntry = libraryEntryRows.find((row) => row.id === libraryEntryId);
    if (!libraryEntryId || !currentEntry || rawDuration < 1) {
      setNotice("Preencha um jogo e uma duração válida para a sessão.");
      return;
    }
    const durationMinutes = Math.max(1, Math.round(rawDuration));
    const nextCompletion = sessionForm.completionPercent ? Math.max(0, Math.min(100, Number(sessionForm.completionPercent))) : undefined;
    setSubmitting(true);
    try {
      if (sessionEditId != null) {
        const oldSession = await db.playSessions.get(sessionEditId);
        await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
          await db.playSessions.update(sessionEditId, {
            date: sessionForm.date,
            durationMinutes,
            completionPercent: nextCompletion,
            mood: sessionForm.mood.trim() || undefined,
            note: sessionForm.note.trim() || undefined,
          });
          if (oldSession && currentEntry.id) {
            const timeDiff = durationMinutes - oldSession.durationMinutes;
            await db.libraryEntries.update(currentEntry.id, {
              playtimeMinutes: Math.max(0, currentEntry.playtimeMinutes + timeDiff),
              completionPercent: nextCompletion ?? currentEntry.completionPercent,
              updatedAt: new Date().toISOString(),
            });
          }
        });
      } else {
        const nextProgressStatus = nextCompletion === 100
          ? "finished"
          : currentEntry.progressStatus === "not_started" || currentEntry.progressStatus === "paused"
            ? "playing"
            : currentEntry.progressStatus;
        await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
          await db.playSessions.add({ libraryEntryId, date: sessionForm.date, platform: currentEntry.platform, durationMinutes, completionPercent: nextCompletion, mood: sessionForm.mood || currentEntry.mood, note: sessionForm.note.trim() || undefined });
          await db.libraryEntries.update(libraryEntryId, {
            ownershipStatus: currentEntry.ownershipStatus === "wishlist" ? "owned" : currentEntry.ownershipStatus,
            progressStatus: nextProgressStatus,
            completionPercent: nextCompletion ?? currentEntry.completionPercent,
            playtimeMinutes: currentEntry.playtimeMinutes + durationMinutes,
            mood: sessionForm.mood.trim() || currentEntry.mood,
            lastSessionAt: sessionForm.date,
            updatedAt: new Date().toISOString(),
          });
        });
      }
      await refreshData();
      setSessionModalOpen(false);
      setSessionEditId(null);
      setSelectedGameId(libraryEntryId);
      setNotice(sessionEditId != null ? "Sessão atualizada." : "Sessão registrada com sucesso.");
    } catch (error) {
      setNotice(`Falha ao salvar sessão: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
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
    const reviewData = {
      libraryEntryId,
      score,
      shortReview: payload.shortReview.trim() || undefined,
      longReview: payload.longReview.trim() || undefined,
      pros: payload.pros.trim() || undefined,
      cons: payload.cons.trim() || undefined,
      recommend: payload.recommend || undefined,
      hasSpoiler: payload.hasSpoiler || undefined,
    };
    const hasContent = Object.entries(reviewData).some(
      ([key, value]) => key !== "libraryEntryId" && value != null && value !== "",
    );

    await db.transaction("rw", db.reviews, db.libraryEntries, async () => {
      const existingReview = await db.reviews.where("libraryEntryId").equals(libraryEntryId).first();

      if (hasContent) {
        if (existingReview?.id != null) await db.reviews.put({ ...existingReview, ...reviewData, id: existingReview.id });
        else await db.reviews.add(reviewData);
      } else if (existingReview?.id != null) {
        await db.reviews.delete(existingReview.id);
      }

      await db.libraryEntries.update(libraryEntryId, {
        personalRating: score,
        updatedAt: new Date().toISOString(),
      });
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

    await db.transaction("rw", db.tags, db.gameTags, async () => {
      const existingTags = await db.tags.toArray();
      const tagsByName = new Map(existingTags.map((tag) => [tag.name.trim().toLowerCase(), tag] as const));
      const currentRelations = await db.gameTags.where("libraryEntryId").equals(libraryEntryId).toArray();
      const nextTagIds = new Set<number>();

      for (const name of names) {
        const key = name.toLowerCase();
        const existing = tagsByName.get(key);
        if (existing?.id != null) {
          nextTagIds.add(existing.id);
          continue;
        }

        const tagId = Number(await db.tags.add({ name }));
        tagsByName.set(key, { id: tagId, name });
        nextTagIds.add(tagId);
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
        if (!nextListIds.includes(relation.listId) && relation.id != null) {
          await db.libraryEntryLists.delete(relation.id);
        }
      }

      for (const listId of nextListIds) {
        if (!currentListIds.has(listId)) {
          await db.libraryEntryLists.add({ libraryEntryId, listId, createdAt: new Date().toISOString() });
        }
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

  // ── Goal CRUD ──
  const closeGoalModal = () => setGoalModalMode(null);
  const openCreateGoalModal = () => {
    setGoalForm({ type: "finished", target: "", period: "monthly" });
    setEditingGoalId(null);
    setGoalModalMode("create");
  };
  const openEditGoalModal = (goal: DbGoal) => {
    setGoalForm({ type: goal.type, target: String(goal.target), period: goal.period });
    setEditingGoalId(goal.id ?? null);
    setGoalModalMode("edit");
  };
  const handleGoalFormChange = <K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) => {
    setGoalForm((current) => ({ ...current, [field]: value }));
  };
  const handleGoalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const target = Number(goalForm.target);
    if (!target || target <= 0) {
      setNotice("Informe um valor alvo maior que zero.");
      return;
    }
    setSubmitting(true);
    try {
      const goalData = { type: goalForm.type as GoalType, target, current: 0, period: goalForm.period as Period };
      if (editingGoalId != null) {
        await db.goals.update(editingGoalId, { type: goalData.type, target: goalData.target, period: goalData.period });
      } else {
        await db.goals.add(goalData);
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
    await db.goals.delete(goalId);
    await refreshData();
    setNotice("Meta removida.");
  };

  // ── List CRUD ──
  const handleListCreate = async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setNotice("Informe um nome para a lista.");
      return;
    }
    const existing = await db.lists
      .filter((list) => list.name.trim().toLowerCase() === normalizedName.toLowerCase())
      .first();
    if (existing) {
      setNotice("Essa lista já existe.");
      return;
    }
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

  // ── Settings ──
  const handleSettingSave = async (key: string, value: string) => {
    const existing = await db.settings.where("key").equals(key).first();
    if (existing?.id != null) {
      await db.settings.update(existing.id, { value, updatedAt: new Date().toISOString() });
    } else {
      await db.settings.add({ key, value, updatedAt: new Date().toISOString() });
    }
    await refreshData();
    setNotice("Configuração salva.");
  };

  // ── Session delete ──
  const handleSessionDelete = async (sessionId: number) => {
    const confirmed = window.confirm("Excluir esta sessão?");
    if (!confirmed) return;
    const session = await db.playSessions.get(sessionId);
    if (!session) return;
    await db.transaction("rw", db.playSessions, db.libraryEntries, async () => {
      await db.playSessions.delete(sessionId);
      const entry = await db.libraryEntries.get(session.libraryEntryId);
      if (entry?.id) {
        await db.libraryEntries.update(entry.id, {
          playtimeMinutes: Math.max(0, entry.playtimeMinutes - session.durationMinutes),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    await refreshData();
    setNotice("Sessão excluída.");
  };

  const openLibraryGame = (gameId?: number) => {
    if (typeof gameId === "number" && gameId > 0) setSelectedGameId(gameId);
    setScreen("library");
  };

  return {
    screen, setScreen, query, setQuery, filter, setFilter, selectedListFilter, setSelectedListFilter, selectedGameId, setSelectedGameId,
    loading, notice, submitting, heroCopy, games, libraryGames, selectedGame, selectedGamePage, monthlyProgress, platformData,
    durationBuckets, visibleSessions, visiblePlannerQueue, continuePlayingGames, stats, goalProgress,
    achievementCards, systemRules, findGame, gameModalMode, gameForm, sessionModalOpen, sessionForm,
    sessionEditId, goalRows: resolvedGoalRows, listRows, listOptions, selectedGameLists, displayName,
    goalModalMode, goalForm,
    importModalOpen, importSource, importText, importFileName, importPreview, importPreviewSummary,
    importFileInputRef, restoreModalOpen, restoreMode, restoreText, restoreFileName, restorePreview,
    restorePreviewTotals, restoreFileInputRef, openCreateGameModal, openEditGameModal, closeGameModal,
    openSessionModal, closeSessionModal, openEditSessionModal, openImportFlow, closeImportFlow, resetImportPreview,
    openRestoreFlow, closeRestoreFlow, resetRestorePreview, handleGameFormChange, handleSessionFormChange,
    handleImportSourceChange, handleImportTextChange, handleRestoreModeChange, handleRestoreTextChange,
    handleImportPreviewActionChange, handleImportFileChange, handleRestoreFileChange, handleGameSubmit,
    handleImportSubmit, handleExport, handleBackupExport, handleRestoreSubmit, handleSessionSubmit,
    handleDeleteSelectedGame, handleResumeSelectedGame, handleFavoriteSelectedGame, handleGameReviewSave,
    handleGameTagsSave, handleGameListsSave, handleSendSelectedToPlanner, openLibraryGame, openGamePage,
    handleSessionDelete,
    openCreateGoalModal, openEditGoalModal, closeGoalModal, handleGoalFormChange, handleGoalSubmit, handleGoalDelete,
    handleListCreate, handleListDelete, handleSettingSave,
  };
}
