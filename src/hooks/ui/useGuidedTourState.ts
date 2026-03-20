import { useState } from "react";
import type { ScreenKey } from "../../backlog/shared";

export function useGuidedTourState() {
  const [guidedTourOpen, setGuidedTourOpen] = useState(false);
  const [guidedTourStepIndex, setGuidedTourStepIndex] = useState(0);
  const [guidedTourOriginScreen, setGuidedTourOriginScreen] =
    useState<ScreenKey>("dashboard");

  const openGuidedTour = (originScreen: ScreenKey) => {
    setGuidedTourOriginScreen(originScreen);
    setGuidedTourStepIndex(0);
    setGuidedTourOpen(true);
  };

  const closeGuidedTour = (currentScreen: ScreenKey, setScreen: (screen: ScreenKey) => void, restoreOrigin = false) => {
    setGuidedTourOpen(false);
    setGuidedTourStepIndex(0);
    if (restoreOrigin && guidedTourOriginScreen !== currentScreen) {
      setScreen(guidedTourOriginScreen);
    }
  };

  const nextGuidedTourStep = (totalSteps: number) => {
    setGuidedTourStepIndex((current) => Math.min(current + 1, Math.max(totalSteps - 1, 0)));
  };

  const previousGuidedTourStep = () => {
    setGuidedTourStepIndex((current) => Math.max(current - 1, 0));
  };

  return {
    guidedTourOpen,
    setGuidedTourOpen,
    guidedTourStepIndex,
    setGuidedTourStepIndex,
    guidedTourOriginScreen,
    openGuidedTour,
    closeGuidedTour,
    nextGuidedTourStep,
    previousGuidedTourStep,
  };
}
