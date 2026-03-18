import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { db } from "../core/db";
import type {
  Game as DbGameMetadata,
  GameTag as DbGameTag,
  Goal as DbGoal,
  LibraryEntry as DbLibraryEntry,
  PlaySession as DbPlaySession,
  Review as DbReview,
  Tag as DbTag,
} from "../core/types";
import { buildGamePageData } from "../modules/game-page/utils/gamePageData";
import {
  backlogByDuration,
  buildImportPreview,
  buildPlannerFit,
  buildPlannerReason,
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
  formatMonthLabel,
  mergeImportedGame,
  parseBackupText,
  parseEtaHours,
  plannerQueue,
  platformDistribution,
  profileAchievements,
  recordToImportPayload,
  screenMeta,
  systemRules,
  tacticalGoals,
  yearlyEvolution,
  mergePlatformList,
  type Achievement,
  type BackupPayload,
  type BackupTables,
  type GameFormState,
  type Goal,
  type ImportPreviewAction,
  type ImportPreviewEntry,
  type PiePoint,
  type PlannerEntry,
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

function isSameMonth(date: Date, target: Date): boolean {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function formatPositiveHours(hours: number): string {
  return `+${hours}h em 7 dias`;
}

export function useBacklogApp() {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [selectedGameId, setSelectedGameId] = useState(0);
  const [gameRows, setGameRows] = useState<DbGameMetadata[]>([]);
  const [libraryEntryRows, setLibraryEntryRows] = useState<DbLibraryEntry[]>([]);
  const [sessionRows, setSessionRows] = useState<DbPlaySession[]>([]);
  const [reviewRows, setReviewRows] = useState<DbReview[]>([]);
  const [tagRows, setTagRows] = useState<DbTag[]>([]);
  const [gameTagRows, setGameTagRows] = useState<DbGameTag[]>([]);
  const [goalRows, setGoalRows] = useState<DbGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gameModalMode, setGameModalMode] = useState<"create" | "edit" | null>(null);
  const [gameForm, setGameForm] = useState<GameFormState>(() => createGameFormState());
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(() => createSessionFormState());
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

    const [storedGames, storedSessions, storedReviews, storedTags, storedGameTags, storedGoals] = await Promise.all([
      db.games.toArray(),
      db.playSessions.orderBy("date").reverse().toArray(),
      db.reviews.toArray(),
      db.tags.toArray(),
      db.gameTags.toArray(),
      db.goals.toArray(),
    ]);
    setGameRows(sortByUpdatedAtDesc(storedGames));
    setLibraryEntryRows(storedEntries);
    setSessionRows(storedSessions);
    setReviewRows(storedReviews);
    setTagRows(storedTags);
    setGameTagRows(storedGameTags);
    setGoalRows(storedGoals);
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
  const games = useMemo(() => records.map(dbGameToUiGame), [records]);
  const findRecord = (entryId: number) => recordsByEntryId.get(entryId);
  const findGame = (id: number) => games.find((game) => game.id === id);

  const monthlyProgress = useMemo(() => {
    if (libraryEntryRows.length === 0) return yearlyEvolution;
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return { month: formatMonthLabel(date), key: `${date.getFullYear()}-${date.getMonth()}`, started: 0, finished: 0 };
    });
    const monthMap = new Map(months.map((entry) => [entry.key, entry]));
    for (const entry of libraryEntryRows) {
      const createdKey = `${new Date(entry.createdAt).getFullYear()}-${new Date(entry.createdAt).getMonth()}`;
      if (entry.ownershipStatus !== "wishlist") {
        const createdBucket = monthMap.get(createdKey);
        if (createdBucket) createdBucket.started += 1;
      }
      if (entry.progressStatus === "finished" || entry.progressStatus === "completed_100") {
        const finishedAt = new Date(entry.updatedAt);
        const finishedBucket = monthMap.get(`${finishedAt.getFullYear()}-${finishedAt.getMonth()}`);
        if (finishedBucket) finishedBucket.finished += 1;
      }
    }
    return months.map(({ month, started, finished }) => ({ month, started, finished }));
  }, [libraryEntryRows]);

  const platformData = useMemo<PiePoint[]>(() => {
    if (games.length === 0) return platformDistribution;
    const counts = new Map<string, number>();
    for (const game of games) counts.set(game.platform, (counts.get(game.platform) || 0) + 1);
    const total = games.length;
    return Array.from(counts.entries())
      .sort(([, left], [, right]) => right - left)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: Math.max(1, Math.round((value / total) * 100)) }));
  }, [games]);

  const durationBuckets = useMemo(() => {
    if (games.length === 0) return backlogByDuration;
    const buckets = [{ name: "Até 10h", total: 0 }, { name: "10-25h", total: 0 }, { name: "25-50h", total: 0 }, { name: "50h+", total: 0 }];
    for (const game of games) {
      if (game.status === "Terminado" || game.status === "Wishlist") continue;
      const etaHours = parseEtaHours(game.eta);
      if (!Number.isFinite(etaHours) || etaHours > 50) buckets[3].total += 1;
      else if (etaHours > 25) buckets[2].total += 1;
      else if (etaHours > 10) buckets[1].total += 1;
      else buckets[0].total += 1;
    }
    return buckets;
  }, [games]);

  const computedPlannerQueue = useMemo<PlannerEntry[]>(() => {
    if (games.length === 0) return plannerQueue;
    return games
      .filter((game) => game.status !== "Terminado" && game.status !== "Wishlist")
      .sort((left, right) => computePlannerScore(right) - computePlannerScore(left))
      .slice(0, 4)
      .map((game, index) => ({ rank: index + 1, gameId: game.id, reason: buildPlannerReason(game), eta: game.eta, fit: buildPlannerFit(game) }));
  }, [games]);

  const goalProgress = useMemo<Goal[]>(() => {
    if (games.length === 0) return tacticalGoals;
    const shortTarget = games.filter((game) => game.status === "Terminado" && parseEtaHours(game.eta) <= 12).length;
    const sessionsThisWeek = sessionRows.filter((session) => Date.now() - new Date(session.date).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
    const backlogCount = games.filter((game) => game.status === "Backlog").length;
    return [
      { label: "Finalizar 1 jogo curto", value: Math.min(100, shortTarget * 100), tone: "sunset" },
      { label: "Registrar 5 sessões", value: Math.min(100, Math.round((sessionsThisWeek / 5) * 100)), tone: "violet" },
      { label: "Reduzir backlog em 2 jogos", value: Math.max(0, Math.min(100, 100 - Math.round((backlogCount / Math.max(2, games.length || 1)) * 100))), tone: "yellow" },
    ];
  }, [games, sessionRows]);

  const achievementCards = useMemo<Achievement[]>(() => {
    if (games.length === 0) return profileAchievements;
    const largestBucket = durationBuckets.reduce((current, entry) => (entry.total > current.total ? entry : current), durationBuckets[0] || { name: "Até 10h", total: 0 });
    return [
      { icon: profileAchievements[0].icon, tone: "emerald", title: `${games.filter((game) => game.status === "Terminado").length} jogos finalizados`, description: "Histórico sólido e biblioteca viva." },
      { icon: profileAchievements[1].icon, tone: "cyan", title: "Radar de progresso ativo", description: `${games.filter((game) => game.status === "Jogando").length} jogos com acompanhamento contínuo.` },
      { icon: profileAchievements[2].icon, tone: "magenta", title: `${games.filter((game) => game.status === "Pausado").length} jogos pausados`, description: "Baixo atrito para retomar e gerar avanço real." },
      { icon: profileAchievements[3].icon, tone: "yellow", title: "Gargalo de médio porte", description: `${largestBucket?.name || "Até 10h"} segue como principal bloco do backlog.` },
    ];
  }, [durationBuckets, games]);

  const matchesCollection = (values: Array<string | number>) => {
    if (!deferredQuery) return true;
    return values.some((value) => String(value).toLowerCase().includes(deferredQuery));
  };

  const tagNamesByEntryId = useMemo(() => {
    const map = new Map<number, string>();
    for (const relation of gameTagRows) {
      const tag = tagById.get(relation.tagId);
      if (!tag) continue;
      const current = map.get(relation.libraryEntryId) ?? "";
      map.set(relation.libraryEntryId, current ? `${current}, ${tag.name}` : tag.name);
    }
    return map;
  }, [gameTagRows, tagById]);

  const searchedGames = useMemo(() => games.filter((game) => matchesCollection([game.title, game.platform, game.genre, game.mood, game.notes, game.difficulty, tagNamesByEntryId.get(game.id) ?? ""])), [deferredQuery, games, tagNamesByEntryId]);
  const libraryGames = useMemo(() => searchedGames.filter((game) => (filter === "Todos" ? true : game.status === filter)), [filter, searchedGames]);

  useEffect(() => {
    if (selectedGameId > 0 && games.some((game) => game.id === selectedGameId)) {
      return;
    }
    if (libraryGames.length > 0) {
      setSelectedGameId(libraryGames[0].id);
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

  const selectedGame =
    libraryGames.find((game) => game.id === selectedGameId) ??
    searchedGames.find((game) => game.id === selectedGameId) ??
    findGame(selectedGameId) ??
    games[0];
  const selectedRecord = selectedGame ? findRecord(selectedGame.id) : undefined;
  const selectedGamePage = useMemo(() => {
    if (!selectedGame || !selectedRecord?.libraryEntry.id) return null;
    const entryId = selectedRecord.libraryEntry.id;
    const sessions = sessionRows.filter((session) => session.libraryEntryId === entryId);
    const tags = gameTagRows
      .filter((relation) => relation.libraryEntryId === entryId)
      .map((relation) => tagById.get(relation.tagId))
      .filter((tag): tag is DbTag => Boolean(tag));

    return buildGamePageData({
      game: selectedGame,
      record: selectedRecord,
      sessions,
      review: reviewByEntryId.get(entryId),
      tags,
      goals: goalRows,
    });
  }, [gameTagRows, goalRows, reviewByEntryId, selectedGame, selectedRecord, sessionRows, tagById]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const total = games.length;
    const backlog = games.filter((game) => game.status === "Backlog").length;
    const playing = games.filter((game) => game.status === "Jogando").length;
    const finished = games.filter((game) => game.status === "Terminado").length;
    const hours = games.reduce((totalHours, game) => totalHours + game.hours, 0);
    const addedThisMonth = libraryEntryRows.filter((entry) => isSameMonth(new Date(entry.createdAt), now)).length;
    const highPriorityBacklog = games.filter((game) => game.status === "Backlog" && game.priority === "Alta").length;
    const sessionsThisWeek = sessionRows.filter((session) => new Date(session.date).getTime() >= weekAgo).length;
    const recentHours = Math.round(
      sessionRows
        .filter((session) => new Date(session.date).getTime() >= weekAgo)
        .reduce((totalMinutes, session) => totalMinutes + session.durationMinutes, 0) / 60,
    );
    const completionRate = total > 0 ? Math.round((finished / total) * 100) : 0;
    return {
      total,
      backlog,
      playing,
      finished,
      hours,
      totalDelta: addedThisMonth > 0 ? `+${addedThisMonth} este mês` : "sem novos este mês",
      backlogDelta:
        highPriorityBacklog > 0
          ? `${highPriorityBacklog} alta prioridade`
          : "sem pressão tática",
      playingDelta:
        sessionsThisWeek > 0
          ? `${sessionsThisWeek} sessões na semana`
          : "sem sessões recentes",
      finishedDelta: `${completionRate}% de conclusão`,
      hoursDelta: formatPositiveHours(recentHours),
    };
  }, [games, libraryEntryRows, sessionRows]);

  const continuePlayingGames = useMemo(() => games.filter((game) => game.status === "Jogando" || game.status === "Pausado").sort((left, right) => computePlannerScore(right) - computePlannerScore(left)).slice(0, 3).filter((game) => matchesCollection([game.title, game.genre, game.platform, game.notes])), [deferredQuery, games]);
  const visiblePlannerQueue = useMemo(() => computedPlannerQueue.filter((entry) => { const game = findGame(entry.gameId); return matchesCollection([game?.title ?? "", entry.reason, entry.fit, entry.eta]); }), [computedPlannerQueue, deferredQuery, games]);
  const visibleSessions = useMemo(() => sessionRows.filter((entry) => { const game = findGame(entry.libraryEntryId); return matchesCollection([game?.title ?? "", game?.platform ?? "", entry.note ?? "", formatDuration(entry.durationMinutes)]); }), [deferredQuery, games, sessionRows]);

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
  const closeSessionModal = () => setSessionModalOpen(false);
  const openSessionModal = (gameId?: number) => {
    setSessionForm(createSessionFormState(gameId));
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
    const [games, libraryEntries, playSessions, reviews, lists, tags, gameTags, goals] = await Promise.all([
      db.games.toArray(),
      db.libraryEntries.toArray(),
      db.playSessions.toArray(),
      db.reviews.toArray(),
      db.lists.toArray(),
      db.tags.toArray(),
      db.gameTags.toArray(),
      db.goals.toArray(),
    ]);
    return { games, libraryEntries, playSessions, reviews, lists, tags, gameTags, goals };
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
    const totalRecords = tables.games.length + tables.libraryEntries.length + tables.playSessions.length + tables.reviews.length + tables.lists.length + tables.tags.length + tables.gameTags.length + tables.goals.length;
    if (totalRecords === 0) {
      setNotice("A base local está vazia para backup.");
      return;
    }
    const payload: BackupPayload = { version: 2, exportedAt: new Date().toISOString(), source: "mybacklog", ...tables };
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
      await db.transaction("rw", [db.games, db.libraryEntries, db.playSessions, db.reviews, db.lists, db.tags, db.gameTags, db.goals], async () => {
        if (restorePreview.mode === "replace") {
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
          if (payload.tags.length) await db.tags.bulkPut(payload.tags);
          if (payload.gameTags.length) await db.gameTags.bulkPut(payload.gameTags);
          if (payload.goals.length) await db.goals.bulkPut(payload.goals);
          return;
        }

        const [existingGames, existingEntries, existingTags, existingLists, existingGoals, existingReviews, existingSessions, existingGameTags] = await Promise.all([
          db.games.toArray(),
          db.libraryEntries.toArray(),
          db.tags.toArray(),
          db.lists.toArray(),
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
        const existingGoalMap = new Map(existingGoals.map((goal) => [`${goal.type}::${goal.period}`, goal]));
        const existingReviewMap = new Map(existingReviews.map((review) => [review.libraryEntryId, review]));
        const sessionSet = new Set(existingSessions.map((session) => `${session.libraryEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`));
        const gameTagSet = new Set(existingGameTags.map((entry) => `${entry.libraryEntryId}::${entry.tagId}`));

        const payloadGamesById = new Map(payload.games.map((game) => [game.id, game]));
        const resolvedGameIdByPayloadId = new Map<number, number>();
        const resolvedEntryIdByPayloadId = new Map<number, number>();
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
          if (existing?.id != null) await db.lists.put({ ...existing, ...list, id: existing.id });
          else await db.lists.add({ ...list, id: undefined, name: list.name.trim() });
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
    setSubmitting(false);
    await refreshData();
    setSessionModalOpen(false);
    setSelectedGameId(libraryEntryId);
    setNotice("Sessão registrada com sucesso.");
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

  const handleDeleteSelectedGame = async () => {
    if (!selectedRecord || !selectedGame) return;
    const confirmed = window.confirm(`Excluir ${selectedGame.title} da biblioteca?`);
    if (!confirmed) return;
    await db.transaction("rw", [db.games, db.libraryEntries, db.playSessions, db.reviews, db.gameTags], async () => {
      const entryId = selectedRecord.libraryEntry.id!;
      await db.playSessions.where("libraryEntryId").equals(entryId).delete();
      await db.reviews.where("libraryEntryId").equals(entryId).delete();
      await db.gameTags.where("libraryEntryId").equals(entryId).delete();
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

  const openLibraryGame = (gameId?: number) => {
    if (typeof gameId === "number" && gameId > 0) setSelectedGameId(gameId);
    setScreen("library");
  };

  return {
    screen, setScreen, query, setQuery, filter, setFilter, selectedGameId, setSelectedGameId,
    loading, notice, submitting, heroCopy, games, libraryGames, selectedGame, selectedGamePage, monthlyProgress, platformData,
    durationBuckets, visibleSessions, visiblePlannerQueue, continuePlayingGames, stats, goalProgress,
    achievementCards, systemRules, findGame, gameModalMode, gameForm, sessionModalOpen, sessionForm,
    importModalOpen, importSource, importText, importFileName, importPreview, importPreviewSummary,
    importFileInputRef, restoreModalOpen, restoreMode, restoreText, restoreFileName, restorePreview,
    restorePreviewTotals, restoreFileInputRef, openCreateGameModal, openEditGameModal, closeGameModal,
    openSessionModal, closeSessionModal, openImportFlow, closeImportFlow, resetImportPreview,
    openRestoreFlow, closeRestoreFlow, resetRestorePreview, handleGameFormChange, handleSessionFormChange,
    handleImportSourceChange, handleImportTextChange, handleRestoreModeChange, handleRestoreTextChange,
    handleImportPreviewActionChange, handleImportFileChange, handleRestoreFileChange, handleGameSubmit,
    handleImportSubmit, handleExport, handleBackupExport, handleRestoreSubmit, handleSessionSubmit,
    handleDeleteSelectedGame, handleResumeSelectedGame, handleFavoriteSelectedGame, handleGameReviewSave,
    handleGameTagsSave, handleSendSelectedToPlanner, openLibraryGame, openGamePage,
  };
}
