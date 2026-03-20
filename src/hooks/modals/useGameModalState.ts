import { useState } from "react";
import {
  createGameFormState,
  type GameFormState,
} from "../../backlog/shared";
import type { Game } from "../../backlog/shared";

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

  const openEditGameModal = (game?: Game) => {
    setGameForm(createGameFormState(game));
    setGameModalMode("edit");
  };

  const openEditGameModalFor = (libraryEntryId: number) => {
    setGameModalMode("edit");
    // O form será preenchido pelo componente pai com os dados da entry
    setGameForm((current) => ({ ...current, libraryEntryId }));
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
    openEditGameModal,
    openEditGameModalFor,
    closeGameModal,
    handleGameFormChange,
  };
}
