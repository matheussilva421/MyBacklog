import { useEffect, useMemo, useState } from "react";
import { db } from "../../../core/db";
import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../../../core/types";
import { composeLibraryRecords, dbGameToUiGame } from "../utils";

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function useLibrary() {
  const [gameRows, setGameRows] = useState<DbGameMetadata[]>([]);
  const [libraryEntryRows, setLibraryEntryRows] = useState<DbLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = async () => {
    try {
      const [storedGames, storedEntries] = await Promise.all([
        db.games.toArray(),
        db.libraryEntries.orderBy("updatedAt").reverse().toArray(),
      ]);
      setGameRows(sortByUpdatedAtDesc(storedGames));
      setLibraryEntryRows(storedEntries);
      setError(null);
    } catch {
      setError("Falha ao carregar a biblioteca local.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshLibrary();
  }, []);

  const records = useMemo(() => composeLibraryRecords(gameRows, libraryEntryRows), [gameRows, libraryEntryRows]);
  const games = useMemo(() => records.map(dbGameToUiGame), [records]);

  const findRecord = (entryId: number) => records.find((record) => record.libraryEntry.id === entryId);
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
