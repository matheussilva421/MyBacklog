import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MutableRefObject,
} from "react";
import { Download, Upload } from "lucide-react";
import {
  cx,
  gamePriorities,
  gameStatuses,
  goalPeriodOptions,
  goalTypeOptions,
  importSources,
  type LibraryBatchApplyMode,
  type LibraryBatchEditState,
  type Game,
  type GameFormState,
  type GoalFormState,
  type ImportPreviewAction,
  type ImportPreviewEntry,
  type ImportSource,
  type RestoreMode,
  type RestorePreview,
  type SessionFormState,
} from "../backlog/shared";
import { Modal, NotchButton, Pill } from "./cyberpunk-ui";
import { fetchRawgMetadata, searchRawgCandidates, type RawgCandidate } from "../modules/import-export/utils/rawg";
import { db } from "../core/db";
import type { ImportJob } from "../core/types";
import { splitCsvTokens } from "../core/utils";

type ImportPreviewSummary = {
  create: number;
  update: number;
  ignore: number;
  fresh: number;
  existing: number;
  review: number;
  duplicates: number;
  assisted: number;
  maintenance: number;
};

type RestorePreviewTotals = {
  create: number;
  update: number;
  skip: number;
};

function formatImportJobChanges(changes?: string): string | null {
  if (!changes || changes === "[]") return null;

  try {
    return JSON.stringify(JSON.parse(changes), null, 2);
  } catch {
    return changes;
  }
}

function serializeModalValue(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function confirmDiscardChanges(message: string): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") return true;
  return window.confirm(message);
}

function useUnsavedChangesWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);
}

function RawgCandidateCard({
  candidate,
  loading,
  onApply,
}: {
  candidate: RawgCandidate;
  loading: boolean;
  onApply: (candidate: RawgCandidate) => Promise<void>;
}) {
  return (
    <article className="rawg-candidate-card">
      <div className="rawg-candidate-card__media">
        {candidate.coverUrl ? (
          <img src={candidate.coverUrl} alt={`Capa de ${candidate.title}`} />
        ) : (
          <div className="rawg-candidate-card__placeholder">RAWG</div>
        )}
      </div>
      <div className="rawg-candidate-card__body">
        <div className="rawg-candidate-card__head">
          <div>
            <strong>{candidate.title}</strong>
            <span>
              {candidate.releaseYear ?? "--"} •{" "}
              {candidate.platforms.length > 0 ? candidate.platforms.join(", ") : "Sem plataformas"}
            </span>
          </div>
          <Pill tone={candidate.score >= 88 ? "emerald" : "cyan"}>{candidate.score}% match</Pill>
        </div>
        <div className="detail-note__tags">
          {(candidate.genres.length > 0 ? candidate.genres : ["Sem gênero"]).map((genre) => (
            <Pill key={`${candidate.rawgId}-${genre}`} tone="neutral">
              {genre}
            </Pill>
          ))}
        </div>
        <div className="rawg-candidate-card__actions">
          <NotchButton type="button" variant="primary" onClick={() => void onApply(candidate)} disabled={loading}>
            Aplicar metadados
          </NotchButton>
        </div>
      </div>
    </article>
  );
}

