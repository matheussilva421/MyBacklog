import type { GoalType, Period, Setting as DbSetting } from "../../../core/types";
import { syncSettingsKeys } from "../../sync-center/utils/syncStorage";

export type PlannerPreference = "balanced" | "clear_backlog" | "finish_active" | "maximize_playtime";

export type AppPreferences = {
  onboardingCompleted: boolean;
  guidedTourCompleted: boolean;
  operatorName: string;
  primaryPlatforms: string[];
  defaultStores: string[];
  rawgApiKey: string;
  plannerPreference: PlannerPreference;
  autoSyncEnabled: boolean;
};

export type PreferencesDraft = {
  operatorName: string;
  primaryPlatforms: string;
  defaultStores: string;
  rawgApiKey: string;
  plannerPreference: PlannerPreference;
  autoSyncEnabled: boolean;
};

export type OnboardingGoalTemplate = {
  id: string;
  label: string;
  description: string;
  type: GoalType;
  target: number;
  period: Period;
};

export const settingsKeys = {
  displayName: "displayName",
  onboardingCompleted: "app.onboardingCompleted",
  guidedTourCompleted: "app.guidedTourCompleted",
  primaryPlatforms: "app.primaryPlatforms",
  defaultStores: "app.defaultStores",
  rawgApiKey: "app.rawgApiKey",
  plannerPreference: "app.plannerPreference",
  autoSyncEnabled: syncSettingsKeys.autoSyncEnabled,
} as const;

export const suggestedPlatforms = ["PC", "PS5", "PS4", "Switch", "Xbox Series", "Steam Deck"] as const;

export const suggestedStores = [
  "Steam",
  "Epic",
  "GOG",
  "Game Pass",
  "PS Store",
  "Nintendo eShop",
  "Playnite",
  "Manual",
] as const;

export const suggestedStarterLists = [
  "Campanha principal",
  "Fim de semana",
  "Curtos e cirúrgicos",
  "Prioridade alta",
  "Narrativos",
  "Run infinita",
] as const;

export const plannerPreferenceOptions: Array<{
  value: PlannerPreference;
  label: string;
  description: string;
}> = [
  {
    value: "balanced",
    label: "Balanceado",
    description: "Mistura progresso, backlog e atrito de retorno.",
  },
  {
    value: "clear_backlog",
    label: "Limpar backlog",
    description: "Puxa jogos curtos e iniciados para reduzir acúmulo.",
  },
  {
    value: "finish_active",
    label: "Fechar ativos",
    description: "Favorece jogos em andamento e pausados com avanço real.",
  },
  {
    value: "maximize_playtime",
    label: "Horas úteis",
    description: "Otimiza sessões recentes e blocos contínuos de jogo.",
  },
];

export const onboardingGoalTemplates: OnboardingGoalTemplate[] = [
  {
    id: "finish-2-month",
    label: "Fechar 2 jogos por mês",
    description: "Pressiona o planner a converter progresso em conclusão.",
    type: "finished",
    target: 2,
    period: "monthly",
  },
  {
    id: "start-3-month",
    label: "Iniciar 3 jogos por mês",
    description: "Ajuda a girar a biblioteca sem abrir projetos demais.",
    type: "started",
    target: 3,
    period: "monthly",
  },
  {
    id: "playtime-20-month",
    label: "Registrar 20 horas por mês",
    description: "Mantém consistência e alimenta a telemetria pessoal.",
    type: "playtime",
    target: 20,
    period: "monthly",
  },
  {
    id: "backlog-6-year",
    label: "Reduzir 6 itens do backlog no ano",
    description: "Empurra o motor para limpar fila acumulada.",
    type: "backlog_reduction",
    target: 6,
    period: "yearly",
  },
];

const defaultPreferences: AppPreferences = {
  onboardingCompleted: false,
  guidedTourCompleted: false,
  operatorName: "Operador",
  primaryPlatforms: ["PC"],
  defaultStores: ["Manual"],
  rawgApiKey: "",
  plannerPreference: "balanced",
  autoSyncEnabled: true,
};

function parseBoolean(value: string | undefined): boolean {
  return value === "true";
}

function normalizeTokenList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  );
}

function parseListValue(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeTokenList(parsed.join(","));
    }
  } catch {
    // Fallback para texto plano logo abaixo.
  }

  const tokens = normalizeTokenList(value);
  return tokens.length > 0 ? tokens : fallback;
}

function readSetting(rows: DbSetting[], key: string): string | undefined {
  return rows.find((row) => row.key === key)?.value;
}

