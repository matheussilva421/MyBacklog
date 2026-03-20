import { useImportExportState } from "../modules/import-export/hooks/useImportExportState";
import { useAppPreferences } from "../modules/settings/hooks/useAppPreferences";
import { useBacklogDataState } from "./useBacklogDataState";
import { useBacklogUiState } from "./useBacklogUiState";

export function useBacklogContext() {
  const data = useBacklogDataState();
  const importState = useImportExportState(data.setNotice);
  const preferences = useAppPreferences(data.settingRows);
  const ui = useBacklogUiState({ preferences });

  return {
    data,
    importState,
    preferences,
    ui,
  };
}