export function GameModal(props: {
  mode: "create" | "edit" | null;
  form: GameFormState;
  availableStores: string[];
  availablePlatforms: string[];
  rawgApiKey?: string;
  submitting?: boolean;
  onChange: <K extends keyof GameFormState>(field: K, value: GameFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  const {
    mode,
    form,
    availableStores,
    availablePlatforms,
    rawgApiKey = "",
    submitting = false,
    onChange,
    onSubmit,
    onClose,
  } = props;
  const [rawgCandidates, setRawgCandidates] = useState<RawgCandidate[]>([]);
  const [rawgLoading, setRawgLoading] = useState(false);
  const [rawgMessage, setRawgMessage] = useState<string | null>(null);
  const [rawgMessageTone, setRawgMessageTone] = useState<"error" | "success">("success");
  const [platformDraft, setPlatformDraft] = useState("");
  const [storeDraft, setStoreDraft] = useState("");
  const [initialSnapshot] = useState(() => serializeModalValue(form));

  const serializedForm = useMemo(() => serializeModalValue(form), [form]);
  const isDirty = serializedForm !== initialSnapshot || platformDraft.trim().length > 0 || storeDraft.trim().length > 0;

  useUnsavedChangesWarning(isDirty && !submitting);

  const setFeedback = (message: string | null, tone: "error" | "success" = "success") => {
    setRawgMessage(message);
    setRawgMessageTone(tone);
  };

  const platformOptions = Array.from(new Set([...availablePlatforms, ...form.platforms]))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  const storeOptions = Array.from(new Set([...availableStores, ...form.stores]))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  const updatePlatformSelections = (nextPlatforms: string[]) => {
    const normalized = splitCsvTokens(nextPlatforms);
    onChange("platforms", normalized);
    onChange("catalogPlatforms", normalized.join(", "));
    onChange("platform", normalized.includes(form.platform) ? form.platform : (normalized[0] ?? ""));
  };

  const updateStoreSelections = (nextStores: string[]) => {
    const normalized = splitCsvTokens(nextStores);
    onChange("stores", normalized);
    onChange("sourceStore", normalized.includes(form.sourceStore) ? form.sourceStore : (normalized[0] ?? ""));
  };

  const togglePlatform = (platformName: string) => {
    updatePlatformSelections(
      form.platforms.includes(platformName)
        ? form.platforms.filter((value) => value !== platformName)
        : [...form.platforms, platformName],
    );
  };

  const toggleStore = (storeName: string) => {
    updateStoreSelections(
      form.stores.includes(storeName)
        ? form.stores.filter((value) => value !== storeName)
        : [...form.stores, storeName],
    );
  };

  const addPlatformsFromDraft = () => {
    if (!platformDraft.trim()) return;
    updatePlatformSelections([...form.platforms, ...splitCsvTokens(platformDraft)]);
    setPlatformDraft("");
  };

  const addStoresFromDraft = () => {
    if (!storeDraft.trim()) return;
    updateStoreSelections([...form.stores, ...splitCsvTokens(storeDraft)]);
    setStoreDraft("");
  };

  const handleRawgSearch = async () => {
    if (!form.title.trim()) {
      setFeedback("Informe o título do jogo antes de buscar na RAWG.", "error");
      return;
    }
    if (!rawgApiKey.trim()) {
      setFeedback("Adicione sua chave RAWG nas configurações para usar o enriquecimento automático.", "error");
      return;
    }

    setRawgLoading(true);
    setFeedback(null);
    try {
      const candidates = await searchRawgCandidates(form.title.trim(), rawgApiKey.trim());
      setRawgCandidates(candidates);
      if (candidates.length === 0) {
        setFeedback("Nenhum candidato confiável foi encontrado na RAWG para esse título.", "error");
      } else {
        setFeedback(`${candidates.length} candidato(s) RAWG encontrado(s). Escolha um para aplicar.`);
      }
    } catch (error) {
      setFeedback(
        `Falha ao consultar a RAWG: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
        "error",
      );
    } finally {
      setRawgLoading(false);
    }
  };

  const handleApplyRawgCandidate = async (candidate: RawgCandidate) => {
    if (!rawgApiKey.trim()) return;
    setRawgLoading(true);
    setFeedback(null);

    try {
      const metadata = await fetchRawgMetadata(candidate.rawgId, rawgApiKey.trim());
      if (!metadata) {
        setFeedback("A RAWG não retornou metadados úteis para este jogo.", "error");
        return;
      }

      onChange("title", candidate.title);
      onChange("rawgId", String(candidate.rawgId));
      onChange("coverUrl", metadata.coverUrl ?? candidate.coverUrl ?? "");
      onChange("genre", metadata.genres ?? candidate.genres.join(", "));
      updatePlatformSelections(splitCsvTokens(metadata.platforms ?? candidate.platforms.join(", ")));
      onChange("year", metadata.releaseYear != null ? String(metadata.releaseYear) : form.year);
      onChange("developer", metadata.developer ?? "");
      onChange("publisher", metadata.publisher ?? "");
      if (!form.description.trim() && metadata.description) onChange("description", metadata.description);

      setFeedback(`Metadados de ${candidate.title} aplicados ao formulário.`);
    } catch (error) {
      setFeedback(
        `Falha ao aplicar metadados RAWG: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
        "error",
      );
    } finally {
      setRawgLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (isDirty && !confirmDiscardChanges("Há alterações não salvas no cadastro do jogo. Deseja descartar e fechar?")) {
      return;
    }
    onClose();
  }, [isDirty, onClose, submitting]);

  if (!mode) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar jogo" : "Novo jogo"}
      description="Cadastro manual do catálogo com busca opcional na RAWG para puxar capa, descrição e metadado."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field field--wide">
            <span>Título</span>
            <div className="field__aux field__aux--inline">
              <input
                autoFocus
                data-autofocus
                value={form.title}
                onChange={(event) => onChange("title", event.target.value)}
              />
              <NotchButton
                type="button"
                variant="secondary"
                onClick={() => void handleRawgSearch()}
                disabled={rawgLoading}
              >
                {rawgLoading ? "Buscando..." : "Buscar na RAWG"}
              </NotchButton>
            </div>
            <small>
              {rawgApiKey.trim()
                ? "Use a RAWG para preencher capa, descrição, gênero, estúdio e ano rapidamente."
                : "Sem chave RAWG, o cadastro continua manual."}
            </small>
          </label>

          {rawgMessage ? (
            <div
              className={cx(
                "field",
                "field--wide",
                "field-feedback",
                rawgMessageTone === "error" ? "field-feedback--error" : "field-feedback--success",
              )}
            >
              {rawgMessage}
            </div>
          ) : null}

          {rawgCandidates.length > 0 ? (
            <div className="field field--wide rawg-candidate-list">
              {rawgCandidates.map((candidate) => (
                <RawgCandidateCard
                  key={candidate.rawgId}
                  candidate={candidate}
                  loading={rawgLoading}
                  onApply={handleApplyRawgCandidate}
                />
              ))}
            </div>
          ) : null}

          <div className="field field--wide">
            <span>Plataformas estruturadas</span>
            <div className="selection-chip-grid">
              {platformOptions.map((platformName) => (
                <button
                  key={`platform-${platformName}`}
                  type="button"
                  className={cx("selection-chip", form.platforms.includes(platformName) && "selection-chip--active")}
                  onClick={() => togglePlatform(platformName)}
                >
                  {platformName}
                </button>
              ))}
            </div>
            <div className="field__aux field__aux--inline">
              <input
                value={platformDraft}
                onChange={(event) => setPlatformDraft(event.target.value)}
                placeholder="Adicionar nova plataforma"
              />
              <NotchButton type="button" variant="secondary" onClick={addPlatformsFromDraft}>
                Adicionar
              </NotchButton>
            </div>
            <small>Selecione plataformas conhecidas ou adicione novas sem depender de CSV manual.</small>
          </div>
          <label className="field">
            <span>Plataforma principal</span>
            <select value={form.platform} onChange={(event) => onChange("platform", event.target.value)}>
              {form.platforms.length === 0 ? <option value="">Selecione uma plataforma</option> : null}
              {form.platforms.map((platformName) => (
                <option key={`primary-platform-${platformName}`} value={platformName}>
                  {platformName}
                </option>
              ))}
            </select>
          </label>
          <div className="field field--wide">
            <span>Stores estruturadas</span>
            <div className="selection-chip-grid">
              {storeOptions.map((storeName) => (
                <button
                  key={`store-${storeName}`}
                  type="button"
                  className={cx("selection-chip", form.stores.includes(storeName) && "selection-chip--active")}
                  onClick={() => toggleStore(storeName)}
                >
                  {storeName}
                </button>
              ))}
            </div>
            <div className="field__aux field__aux--inline">
              <input
                value={storeDraft}
                onChange={(event) => setStoreDraft(event.target.value)}
                placeholder="Adicionar nova store"
              />
              <NotchButton type="button" variant="secondary" onClick={addStoresFromDraft}>
                Adicionar
              </NotchButton>
            </div>
            <small>A primeira store selecionada vira fallback legado para compatibilidade.</small>
          </div>
          <label className="field">
            <span>Store principal</span>
            <select value={form.sourceStore} onChange={(event) => onChange("sourceStore", event.target.value)}>
              {form.stores.length === 0 ? <option value="">Selecione uma store</option> : null}
              {form.stores.map((storeName) => (
                <option key={`primary-store-${storeName}`} value={storeName}>
                  {storeName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Gênero</span>
            <input value={form.genre} onChange={(event) => onChange("genre", event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => onChange("status", event.target.value as GameFormState["status"])}
            >
              {gameStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select
              value={form.priority}
              onChange={(event) => onChange("priority", event.target.value as GameFormState["priority"])}
            >
              {gamePriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <div className="field field--wide form-section-title">
            <span>Datas e Aquisição</span>
          </div>

          <label className="field">
            <span>Começou a jogar</span>
            <input
              type="date"
              value={form.startedAt?.split("T")[0] || ""}
              onChange={(event) => onChange("startedAt", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Data da aquisição</span>
            <input
              type="date"
              value={form.purchaseDate?.split("T")[0] || ""}
              onChange={(event) => onChange("purchaseDate", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Valor pago</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.pricePaid}
              onChange={(event) => onChange("pricePaid", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Valor desejado</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.targetPrice}
              onChange={(event) => onChange("targetPrice", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Moeda (Ex: BRL)</span>
            <input value={form.currency} onChange={(event) => onChange("currency", event.target.value)} />
          </label>
          <label className="field">
            <span>Link da loja/promoção</span>
            <input value={form.storeLink} onChange={(event) => onChange("storeLink", event.target.value)} />
          </label>

          <div className="field field--wide form-section-title">
            <span>Progresso e Avaliação</span>
          </div>

          <label className="field">
            <span>Progresso %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.progress}
              onChange={(event) => onChange("progress", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Horas</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.hours}
              onChange={(event) => onChange("hours", event.target.value)}
            />
          </label>
          <label className="field">
            <span>ETA</span>
            <input value={form.eta} onChange={(event) => onChange("eta", event.target.value)} />
          </label>
          <label className="field">
            <span>Nota</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={form.score}
              onChange={(event) => onChange("score", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Ano</span>
            <input
              type="number"
              min="1980"
              max="2100"
              value={form.year}
              onChange={(event) => onChange("year", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Estúdio</span>
            <input value={form.developer} onChange={(event) => onChange("developer", event.target.value)} />
          </label>
          <label className="field">
            <span>Publisher</span>
            <input value={form.publisher} onChange={(event) => onChange("publisher", event.target.value)} />
          </label>
          <label className="field">
            <span>RAWG ID</span>
            <input value={form.rawgId} onChange={(event) => onChange("rawgId", event.target.value)} />
          </label>
          <label className="field field--wide">
            <span>URL da capa</span>
            <input value={form.coverUrl} onChange={(event) => onChange("coverUrl", event.target.value)} />
          </label>

          {form.coverUrl ? (
            <div className="field field--wide rawg-cover-preview">
              <img src={form.coverUrl} alt={`Preview da capa de ${form.title || "jogo"}`} />
            </div>
          ) : null}

          <label className="field">
            <span>Mood</span>
            <input value={form.mood} onChange={(event) => onChange("mood", event.target.value)} />
          </label>
          <label className="field">
            <span>Dificuldade</span>
            <input value={form.difficulty} onChange={(event) => onChange("difficulty", event.target.value)} />
          </label>
          <label className="field field--wide">
            <span>Descrição do jogo</span>
            <textarea
              rows={5}
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
            />
          </label>
          <label className="field field--wide">
            <span>Notas</span>
            <textarea rows={4} value={form.notes} onChange={(event) => onChange("notes", event.target.value)} />
          </label>
        </div>

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {mode === "edit" ? "Salvar alterações" : "Criar jogo"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function BatchEditModal(props: {
  open: boolean;
  form: LibraryBatchEditState;
  selectedGames: Game[];
  availableStores: string[];
  availablePlatforms: string[];
  availableTags: string[];
  availableLists: Array<{ id: number; name: string }>;
  submitting?: boolean;
  onChange: <K extends keyof LibraryBatchEditState>(field: K, value: LibraryBatchEditState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  const {
    open,
    form,
    selectedGames,
    availableStores,
    availablePlatforms,
    availableTags,
    availableLists,
    submitting = false,
    onChange,
    onSubmit,
    onClose,
  } = props;
  const [platformDraft, setPlatformDraft] = useState("");
  const [storeDraft, setStoreDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [initialSnapshot] = useState(() => serializeModalValue(form));

  const serializedForm = useMemo(() => serializeModalValue(form), [form]);
  const isDirty =
    serializedForm !== initialSnapshot ||
    platformDraft.trim().length > 0 ||
    storeDraft.trim().length > 0 ||
    tagDraft.trim().length > 0;

  useUnsavedChangesWarning(isDirty && !submitting);

  const selectedCount = selectedGames.length;
  const selectionLabel =
    selectedCount === 0
      ? "Nenhum jogo selecionado"
      : selectedCount <= 3
        ? selectedGames.map((game) => game.title).join(", ")
        : `${selectedCount} jogos selecionados`;

  const platformOptions = Array.from(new Set([...availablePlatforms, ...form.platforms]))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  const storeOptions = Array.from(new Set([...availableStores, ...form.stores]))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  const tagOptions = Array.from(new Set([...availableTags, ...splitCsvTokens(form.tags)]))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  const updatePlatforms = (nextPlatforms: string[]) => {
    const normalized = splitCsvTokens(nextPlatforms);
    onChange("platforms", normalized);
    onChange(
      "primaryPlatform",
      normalized.includes(form.primaryPlatform) ? form.primaryPlatform : (normalized[0] ?? ""),
    );
  };

  const updateStores = (nextStores: string[]) => {
    const normalized = splitCsvTokens(nextStores);
    onChange("stores", normalized);
    onChange("primaryStore", normalized.includes(form.primaryStore) ? form.primaryStore : (normalized[0] ?? ""));
  };

  const updateTags = (nextTags: string[]) => {
    onChange("tags", splitCsvTokens(nextTags).join(", "));
  };

  const toggleToken = (currentValues: string[], value: string, update: (values: string[]) => void) => {
    update(currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value]);
  };

  const toggleListId = (listId: number) => {
    onChange(
      "listIds",
      form.listIds.includes(listId) ? form.listIds.filter((item) => item !== listId) : [...form.listIds, listId],
    );
  };

  const addPlatformsFromDraft = () => {
    if (!platformDraft.trim()) return;
    updatePlatforms([...form.platforms, ...splitCsvTokens(platformDraft)]);
    setPlatformDraft("");
  };

  const addStoresFromDraft = () => {
    if (!storeDraft.trim()) return;
    updateStores([...form.stores, ...splitCsvTokens(storeDraft)]);
    setStoreDraft("");
  };

  const addTagsFromDraft = () => {
    if (!tagDraft.trim()) return;
    updateTags([...splitCsvTokens(form.tags), ...splitCsvTokens(tagDraft)]);
    setTagDraft("");
  };

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (
      isDirty &&
      !confirmDiscardChanges("Há alterações não aplicadas na edição em lote. Deseja descartar e fechar?")
    ) {
      return;
    }
    onClose();
  }, [isDirty, onClose, submitting]);

  if (!open) return null;

  return (
    <Modal
      title="Editar em lote"
      description="Aplique status, prioridade, listas, tags e relações estruturadas para vários jogos de uma vez."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="batch-edit-summary">
          <strong>{selectedCount} item(ns)</strong>
          <span>{selectionLabel}</span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Modo de aplicação</span>
            <select
              autoFocus
              data-autofocus
              value={form.applyMode}
              onChange={(event) => onChange("applyMode", event.target.value as LibraryBatchApplyMode)}
            >
              <option value="merge">Mesclar com dados atuais</option>
              <option value="replace">Substituir listas/tags/relações</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => onChange("status", event.target.value as LibraryBatchEditState["status"])}
            >
              <option value="">Manter atual</option>
              {gameStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select
              value={form.priority}
              onChange={(event) => onChange("priority", event.target.value as LibraryBatchEditState["priority"])}
            >
              <option value="">Manter atual</option>
              {gamePriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <div className="field field--wide">
            <span>Plataformas estruturadas</span>
            <div className="selection-chip-grid">
              {platformOptions.map((platformName) => (
                <button
                  key={`batch-platform-${platformName}`}
                  type="button"
                  className={cx("selection-chip", form.platforms.includes(platformName) && "selection-chip--active")}
                  onClick={() => toggleToken(form.platforms, platformName, updatePlatforms)}
                >
                  {platformName}
                </button>
              ))}
            </div>
            <div className="field__aux field__aux--inline">
              <input
                value={platformDraft}
                onChange={(event) => setPlatformDraft(event.target.value)}
                placeholder="Adicionar plataformas"
              />
              <NotchButton type="button" variant="secondary" onClick={addPlatformsFromDraft}>
                Adicionar
              </NotchButton>
            </div>
          </div>
          <label className="field">
            <span>Plataforma principal</span>
            <select value={form.primaryPlatform} onChange={(event) => onChange("primaryPlatform", event.target.value)}>
              <option value="">Derivar automaticamente</option>
              {form.platforms.map((platformName) => (
                <option key={`batch-primary-platform-${platformName}`} value={platformName}>
                  {platformName}
                </option>
              ))}
            </select>
          </label>

          <div className="field field--wide">
            <span>Stores estruturadas</span>
            <div className="selection-chip-grid">
              {storeOptions.map((storeName) => (
                <button
                  key={`batch-store-${storeName}`}
                  type="button"
                  className={cx("selection-chip", form.stores.includes(storeName) && "selection-chip--active")}
                  onClick={() => toggleToken(form.stores, storeName, updateStores)}
                >
                  {storeName}
                </button>
              ))}
            </div>
            <div className="field__aux field__aux--inline">
              <input
                value={storeDraft}
                onChange={(event) => setStoreDraft(event.target.value)}
                placeholder="Adicionar stores"
              />
              <NotchButton type="button" variant="secondary" onClick={addStoresFromDraft}>
                Adicionar
              </NotchButton>
            </div>
          </div>
          <label className="field">
            <span>Store principal</span>
            <select value={form.primaryStore} onChange={(event) => onChange("primaryStore", event.target.value)}>
              <option value="">Derivar automaticamente</option>
              {form.stores.map((storeName) => (
                <option key={`batch-primary-store-${storeName}`} value={storeName}>
                  {storeName}
                </option>
              ))}
            </select>
          </label>

          <div className="field field--wide">
            <span>Tags</span>
            <div className="selection-chip-grid">
              {tagOptions.map((tagName) => (
                <button
                  key={`batch-tag-${tagName}`}
                  type="button"
                  className={cx(
                    "selection-chip",
                    splitCsvTokens(form.tags).includes(tagName) && "selection-chip--active",
                  )}
                  onClick={() => toggleToken(splitCsvTokens(form.tags), tagName, updateTags)}
                >
                  {tagName}
                </button>
              ))}
            </div>
            <div className="field__aux field__aux--inline">
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder="Adicionar tags"
              />
              <NotchButton type="button" variant="secondary" onClick={addTagsFromDraft}>
                Adicionar
              </NotchButton>
            </div>
          </div>

          <div className="field field--wide">
            <span>Listas</span>
            <div className="selection-chip-grid">
              {availableLists.map((list) => (
                <button
                  key={`batch-list-${list.id}`}
                  type="button"
                  className={cx("selection-chip", form.listIds.includes(list.id) && "selection-chip--active")}
                  onClick={() => toggleListId(list.id)}
                >
                  {list.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting || selectedCount === 0}>
            Aplicar edição em lote
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function ImportModal(props: {
  open: boolean;
  source: ImportSource;
  text: string;
  fileName: string;
  preview: ImportPreviewEntry[] | null;
  summary: ImportPreviewSummary;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  submitting?: boolean;
  onSourceChange: (value: ImportSource) => void;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onActionChange: (entryId: string, action: ImportPreviewAction) => void;
  onMatchChange: (entryId: string, matchId: number | null) => void;
  onGameChange: (entryId: string, gameId: number | null) => void;
  onRawgChange: (entryId: string, rawgId: number | null) => void;
  onApplySuggested: () => void;
  onAutoMergeSafe: () => void;
  onIgnoreUnsafe: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  const {
    open,
    source,
    text,
    fileName,
    preview,
    summary,
    fileInputRef,
    submitting = false,
    onSourceChange,
    onTextChange,
    onFileChange,
    onActionChange,
    onMatchChange,
    onGameChange,
    onRawgChange,
    onApplySuggested,
    onAutoMergeSafe,
    onIgnoreUnsafe,
    onSubmit,
    onClose,
  } = props;

  const [activeTab, setActiveTab] = useState<"import" | "history">("import");
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [initialSnapshot] = useState(() => serializeModalValue({ source, text, fileName, preview }));

  useEffect(() => {
    if (activeTab === "history" && open) {
      db.importJobs
        .orderBy("createdAt")
        .reverse()
        .toArray()
        .then(setHistory)
        .catch(() => {});
    }
  }, [activeTab, open]);

  const serializedImportState = useMemo(
    () => serializeModalValue({ source, text, fileName, preview }),
    [fileName, preview, source, text],
  );
  const isDirty = serializedImportState !== initialSnapshot;

  useUnsavedChangesWarning(isDirty && !submitting);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (
      isDirty &&
      !confirmDiscardChanges("Há um preview ou conteúdo de importação não aplicado. Deseja descartar e fechar?")
    ) {
      return;
    }
    setActiveTab("import");
    onClose();
  }, [isDirty, onClose, submitting]);

  if (!open) return null;

  return (
    <Modal
      title="Importar biblioteca"
      description="Cole CSV ou JSON exportado de Steam, Playnite, Notion ou uma planilha genérica."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      <div className="modal-tabs" style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <NotchButton
          type="button"
          variant={activeTab === "import" ? "primary" : "ghost"}
          onClick={() => setActiveTab("import")}
        >
          Importar
        </NotchButton>
        <NotchButton
          type="button"
          variant={activeTab === "history" ? "primary" : "ghost"}
          onClick={() => setActiveTab("history")}
        >
          Histórico
        </NotchButton>
      </div>

      {activeTab === "history" ? (
        <div className="preview-list" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {history.length === 0 ? (
            <p className="preview-card__hint">Nenhum histórico de importação encontrado.</p>
          ) : (
            history.map((job) => {
              const formattedChanges = formatImportJobChanges(job.changes);

              return (
                <article className="preview-card" key={job.id}>
                  <div className="preview-card__head">
                    <div>
                      <strong>Origem: {job.source.toUpperCase()}</strong>
                      <span>{new Date(job.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <Pill tone={job.status === "completed" ? "emerald" : job.status === "failed" ? "magenta" : "cyan"}>
                      {job.status === "completed" ? "Sucesso" : job.status === "failed" ? "Falha" : job.status}
                    </Pill>
                  </div>
                  <p>{job.summary}</p>
                  {formattedChanges ? (
                    <details style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
                      <summary style={{ cursor: "pointer", outline: "none" }}>Ver alterações</summary>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          background: "rgba(0,0,0,0.2)",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          marginTop: "0.5rem",
                        }}
                      >
                        {formattedChanges}
                      </pre>
                    </details>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      ) : (
        <form className="modal-form" onSubmit={onSubmit}>
          <div className={cx("form-grid", preview && "flow-hidden")}>
            <label className="field">
              <span>Origem</span>
              <select
                autoFocus
                data-autofocus
                value={source}
                onChange={(event) => onSourceChange(event.target.value as ImportSource)}
              >
                {importSources.map((item) => (
                  <option key={item} value={item}>
                    {item === "notion" ? "NOTION (CSV)" : item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>Arquivo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                className="sr-only"
                onChange={onFileChange}
              />
              <div className="field__aux">
                <NotchButton type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Download size={14} />
                  Carregar arquivo
                </NotchButton>
                <small>{fileName || "CSV, JSON ou TXT"}</small>
              </div>
            </div>
            <label className="field field--wide">
              <span>Conteúdo</span>
              <textarea
                rows={10}
                value={text}
                placeholder="Cole aqui o CSV ou JSON exportado..."
                onChange={(event) => onTextChange(event.target.value)}
              />
            </label>
          </div>

          {preview ? (
            <>
              <div className="preview-summary-grid">
                <article className="preview-summary-card">
                  <span>Revisão manual</span>
                  <strong>{summary.review}</strong>
                  <small>Itens que exigem checagem</small>
                </article>
                <article className="preview-summary-card">
                  <span>Matches diretos</span>
                  <strong>{summary.existing}</strong>
                  <small>Entradas já reconhecidas</small>
                </article>
                <article className="preview-summary-card">
                  <span>Merge assistido</span>
                  <strong>{summary.assisted}</strong>
                  <small>Vínculos prontos para atualizar</small>
                </article>
                <article className="preview-summary-card">
                  <span>Manutenção</span>
                  <strong>{summary.maintenance}</strong>
                  <small>Cards com sinais de deduplicação</small>
                </article>
                <article className="preview-summary-card">
                  <span>Novos itens</span>
                  <strong>{summary.fresh}</strong>
                  <small>Entradas sem match local</small>
                </article>
                <article className="preview-summary-card">
                  <span>Repetições no arquivo</span>
                  <strong>{summary.duplicates}</strong>
                  <small>Linhas consolidadas no preview</small>
                </article>
              </div>

              <div className="preview-batch-bar">
                <NotchButton type="button" variant="secondary" onClick={onApplySuggested}>
                  Aplicar sugestões
                </NotchButton>
                <NotchButton type="button" variant="secondary" onClick={onAutoMergeSafe}>
                  Auto-mesclar seguros
                </NotchButton>
                <NotchButton type="button" variant="ghost" onClick={onIgnoreUnsafe}>
                  Ignorar ambíguos
                </NotchButton>
              </div>

              <div className="preview-list">
                {preview.map((entry) => (
                  <article className="preview-card" key={entry.id}>
                    <div className="preview-card__head">
                      <div>
                        <strong>{entry.payload.title}</strong>
                        <span>
                          {entry.payload.platform} • {entry.payload.sourceStore}
                        </span>
                      </div>
                      <label className="field preview-card__field">
                        <span>Ação</span>
                        <select
                          value={entry.action}
                          onChange={(event) => onActionChange(entry.id, event.target.value as ImportPreviewAction)}
                        >
                          <option value="create">Criar</option>
                          <option value="update">Atualizar</option>
                          <option value="ignore">Ignorar</option>
                        </select>
                      </label>
                    </div>
                    <div className="preview-card__stats">
                      <span>
                        Confiança <strong>{entry.confidenceScore}%</strong>
                      </span>
                      <span>
                        Plano <strong>{entry.suggestedAction === "update" ? "Atualizar" : "Criar"}</strong>
                      </span>
                      {entry.duplicateCount > 0 ? (
                        <span>
                          Repetições <strong>{entry.duplicateCount}</strong>
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {entry.status === "existing"
                        ? `Match encontrado no catálogo: ${entry.existingTitle}`
                        : entry.status === "review"
                          ? "Há conflitos locais ou oportunidade de merge assistido/manutenção. Revise antes de aplicar."
                          : "Novo item pronto para entrar na biblioteca."}
                    </p>
                    {entry.reviewReasons.length > 0 ? (
                      <div className="detail-note__tags">
                        {entry.reviewReasons.map((reason) => (
                          <Pill key={`${entry.id}-${reason}`} tone="neutral">
                            {reason}
                          </Pill>
                        ))}
                      </div>
                    ) : null}
                    {entry.overlapPlatforms.length > 0 || entry.overlapStores.length > 0 ? (
                      <div className="preview-overlap-grid">
                        {entry.overlapPlatforms.length > 0 ? (
                          <div className="preview-overlap-card">
                            <span>Plataformas em comum</span>
                            <strong>{entry.overlapPlatforms.join(", ")}</strong>
                          </div>
                        ) : null}
                        {entry.overlapStores.length > 0 ? (
                          <div className="preview-overlap-card">
                            <span>Stores em comum</span>
                            <strong>{entry.overlapStores.join(", ")}</strong>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {entry.maintenanceSignals.length > 0 ? (
                      <div className="preview-maintenance-card">
                        <span>Fila de manutenção</span>
                        <div className="detail-note__tags">
                          {entry.maintenanceSignals.map((signal) => (
                            <Pill key={`${entry.id}-${signal}`} tone="yellow">
                              {signal}
                            </Pill>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {entry.matchCandidates.length > 0 ? (
                      <label className="field preview-card__field preview-card__field--wide">
                        <span>Atualizar LibraryEntry existente</span>
                        <select
                          value={entry.selectedMatchId ?? ""}
                          onChange={(event) =>
                            onMatchChange(entry.id, event.target.value ? Number(event.target.value) : null)
                          }
                        >
                          <option value="">Criar nova LibraryEntry</option>
                          {entry.matchCandidates.map((candidate) => (
                            <option key={`${candidate.entryId}-${candidate.platform}`} value={candidate.entryId}>
                              {candidate.title} • {candidate.platform} • {candidate.sourceStore} • {candidate.score}%
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {entry.gameCandidates.length > 0 ? (
                      <label className="field preview-card__field preview-card__field--wide">
                        <span>Vincular ao Game existente</span>
                        <select
                          value={entry.selectedGameId ?? ""}
                          onChange={(event) =>
                            onGameChange(entry.id, event.target.value ? Number(event.target.value) : null)
                          }
                        >
                          <option value="">Criar Game novo</option>
                          {entry.gameCandidates.map((candidate) => (
                            <option key={`${entry.id}-game-${candidate.gameId}`} value={candidate.gameId}>
                              {candidate.title}
                              {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                              {candidate.platforms.length > 0 ? ` • ${candidate.platforms.join(", ")}` : ""}
                              {` • ${candidate.score}%`}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {entry.rawgCandidates.length > 0 ? (
                      <label className="field preview-card__field preview-card__field--wide">
                        <span>Enriquecimento RAWG</span>
                        <select
                          value={entry.selectedRawgId ?? ""}
                          onChange={(event) =>
                            onRawgChange(entry.id, event.target.value ? Number(event.target.value) : null)
                          }
                        >
                          <option value="">Sem enriquecimento</option>
                          {entry.rawgCandidates.map((candidate) => (
                            <option key={candidate.rawgId} value={candidate.rawgId}>
                              {candidate.title}
                              {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                              {candidate.platforms.length > 0 ? ` • ${candidate.platforms.join(", ")}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : entry.enrichmentStatus === "missing" ? (
                      <p className="preview-card__hint">
                        Nenhum candidato RAWG confiável foi encontrado para este item.
                      </p>
                    ) : null}
                    <div className="preview-card__meta">
                      <Pill tone={entry.status === "new" ? "yellow" : entry.status === "review" ? "cyan" : "magenta"}>
                        {entry.status === "new" ? "Novo" : entry.status === "review" ? "Conflito" : "Duplicado"}
                      </Pill>
                      {entry.duplicateCount > 0 ? <Pill tone="neutral">+{entry.duplicateCount} repetições</Pill> : null}
                      {entry.payload.pricePaid ||
                      entry.payload.purchaseDate ||
                      entry.payload.storeLink ||
                      entry.payload.startedAt ? (
                        <Pill tone="emerald">Financeiro</Pill>
                      ) : null}
                      {entry.confidenceScore >= 78 ? <Pill tone="emerald">Confiança alta</Pill> : null}
                      {entry.maintenanceSignals.length > 0 ? <Pill tone="yellow">Manutenção</Pill> : null}
                      {entry.selectedGameId ? <Pill tone="yellow">Game vinculado</Pill> : null}
                      {entry.selectedRawgId ? <Pill tone="cyan">RAWG ativo</Pill> : null}
                      <Pill
                        tone={entry.action === "ignore" ? "neutral" : entry.action === "update" ? "magenta" : "cyan"}
                      >
                        {entry.action === "create" ? "Criar" : entry.action === "update" ? "Atualizar" : "Ignorar"}
                      </Pill>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          <div className="modal-actions">
            <NotchButton variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
              Cancelar
            </NotchButton>
            <NotchButton variant="primary" type="submit" disabled={submitting}>
              {preview ? "Aplicar importação" : "Gerar preview"}
            </NotchButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function RestoreModal(props: {
  open: boolean;
  mode: RestoreMode;
  text: string;
  fileName: string;
  preview: RestorePreview | null;
  totals: RestorePreviewTotals;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  submitting?: boolean;
  onModeChange: (value: RestoreMode) => void;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  const {
    open,
    mode,
    text,
    fileName,
    preview,
    totals,
    fileInputRef,
    submitting = false,
    onModeChange,
    onTextChange,
    onFileChange,
    onSubmit,
    onClose,
  } = props;

  const [initialSnapshot] = useState(() => serializeModalValue({ mode, text, fileName, preview }));

  const serializedRestoreState = useMemo(
    () => serializeModalValue({ mode, text, fileName, preview }),
    [fileName, mode, preview, text],
  );
  const isDirty = serializedRestoreState !== initialSnapshot;

  useUnsavedChangesWarning(isDirty && !submitting);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (
      isDirty &&
      !confirmDiscardChanges("Há um preview ou backup carregado que ainda não foi aplicado. Deseja descartar e fechar?")
    ) {
      return;
    }
    onClose();
  }, [isDirty, onClose, submitting]);

  if (!open) return null;

  return (
    <Modal
      title="Restaurar backup"
      description="Carregue um backup JSON do app e escolha entre mesclar ou substituir a base local."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className={cx("form-grid", preview && "flow-hidden")}>
          <label className="field">
            <span>Modo</span>
            <select
              autoFocus
              data-autofocus
              value={mode}
              onChange={(event) => onModeChange(event.target.value as RestoreMode)}
            >
              <option value="merge">Mesclar com a base atual</option>
              <option value="replace">Substituir toda a base local</option>
            </select>
          </label>
          <div className="field">
            <span>Arquivo</span>
            <input ref={fileInputRef} type="file" accept=".json,.txt" className="sr-only" onChange={onFileChange} />
            <div className="field__aux">
              <NotchButton type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Carregar backup
              </NotchButton>
              <small>{fileName || "JSON exportado pelo app"}</small>
            </div>
          </div>
          <label className="field field--wide">
            <span>Backup JSON</span>
            <textarea
              rows={10}
              value={text}
              placeholder="Cole aqui o JSON de backup..."
              onChange={(event) => onTextChange(event.target.value)}
            />
          </label>
        </div>

        {preview ? (
          <>
            <div className="preview-summary-grid">
              <article className="preview-summary-card">
                <span>Modo</span>
                <strong>{preview.mode === "replace" ? "Replace" : "Merge"}</strong>
                <small>{new Date(preview.exportedAt).toLocaleString("pt-BR")}</small>
              </article>
              <article className="preview-summary-card">
                <span>Novos registros</span>
                <strong>{totals.create}</strong>
                <small>Itens que serão criados</small>
              </article>
              <article className="preview-summary-card">
                <span>Atualizações</span>
                <strong>{totals.update}</strong>
                <small>Itens existentes reaproveitados</small>
              </article>
              <article className="preview-summary-card">
                <span>Ignorados</span>
                <strong>{totals.skip}</strong>
                <small>Duplicados ou sem relação válida</small>
              </article>
            </div>
            <div className="preview-list preview-list--compact">
              {preview.items.map((item) => (
                <article className="preview-card preview-card--compact" key={item.label}>
                  <div className="preview-card__head">
                    <strong>{item.label}</strong>
                    <Pill tone="neutral">{item.create + item.update + item.skip} itens</Pill>
                  </div>
                  <div className="preview-card__stats">
                    <span>
                      Novo <strong>{item.create}</strong>
                    </span>
                    <span>
                      Atualizar <strong>{item.update}</strong>
                    </span>
                    <span>
                      Ignorar <strong>{item.skip}</strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="preview-hint">
            {mode === "replace"
              ? "Replace limpa a base local antes de restaurar tudo do arquivo."
              : "Merge reaproveita jogos existentes por título + plataforma e evita duplicar sessões."}
          </div>
        )}

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {preview ? (preview.mode === "replace" ? "Substituir base local" : "Aplicar restore") : "Gerar preview"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function SessionModal(props: {
  open: boolean;
  mode?: "create" | "edit";
  form: SessionFormState;
  libraryGames: Game[];
  submitting?: boolean;
  onChange: <K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  const { open, mode = "create", form, libraryGames, submitting = false, onChange, onSubmit, onClose } = props;

  const [initialSnapshot] = useState(() => serializeModalValue(form));

  const serializedForm = useMemo(() => serializeModalValue(form), [form]);
  const isDirty = serializedForm !== initialSnapshot;

  useUnsavedChangesWarning(isDirty && !submitting);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (isDirty && !confirmDiscardChanges("Há alterações não salvas na sessão. Deseja descartar e fechar?")) {
      return;
    }
    onClose();
  }, [isDirty, onClose, submitting]);

  if (!open) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar sessão" : "Registrar sessão"}
      description={
        mode === "edit"
          ? "Altere os dados desta sessão de jogo."
          : "Atualize o diário de jogo e alimente as estatísticas do sistema."
      }
      onClose={handleClose}
      closeDisabled={submitting}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field field--wide">
            <span>Jogo</span>
            <select
              autoFocus={mode !== "edit"}
              data-autofocus={mode !== "edit" ? true : undefined}
              value={form.gameId}
              onChange={(event) => onChange("gameId", event.target.value)}
              disabled={mode === "edit"}
            >
              <option value="">Selecione...</option>
              {libraryGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Data</span>
            <input
              autoFocus={mode === "edit"}
              data-autofocus={mode === "edit" ? true : undefined}
              type="date"
              value={form.date}
              onChange={(event) => onChange("date", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Duração (min)</span>
            <input
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={(event) => onChange("durationMinutes", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Progresso após sessão</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.completionPercent}
              onChange={(event) => onChange("completionPercent", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Mood</span>
            <input value={form.mood} onChange={(event) => onChange("mood", event.target.value)} />
          </label>
          <label className="field field--wide">
            <span>Nota rápida</span>
            <textarea rows={4} value={form.note} onChange={(event) => onChange("note", event.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {mode === "edit" ? "Salvar alterações" : "Salvar sessão"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function GoalModal(props: {
  mode: "create" | "edit" | null;
  form: GoalFormState;
  submitting?: boolean;
  onChange: <K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
}) {
  const { mode, form, submitting = false, onChange, onSubmit, onClose } = props;

  const [initialSnapshot] = useState(() => serializeModalValue(form));

  const serializedForm = useMemo(() => serializeModalValue(form), [form]);
  const isDirty = serializedForm !== initialSnapshot;

  useUnsavedChangesWarning(isDirty && !submitting);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (isDirty && !confirmDiscardChanges("Há alterações não salvas na meta. Deseja descartar e fechar?")) {
      return;
    }
    onClose();
  }, [isDirty, onClose, submitting]);

  if (!mode) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar meta" : "Nova meta"}
      description="Defina um objetivo para acompanhar seu progresso no backlog."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Tipo</span>
            <select
              autoFocus
              data-autofocus
              value={form.type}
              onChange={(event) => onChange("type", event.target.value)}
            >
              {goalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Período</span>
            <select value={form.period} onChange={(event) => onChange("period", event.target.value)}>
              {goalPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Alvo</span>
            <input
              type="number"
              min="1"
              value={form.target}
              onChange={(event) => onChange("target", event.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </NotchButton>
          <NotchButton variant="primary" type="submit" disabled={submitting}>
            {mode === "edit" ? "Salvar alterações" : "Criar meta"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}
