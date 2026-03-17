import { useState, useMemo, useEffect } from "react";
import { db } from "../../../core/db";
import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../../../core/types";
import { composeLibraryRecords, dbGameToUiGame } from "../utils";
import { sortByUpdatedAtDesc } from "../../../hooks/useBacklogApp"; // Temporary until moved to core/utils
import type { Game, LibraryRecord, StatusFilter } from "../../../backlog/shared";

export function useLibrary() {
  const [gameRows, setGameRows] = useState<DbGameMetadata[]>([]);
  const [libraryEntryRows, setLibraryEntryRows] = useState<DbLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = async () => {
    try {
      const [storedGames, storedEntries] = await Promise.all([
        db.games.toArray(),
        db.libraryEntries.orderBy("updatedAt").reverse().toArray()
      ]);
      setGameRows(sortByUpdatedAtDesc(storedGames));
      setLibraryEntryRows(storedEntries);
    } catch (e) {
      setError("Falha ao carregar a biblioteca local.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, []);

  const records = useMemo(() => composeLibraryRecords(gameRows, libraryEntryRows), [gameRows, libraryEntryRows]);
  
  const games = useMemo(() => records.map(dbGameToUiGame), [records]);

  const findRecord = (entryId: number) => records.find(r => r.libraryEntry.id === entryId);
  const findGame = (id: number) => games.find((game) => game.id === id);

  return {
    gameRows,
    libraryEntryRows,
    records,
    games,
    loading,
    error,
    refreshLibrary,
    findRecord,
    findGame,
  };
}
