import { useBatchEditModalState } from "./modals/useBatchEditModalState";
import { useGameModalState } from "./modals/useGameModalState";
import { useGoalModalState } from "./modals/useGoalModalState";
import { useSessionModalState } from "./modals/useSessionModalState";
import { useNavigationState } from "./navigation/useNavigationState";
import { useGuidedTourState } from "./ui/useGuidedTourState";
import { useLibrarySelectionState } from "./ui/useLibrarySelectionState";
import type { AppPreferences } from "../modules/settings/utils/preferences";
import type { ScreenKey } from "../backlog/shared";

export function useBacklogUiState(args: { preferences: AppPreferences }) {
  const navigation = useNavigationState();
  const selection = useLibrarySelectionState();
  const gameModal = useGameModalState({
    defaultPlatform: args.preferences.primaryPlatforms[0],
    defaultStore: args.preferences.defaultStores[0],
  });
  const batchEditModal = useBatchEditModalState();
  const sessionModal = useSessionModalState();
  const goalModal = useGoalModalState();
  const guidedTour = useGuidedTourState();

  const openGuidedTour = (originScreen: ScreenKey = navigation.screen) => {
    guidedTour.openGuidedTour(originScreen);
  };

  const closeGuidedTour = (restoreOrigin = false) => {
    guidedTour.closeGuidedTour(navigation.screen, navigation.setScreen, restoreOrigin);
  };

  return {
    ...navigation,
    ...selection,
    ...gameModal,
    ...batchEditModal,
    ...sessionModal,
    ...goalModal,
    ...guidedTour,
    openGuidedTour,
    closeGuidedTour,
  };
}
