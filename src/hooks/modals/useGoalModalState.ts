import { useState } from "react";
import type { Goal as DbGoal } from "../../core/types";
import type { GoalFormState } from "../../backlog/shared";

function createGoalDraft(goal?: DbGoal): GoalFormState {
  return {
    type: goal?.type ?? "finished",
    target: goal?.target != null ? String(goal.target) : "",
    period: goal?.period ?? "monthly",
  };
}

export function useGoalModalState() {
  const [goalModalMode, setGoalModalMode] = useState<"create" | "edit" | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(() => createGoalDraft());
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

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

  const handleGoalFormChange = <K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) =>
    setGoalForm((current) => ({ ...current, [field]: value }));

  return {
    goalModalMode,
    setGoalModalMode,
    goalForm,
    setGoalForm,
    editingGoalId,
    openCreateGoalModal,
    openEditGoalModal,
    closeGoalModal,
    handleGoalFormChange,
  };
}