export function parseAppPreferences(settingRows: DbSetting[]): AppPreferences {
  const operatorName = readSetting(settingRows, settingsKeys.displayName)?.trim() || defaultPreferences.operatorName;
  const plannerPreferenceRaw = readSetting(settingRows, settingsKeys.plannerPreference);
  const plannerPreference = plannerPreferenceOptions.some((option) => option.value === plannerPreferenceRaw)
    ? (plannerPreferenceRaw as PlannerPreference)
    : defaultPreferences.plannerPreference;

  return {
    onboardingCompleted: parseBoolean(readSetting(settingRows, settingsKeys.onboardingCompleted)),
    guidedTourCompleted: parseBoolean(readSetting(settingRows, settingsKeys.guidedTourCompleted)),
    operatorName,
    primaryPlatforms: parseListValue(
      readSetting(settingRows, settingsKeys.primaryPlatforms),
      defaultPreferences.primaryPlatforms,
    ),
    defaultStores: parseListValue(
      readSetting(settingRows, settingsKeys.defaultStores),
      defaultPreferences.defaultStores,
    ),
    rawgApiKey: readSetting(settingRows, settingsKeys.rawgApiKey)?.trim() || "",
    plannerPreference,
    autoSyncEnabled:
      readSetting(settingRows, settingsKeys.autoSyncEnabled) == null
        ? defaultPreferences.autoSyncEnabled
        : parseBoolean(readSetting(settingRows, settingsKeys.autoSyncEnabled)),
  };
}

export function createPreferencesDraft(preferences: AppPreferences): PreferencesDraft {
  return {
    operatorName: preferences.operatorName,
    primaryPlatforms: preferences.primaryPlatforms.join(", "),
    defaultStores: preferences.defaultStores.join(", "),
    rawgApiKey: preferences.rawgApiKey,
    plannerPreference: preferences.plannerPreference,
    autoSyncEnabled: preferences.autoSyncEnabled,
  };
}

export function normalizePreferencesDraft(
  draft: PreferencesDraft,
  preserved?: Partial<Pick<AppPreferences, "onboardingCompleted" | "guidedTourCompleted">>,
): AppPreferences {
  return {
    onboardingCompleted: preserved?.onboardingCompleted ?? true,
    guidedTourCompleted: preserved?.guidedTourCompleted ?? false,
    operatorName: draft.operatorName.trim() || defaultPreferences.operatorName,
    primaryPlatforms: normalizeTokenList(draft.primaryPlatforms || defaultPreferences.primaryPlatforms.join(",")),
    defaultStores: normalizeTokenList(draft.defaultStores || defaultPreferences.defaultStores.join(",")),
    rawgApiKey: draft.rawgApiKey.trim(),
    plannerPreference: draft.plannerPreference,
    autoSyncEnabled: draft.autoSyncEnabled,
  };
}

export function preferencesToSettingPairs(preferences: AppPreferences): Array<{ key: string; value: string }> {
  return [
    { key: settingsKeys.displayName, value: preferences.operatorName },
    {
      key: settingsKeys.onboardingCompleted,
      value: String(preferences.onboardingCompleted),
    },
    {
      key: settingsKeys.guidedTourCompleted,
      value: String(preferences.guidedTourCompleted),
    },
    {
      key: settingsKeys.primaryPlatforms,
      value: JSON.stringify(preferences.primaryPlatforms),
    },
    {
      key: settingsKeys.defaultStores,
      value: JSON.stringify(preferences.defaultStores),
    },
    { key: settingsKeys.rawgApiKey, value: preferences.rawgApiKey },
    { key: settingsKeys.plannerPreference, value: preferences.plannerPreference },
    { key: settingsKeys.autoSyncEnabled, value: String(preferences.autoSyncEnabled) },
  ];
}

export function toggleTokenInText(currentValue: string, token: string): string {
  const normalizedCurrent = normalizeTokenList(currentValue);
  const exists = normalizedCurrent.some((currentToken) => currentToken.toLowerCase() === token.toLowerCase());
  const next = exists
    ? normalizedCurrent.filter((currentToken) => currentToken.toLowerCase() !== token.toLowerCase())
    : [...normalizedCurrent, token];

  return next.join(", ");
}

export function isTokenSelected(currentValue: string, token: string): boolean {
  return normalizeTokenList(currentValue).some((value) => value.toLowerCase() === token.toLowerCase());
}

export function getDefaultPreferences(): AppPreferences {
  return defaultPreferences;
}
