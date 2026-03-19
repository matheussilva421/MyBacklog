import { useDeferredValue, useState } from "react";
import type { Goal as DbGoal, PlaySession as DbPlaySession } from "../core/types";
import {
  createGameFormState,
  createSessionFormState,
  type GameFormState,
  type GoalFormState,
  type LibraryListFilter,
  type ScreenKey,
  type SessionFormState,
  type StatusFilter,
} from "../backlog/shared";
import type { AppPreferences } from "../modules/settings/utils/preferences";

function createGoalDraft(goal?: DbGoal): GoalFormState {
  return {
    type: goal?.type ?? "finished",
    target: goal?.target != null ? String(goal.target) : "",
    period: goal?.period ?? "monthly",
  };
}

export function useBacklogUiState(args: { preferences: AppPreferences }) {
  const { preferences } = args;
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [selectedListFilter, setSelectedListFilter] = useState<LibraryListFilter>("all");
  const [selectedGameId, setSelectedGameId] = useState(0);

  const [gameModalMode, setGameModalMode] = useState<"create" | "edit" | null>(null);
  const [gameForm, setGameForm] = useState<GameFormState>(() => createGameFormState());
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(() => createSessionFormState());
  const [sessionEditId, setSessionEditId] = useState<number | null>(null);
  const [goalModalMode, setGoalModalMode] = useState<"create" | "edit" | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(() => createGoalDraft());
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [guidedTourOpen, setGuidedTourOpen] = useState(false);
  const [guidedTourStepIndex, setGuidedTourStepIndex] = useState(0);
  const [guidedTourOriginScreen, setGuidedTourOriginScreen] = useState<ScreenKey>("dashboard");

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const openCreateGameModal = () => {
    setGameForm(
      createGameFormState(undefined, {
        platform: preferences.primaryPlatforms[0],
        sourceStore: preferences.defaultStores[0],
      }),
    );
    setGameModalMode("create");
  };

  const closeGameModal = () => setGameModalMode(null);

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
      completionPercent: session.completionPercent != null ? String(session.completionPercent) : "",
      mood: session.mood ?? "",
      note: session.note ?? "",
    });
    setSessionModalOpen(true);
  };

  const openCreateGoalModal = () => {
    setGoalForm(createGoalDraft());
    setEditingGoalId(null);
    setGoalModalMode("create");
  };

  const openEditGoalModal = (goal: DbGoal) => {
    setGoalForm(createGoalDraft(goal));
    setEditingGoalId(goal.id ?? null);
    setGoalModalMode("edit");
  };

  const closeGoalModal = () => setGoalModalMode(null);

  const openGuidedTour = (originScreen: ScreenKey = screen) => {
    setGuidedTourOriginScreen(originScreen);
    setGuidedTourStepIndex(0);
    setGuidedTourOpen(true);
  };

  const closeGuidedTour = (restoreOrigin = false) => {
    setGuidedTourOpen(false);
    setGuidedTourStepIndex(0);
    if (restoreOrigin && guidedTourOriginScreen !== screen) setScreen(guidedTourOriginScreen);
  };

  const nextGuidedTourStep = (totalSteps: number) => {
    setGuidedTourStepIndex((current) => Math.min(current + 1, Math.max(totalSteps - 1, 0)));
  };

  const previousGuidedTourStep = () => {
    setGuidedTourStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleGameFormChange = <K extends keyof GameFormState>(field: K, value: GameFormState[K]) =>
    setGameForm((current) => ({ ...current, [field]: value }));
  const handleSessionFormChange = <K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) =>
    setSessionForm((current) => ({ ...current, [field]: value }));
  const handleGoalFormChange = <K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) =>
    setGoalForm((current) => ({ ...current, [field]: value }));

  return {
    screen,
    setScreen,
    query,
    setQuery,
    deferredQuery,
    filter,
    setFilter,
    selectedListFilter,
    setSelectedListFilter,
    selectedGameId,
    setSelectedGameId,
    gameModalMode,
    setGameModalMode,
    gameForm,
    setGameForm,
    sessionModalOpen,
    setSessionModalOpen,
    sessionForm,
    sessionEditId,
    setSessionEditId,
    goalModalMode,
    setGoalModalMode,
    goalForm,
    editingGoalId,
    guidedTourOpen,
    setGuidedTourOpen,
    guidedTourStepIndex,
    setGuidedTourStepIndex,
    guidedTourOriginScreen,
    openCreateGameModal,
    closeGameModal,
    openSessionModal,
    closeSessionModal,
    openEditSessionModal,
    openCreateGoalModal,
    openEditGoalModal,
    closeGoalModal,
    openGuidedTour,
    closeGuidedTour,
    nextGuidedTourStep,
    previousGuidedTourStep,
    handleGameFormChange,
    handleSessionFormChange,
    handleGoalFormChange,
  };
}
