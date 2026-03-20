import { useState } from "react";

export function useLibrarySelectionState() {
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<number[]>([]);

  const toggleLibrarySelection = (gameId: number) =>
    setSelectedLibraryIds((current) =>
      current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId],
    );

  const clearLibrarySelection = () => setSelectedLibraryIds([]);

  const selectVisibleLibraryGames = (gameIds: number[]) =>
    setSelectedLibraryIds(Array.from(new Set(gameIds.filter((gameId) => gameId > 0))));

  return {
    selectedLibraryIds,
    setSelectedLibraryIds,
    toggleLibrarySelection,
    clearLibrarySelection,
    selectVisibleLibraryGames,
  };
}
