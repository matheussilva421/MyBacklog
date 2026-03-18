import { useMemo } from "react";
import type { Setting as DbSetting } from "../../../core/types";
import { parseAppPreferences } from "../utils/preferences";

export function useAppPreferences(settingRows: DbSetting[]) {
  return useMemo(() => parseAppPreferences(settingRows), [settingRows]);
}
