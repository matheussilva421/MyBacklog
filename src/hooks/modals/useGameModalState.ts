import { useState } from "react";
import {
  createGameFormState,
  type GameFormState,
} from "../../backlog/shared";

export function useGameModalState(args: {
  defaultPlatform?: string;
  defaultStore?: string;
}) {
  const [gameModalMode, setGameModalMode] = useState<"create" | "edit" | null>(null);
  const [gameForm, setGameForm] = useState<GameFormState>(() => createGameFormState());

  const openCreateGameModal = () => {
    setGameForm(
      createGameFormState(undefined, {
        platform: args.defaultPlatform,
        sourceStore: args.defaultStore,
      }),
    );
    setGameModalMode("create");
  };

  const closeGameModal = () => setGameModalMode(null);

  const handleGameFormChange = <K extends keyof GameFormState>(
    field: K,
    value: GameFormState[K],
  ) => setGameForm((current) => ({ ...current, [field]: value }));

  return {
    gameModalMode,
    setGameModalMode,
    gameForm,
    setGameForm,
    openCreateGameModal,
    closeGameModal,
    handleGameFormChange,
  };
}
