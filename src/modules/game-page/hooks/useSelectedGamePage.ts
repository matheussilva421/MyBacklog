import { useMemo } from "react";
import type { Game, LibraryRecord } from "../../../backlog/shared";
import type { Goal, LibraryEntryList, List, PlaySession, Review, Tag } from "../../../core/types";
import type { PlannerGoalSignals } from "../../planner/utils/goals";
import type { AppPreferences } from "../../settings/utils/preferences";
import { buildGamePageData } from "../utils/gamePageData";

type UseSelectedGamePageArgs = {
  selectedGame?: Game;
  selectedRecord?: LibraryRecord;
  sessionRows: PlaySession[];
  storeNamesByEntryId: Map<number, string[]>;
  platformNamesByGameId: Map<number, string[]>;
  gameTagRows: Array<{ libraryEntryId: number; tagId: number }>;
  libraryEntryListRows: LibraryEntryList[];
  tagById: Map<number | undefined, Tag>;
  listById: Map<number | undefined, List>;
  reviewByEntryId: Map<number, Review>;
  goalRows: Goal[];
  plannerGoalSignals: PlannerGoalSignals;
  preferences: AppPreferences;
};

export function useSelectedGamePage({
  selectedGame,
  selectedRecord,
  sessionRows,
  storeNamesByEntryId,
  platformNamesByGameId,
  gameTagRows,
  libraryEntryListRows,
  tagById,
  listById,
  reviewByEntryId,
  goalRows,
  plannerGoalSignals,
  preferences,
}: UseSelectedGamePageArgs) {
  return useMemo(() => {
    if (!selectedGame || !selectedRecord?.libraryEntry.id) return null;

    const entryId = selectedRecord.libraryEntry.id;
    const sessions = sessionRows.filter((session) => session.libraryEntryId === entryId);
    const tags = gameTagRows
      .filter((relation) => relation.libraryEntryId === entryId)
      .map((relation) => tagById.get(relation.tagId))
      .filter((tag): tag is Tag => Boolean(tag));
    const lists = libraryEntryListRows
      .filter((relation) => relation.libraryEntryId === entryId)
      .map((relation) => listById.get(relation.listId))
      .filter((list): list is List => Boolean(list));

    return buildGamePageData({
      game: selectedGame,
      record: selectedRecord,
      storeNames: storeNamesByEntryId.get(entryId) ?? selectedGame.stores ?? [selectedGame.sourceStore],
      platformNames:
        selectedRecord.game.id != null
          ? (platformNamesByGameId.get(selectedRecord.game.id) ?? selectedGame.platforms ?? [selectedGame.platform])
          : (selectedGame.platforms ?? [selectedGame.platform]),
      sessions,
      review: reviewByEntryId.get(entryId),
      tags,
      lists,
      goals: goalRows,
      goalSignals: plannerGoalSignals,
      preferences,
    });
  }, [
    gameTagRows,
    goalRows,
    libraryEntryListRows,
    listById,
    platformNamesByGameId,
    plannerGoalSignals,
    preferences,
    reviewByEntryId,
    selectedGame,
    selectedRecord,
    sessionRows,
    storeNamesByEntryId,
    tagById,
  ]);
}
