import { useMemo } from "react";
import type { Game, LibraryEntry, PlaySession } from "../../../core/types";
import { buildCatalogAuditReport } from "../utils/catalogAudit";

export function useCatalogAuditState(args: {
  gameRows: Game[];
  libraryEntryRows: LibraryEntry[];
  sessionRows: PlaySession[];
}) {
  const { gameRows, libraryEntryRows, sessionRows } = args;

  return useMemo(
    () =>
      buildCatalogAuditReport({
        games: gameRows,
        libraryEntries: libraryEntryRows,
        sessions: sessionRows,
      }),
    [gameRows, libraryEntryRows, sessionRows],
  );
}
