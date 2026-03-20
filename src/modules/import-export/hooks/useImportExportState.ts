import { useMemo, useRef, useState, type ChangeEvent } from "react";
import type {
  ImportPreviewAction,
  ImportPreviewEntry,
  ImportSource,
  RestoreMode,
  RestorePreview,
} from "../../../backlog/shared";

const maxFileSize = 10 * 1024 * 1024;

export function useImportExportState(setNotice: (value: string | null) => void) {
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

  const importPreviewSummary = useMemo(() => {
    const summary = {
      create: 0,
      update: 0,
      ignore: 0,
      fresh: 0,
      existing: 0,
      review: 0,
      duplicates: 0,
      assisted: 0,
      maintenance: 0,
    };
    for (const entry of importPreview ?? []) {
      if (entry.action === "create") summary.create += 1;
      if (entry.action === "update") summary.update += 1;
      if (entry.action === "ignore") summary.ignore += 1;
      if (entry.status === "new") summary.fresh += 1;
      if (entry.status === "existing") summary.existing += 1;
      if (entry.status === "review") summary.review += 1;
      summary.duplicates += entry.duplicateCount;
      if (entry.confidenceScore >= 78 && entry.selectedMatchId != null) summary.assisted += 1;
      if (entry.maintenanceSignals.length > 0) summary.maintenance += 1;
    }
    return summary;
  }, [importPreview]);

  const restorePreviewTotals = useMemo(
    () =>
      (restorePreview?.items ?? []).reduce(
        (totals, item) => {
          totals.create += item.create;
          totals.update += item.update;
          totals.skip += item.skip;
          return totals;
        },
        { create: 0, update: 0, skip: 0 },
      ),
    [restorePreview],
  );

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

  const handleImportPreviewMatchChange = (entryId: string, matchId: number | null) => {
    setImportPreview((current) =>
      current?.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              selectedMatchId: matchId,
              selectedGameId: matchId != null ? null : entry.selectedGameId,
              action: matchId != null ? "update" : entry.action === "ignore" ? "ignore" : "create",
            }
          : entry,
      ) ?? null,
    );
  };

  const handleImportPreviewGameChange = (entryId: string, gameId: number | null) => {
    setImportPreview((current) =>
      current?.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              selectedGameId: gameId,
              selectedMatchId: gameId != null ? null : entry.selectedMatchId,
              action: gameId != null && entry.action === "update" ? "create" : entry.action,
            }
          : entry,
      ) ?? null,
    );
  };

  const handleImportPreviewRawgChange = (entryId: string, rawgId: number | null) => {
    setImportPreview((current) =>
      current?.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              selectedRawgId: rawgId,
            }
          : entry,
      ) ?? null,
    );
  };

  const handleImportPreviewApplySuggested = () => {
    setImportPreview((current) =>
      current?.map((entry) => ({
        ...entry,
        action: entry.suggestedAction,
        selectedMatchId:
          entry.suggestedAction === "update"
            ? entry.selectedMatchId ??
              (entry.matchCandidates.length === 1 ? entry.matchCandidates[0]?.entryId ?? null : null)
            : entry.selectedMatchId,
        selectedGameId:
          entry.suggestedAction === "create" && entry.gameCandidates.length === 1
            ? entry.selectedGameId ?? entry.gameCandidates[0]?.gameId ?? null
            : entry.selectedGameId,
      })) ?? null,
    );
  };

  const handleImportPreviewAutoMergeSafe = () => {
    setImportPreview((current) =>
      current?.map((entry) =>
        entry.status === "review" &&
        entry.matchCandidates.length === 1 &&
        entry.confidenceScore >= 78 &&
        entry.matchCandidates[0]
          ? {
              ...entry,
              action: "update",
              selectedMatchId: entry.matchCandidates[0].entryId,
              selectedGameId: null,
            }
          : entry,
      ) ?? null,
    );
  };

  const handleImportPreviewIgnoreUnsafe = () => {
    setImportPreview((current) =>
      current?.map((entry) =>
        entry.status === "review" && entry.confidenceScore < 78 && entry.selectedMatchId == null && entry.action !== "ignore"
          ? {
              ...entry,
              action: "ignore",
            }
          : entry,
      ) ?? null,
    );
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > maxFileSize) {
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
    if (file.size > maxFileSize) {
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

  return {
    importModalOpen,
    importSource,
    importText,
    importFileName,
    importPreview,
    importPreviewSummary,
    importFileInputRef,
    restoreModalOpen,
    restoreMode,
    restoreText,
    restoreFileName,
    restorePreview,
    restorePreviewTotals,
    restoreFileInputRef,
    setImportPreview,
    setRestorePreview,
    openImportFlow,
    closeImportFlow,
    resetImportPreview,
    openRestoreFlow,
    closeRestoreFlow,
    resetRestorePreview,
    handleImportSourceChange,
    handleImportTextChange,
    handleRestoreModeChange,
    handleRestoreTextChange,
    handleImportPreviewActionChange,
    handleImportPreviewMatchChange,
    handleImportPreviewGameChange,
    handleImportPreviewRawgChange,
    handleImportPreviewApplySuggested,
    handleImportPreviewAutoMergeSafe,
    handleImportPreviewIgnoreUnsafe,
    handleImportFileChange,
    handleRestoreFileChange,
  };
}
