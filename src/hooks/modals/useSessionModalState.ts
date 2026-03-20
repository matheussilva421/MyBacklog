import { useState } from "react";
import type { PlaySession as DbPlaySession } from "../../core/types";
import {
  createSessionFormState,
  type SessionFormState,
} from "../../backlog/shared";

export function useSessionModalState() {
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(() => createSessionFormState());
  const [sessionEditId, setSessionEditId] = useState<number | null>(null);

  const openSessionModal = (gameId?: number) => {
    setSessionEditId(null);
    setSessionForm(createSessionFormState(gameId));
    setSessionModalOpen(true);
  };

  const closeSessionModal = () => {
    setSessionModalOpen(false);
    setSessionEditId(null);
  };

  const openEditSessionModal = (session: DbPlaySession) => {
    if (!session.id) return;
    setSessionEditId(session.id);
    setSessionForm({
      gameId: String(session.libraryEntryId),
      date: session.date,
      durationMinutes: String(session.durationMinutes),
      completionPercent:
        session.completionPercent != null ? String(session.completionPercent) : "",
      mood: session.mood ?? "",
      note: session.note ?? "",
    });
    setSessionModalOpen(true);
  };

  const handleSessionFormChange = <K extends keyof SessionFormState>(
    field: K,
    value: SessionFormState[K],
  ) => setSessionForm((current) => ({ ...current, [field]: value }));

  return {
    sessionModalOpen,
    setSessionModalOpen,
    sessionForm,
    setSessionForm,
    sessionEditId,
    setSessionEditId,
    openSessionModal,
    closeSessionModal,
    openEditSessionModal,
    handleSessionFormChange,
  };
}
