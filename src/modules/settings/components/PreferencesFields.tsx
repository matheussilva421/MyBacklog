import type { ChangeEvent } from "react";
import { DatabaseZap, KeyRound, Layers2, Store, User } from "lucide-react";
import { cx } from "../../../backlog/shared";
import { Pill } from "../../../components/cyberpunk-ui";
import type { PreferencesDraft } from "../utils/preferences";
import {
  isTokenSelected,
  plannerPreferenceOptions,
  suggestedPlatforms,
  suggestedStores,
  toggleTokenInText,
} from "../utils/preferences";

type PreferencesFieldsProps = {
  draft: PreferencesDraft;
  onChange: <K extends keyof PreferencesDraft>(field: K, value: PreferencesDraft[K]) => void;
};

function createToggleHandler(
  currentValue: string,
  onChange: (value: string) => void,
  token: string,
) {
  onChange(toggleTokenInText(currentValue, token));
}

export function PreferencesFields({ draft, onChange }: PreferencesFieldsProps) {
  const handleTextChange =
    <K extends keyof PreferencesDraft>(field: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange(field, event.target.value as PreferencesDraft[K]);
    };

  return (
    <div className="form-grid">
      <label className="field field--wide">
        <span>
          <User size={14} /> Nome do operador
        </span>
        <input
          value={draft.operatorName}
          onChange={handleTextChange("operatorName")}
          placeholder="Ex.: Matheus"
          autoComplete="nickname"
        />
      </label>

      <label className="field field--wide">
        <span>
          <Layers2 size={14} /> Plataformas principais
        </span>
        <textarea
          rows={3}
          value={draft.primaryPlatforms}
          onChange={handleTextChange("primaryPlatforms")}
          placeholder="PC, PS5, Switch..."
        />
        <div className="preference-chip-row">
          {suggestedPlatforms.map((platform) => (
            <button
              key={platform}
              type="button"
              className={cx("filter-chip", isTokenSelected(draft.primaryPlatforms, platform) && "filter-chip--active")}
              onClick={() =>
                createToggleHandler(draft.primaryPlatforms, (value) => onChange("primaryPlatforms", value), platform)
              }
            >
              {platform}
            </button>
          ))}
        </div>
      </label>

      <label className="field field--wide">
        <span>
          <Store size={14} /> Lojas / fontes padrão
        </span>
        <textarea
          rows={3}
          value={draft.defaultStores}
          onChange={handleTextChange("defaultStores")}
          placeholder="Steam, Playnite, Manual..."
        />
        <div className="preference-chip-row">
          {suggestedStores.map((store) => (
            <button
              key={store}
              type="button"
              className={cx("filter-chip", isTokenSelected(draft.defaultStores, store) && "filter-chip--active")}
              onClick={() =>
                createToggleHandler(draft.defaultStores, (value) => onChange("defaultStores", value), store)
              }
            >
              {store}
            </button>
          ))}
        </div>
      </label>

      <label className="field">
        <span>
          <DatabaseZap size={14} /> Estratégia do planner
        </span>
        <select value={draft.plannerPreference} onChange={handleTextChange("plannerPreference")}>
          {plannerPreferenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small>
          {
            plannerPreferenceOptions.find((option) => option.value === draft.plannerPreference)?.description
          }
        </small>
      </label>

      <label className="field">
        <span>
          <KeyRound size={14} /> Chave RAWG (opcional)
        </span>
        <input
          type="password"
          value={draft.rawgApiKey}
          onChange={handleTextChange("rawgApiKey")}
          placeholder="Cole sua chave para enriquecer metadados"
          autoComplete="new-password"
        />
        <small>
          {draft.rawgApiKey
            ? "A biblioteca e a importação podem enriquecer capa, estúdio, publisher e plataformas."
            : "Sem chave, o app continua 100% funcional, mas sem enriquecimento automático."}
        </small>
      </label>

      <div className="field field--wide field--summary">
        <span>Impacto prático</span>
        <div className="detail-note__tags">
          {draft.operatorName.trim() ? <Pill tone="cyan">{draft.operatorName.trim()}</Pill> : null}
          {draft.primaryPlatforms
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 4)
            .map((platform) => (
              <Pill key={platform} tone="neutral">
                {platform}
              </Pill>
            ))}
          {draft.defaultStores
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 4)
            .map((store) => (
              <Pill key={store} tone="magenta">
                {store}
              </Pill>
            ))}
        </div>
      </div>
    </div>
  );
}
