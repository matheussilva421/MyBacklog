import { useState } from "react";
import type { LibraryBatchEditState } from "../../backlog/shared";

function createBatchEditDraft(): LibraryBatchEditState {
  return {
    applyMode: "merge",
    status: "",
    priority: "",
    primaryPlatform: "",
    platforms: [],
    primaryStore: "",
    stores: [],
    tags: "",
    listIds: [],
  };
}

export function useBatchEditModalState() {
  const [batchEditModalOpen, setBatchEditModalOpen] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState<LibraryBatchEditState>(() =>
    createBatchEditDraft(),
  );

  const openBatchEditModal = () => {
    setBatchEditForm(createBatchEditDraft());
    setBatchEditModalOpen(true);
  };

  const closeBatchEditModal = () => setBatchEditModalOpen(false);

  const handleBatchEditFormChange = <K extends keyof LibraryBatchEditState>(
    field: K,
    value: LibraryBatchEditState[K],
  ) => setBatchEditForm((current) => ({ ...current, [field]: value }));

  return {
    batchEditModalOpen,
    setBatchEditModalOpen,
    batchEditForm,
    setBatchEditForm,
    openBatchEditModal,
    closeBatchEditModal,
    handleBatchEditFormChange,
  };
}
