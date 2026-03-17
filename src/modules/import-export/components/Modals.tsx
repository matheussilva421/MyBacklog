import type { ChangeEvent, FormEvent, MutableRefObject } from "react";
import { Download, Upload } from "lucide-react";
import type { ImportSource } from "../utils/importExport";
import {
  cx,
  importSources,
  type ImportPreviewAction,
  type ImportPreviewEntry,
  type RestoreMode,
  type RestorePreview,
} from "../../../backlog/shared";
import { Modal, NotchButton, Pill } from "../../../components/cyberpunk-ui";

export type ImportPreviewSummary = {
  create: number;
  update: number;
  ignore: number;
  fresh: number;
  existing: number;
  duplicates: number;
};

export type RestorePreviewTotals = {
  create: number;
  update: number;
  skip: number;
};

export function ImportModal({
  open,
  importSource,
  importText,
  importFileName,
  importPreview,
  importPreviewSummary,
  importFileInputRef,
  onSourceChange,
  onTextChange,
  onFileChange,
  onPreviewActionChange,
  onSubmit,
  onClose,
  onBack,
}: {
  open: boolean;
  importSource: ImportSource;
  importText: string;
  importFileName: string;
  importPreview: ImportPreviewEntry[] | null;
  importPreviewSummary: ImportPreviewSummary;
  importFileInputRef: MutableRefObject<HTMLInputElement | null>;
  onSourceChange: (value: ImportSource) => void;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPreviewActionChange: (entryId: string, action: ImportPreviewAction) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
  onBack: () => void;
}) {
  if (!open) return null;

  return (
    <Modal
      title="Importar biblioteca"
      description="Cole CSV ou JSON exportado de Steam, Playnite ou uma planilha genérica."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className={cx("form-grid", importPreview && "flow-hidden")}>
          <label className="field">
            <span>Origem</span>
            <select value={importSource} onChange={(event) => onSourceChange(event.target.value as ImportSource)}>
              {importSources.map((source) => <option key={source} value={source}>{source.toUpperCase()}</option>)}
            </select>
          </label>
          <div className="field">
            <span>Arquivo</span>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="sr-only"
              onChange={onFileChange}
            />
            <div className="field__aux">
              <NotchButton type="button" variant="secondary" onClick={() => importFileInputRef.current?.click()}>
                <Download size={14} />
                Carregar arquivo
              </NotchButton>
              <small>{importFileName || "CSV, JSON ou TXT"}</small>
            </div>
          </div>
          <label className="field field--wide">
            <span>Conteúdo</span>
            <textarea
              rows={10}
              value={importText}
              placeholder="Cole aqui o CSV ou JSON exportado..."
              onChange={(event) => onTextChange(event.target.value)}
            />
          </label>
        </div>

        {importPreview ? (
          <>
            <div className="preview-summary-grid">
              <article className="preview-summary-card">
                <span>Novos itens</span>
                <strong>{importPreviewSummary.fresh}</strong>
                <small>Entradas sem match local</small>
              </article>
              <article className="preview-summary-card">
                <span>Duplicados locais</span>
                <strong>{importPreviewSummary.existing}</strong>
                <small>Itens que podem atualizar</small>
              </article>
              <article className="preview-summary-card">
                <span>Repetições no arquivo</span>
                <strong>{importPreviewSummary.duplicates}</strong>
                <small>Linhas consolidadas no preview</small>
              </article>
              <article className="preview-summary-card">
                <span>Aplicação atual</span>
                <strong>{importPreviewSummary.create + importPreviewSummary.update}</strong>
                <small>{importPreviewSummary.ignore} ignorados</small>
              </article>
            </div>

            <div className="preview-list">
              {importPreview.map((entry) => (
                <article className="preview-card" key={entry.id}>
                  <div className="preview-card__head">
                    <div>
                      <strong>{entry.payload.title}</strong>
                      <span>{entry.payload.platform} • {entry.payload.sourceStore}</span>
                    </div>
                    <label className="field preview-card__field">
                      <span>Ação</span>
                      <select
                        value={entry.action}
                        onChange={(event) => onPreviewActionChange(entry.id, event.target.value as ImportPreviewAction)}
                      >
                        {entry.status === "new" ? (
                          <>
                            <option value="create">Criar</option>
                            <option value="ignore">Ignorar</option>
                          </>
                        ) : (
                          <>
                            <option value="update">Atualizar existente</option>
                            <option value="ignore">Ignorar</option>
                          </>
                        )}
                      </select>
                    </label>
                  </div>
                  <p>
                    {entry.status === "existing"
                      ? `Match encontrado no catálogo: ${entry.existingTitle}`
                      : "Novo item pronto para entrar na biblioteca."}
                  </p>
                  <div className="preview-card__meta">
                    <Pill tone={entry.status === "new" ? "yellow" : "magenta"}>
                      {entry.status === "new" ? "Novo" : "Duplicado"}
                    </Pill>
                    {entry.duplicateCount > 0 ? <Pill tone="neutral">+{entry.duplicateCount} repetições</Pill> : null}
                    <Pill tone={entry.action === "ignore" ? "neutral" : entry.action === "update" ? "magenta" : "cyan"}>
                      {entry.action === "create" ? "Criar" : entry.action === "update" ? "Atualizar" : "Ignorar"}
                    </Pill>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={importPreview ? onBack : onClose}>
            {importPreview ? "Voltar" : "Cancelar"}
          </NotchButton>
          <NotchButton variant="primary" type="submit">
            {importPreview ? "Aplicar importação" : "Gerar preview"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}

export function RestoreModal({
  open,
  restoreMode,
  restoreText,
  restoreFileName,
  restorePreview,
  restorePreviewTotals,
  restoreFileInputRef,
  onModeChange,
  onTextChange,
  onFileChange,
  onSubmit,
  onClose,
  onBack,
}: {
  open: boolean;
  restoreMode: RestoreMode;
  restoreText: string;
  restoreFileName: string;
  restorePreview: RestorePreview | null;
  restorePreviewTotals: RestorePreviewTotals;
  restoreFileInputRef: MutableRefObject<HTMLInputElement | null>;
  onModeChange: (value: RestoreMode) => void;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onClose: () => void;
  onBack: () => void;
}) {
  if (!open) return null;

  return (
    <Modal
      title="Restaurar backup"
      description="Carregue um backup JSON do app e escolha entre mesclar ou substituir a base local."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className={cx("form-grid", restorePreview && "flow-hidden")}>
          <label className="field">
            <span>Modo</span>
            <select value={restoreMode} onChange={(event) => onModeChange(event.target.value as RestoreMode)}>
              <option value="merge">Mesclar com a base atual</option>
              <option value="replace">Substituir toda a base local</option>
            </select>
          </label>
          <div className="field">
            <span>Arquivo</span>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json,.txt"
              className="sr-only"
              onChange={onFileChange}
            />
            <div className="field__aux">
              <NotchButton type="button" variant="secondary" onClick={() => restoreFileInputRef.current?.click()}>
                <Upload size={14} />
                Carregar backup
              </NotchButton>
              <small>{restoreFileName || "JSON exportado pelo app"}</small>
            </div>
          </div>
          <label className="field field--wide">
            <span>Backup JSON</span>
            <textarea
              rows={10}
              value={restoreText}
              placeholder="Cole aqui o JSON de backup..."
              onChange={(event) => onTextChange(event.target.value)}
            />
          </label>
        </div>

        {restorePreview ? (
          <>
            <div className="preview-summary-grid">
              <article className="preview-summary-card">
                <span>Modo</span>
                <strong>{restorePreview.mode === "replace" ? "Replace" : "Merge"}</strong>
                <small>{new Date(restorePreview.exportedAt).toLocaleString("pt-BR")}</small>
              </article>
              <article className="preview-summary-card">
                <span>Novos registros</span>
                <strong>{restorePreviewTotals.create}</strong>
                <small>Itens que serão criados</small>
              </article>
              <article className="preview-summary-card">
                <span>Atualizações</span>
                <strong>{restorePreviewTotals.update}</strong>
                <small>Itens existentes reaproveitados</small>
              </article>
              <article className="preview-summary-card">
                <span>Ignorados</span>
                <strong>{restorePreviewTotals.skip}</strong>
                <small>Duplicados ou sem relação válida</small>
              </article>
            </div>

            <div className="preview-list preview-list--compact">
              {restorePreview.items.map((item) => (
                <article className="preview-card preview-card--compact" key={item.label}>
                  <div className="preview-card__head">
                    <strong>{item.label}</strong>
                    <Pill tone="neutral">{item.create + item.update + item.skip} itens</Pill>
                  </div>
                  <div className="preview-card__stats">
                    <span>Novo <strong>{item.create}</strong></span>
                    <span>Atualizar <strong>{item.update}</strong></span>
                    <span>Ignorar <strong>{item.skip}</strong></span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="preview-hint">
            {restoreMode === "replace"
              ? "Replace limpa a base local antes de restaurar tudo do arquivo."
              : "Merge reaproveita jogos existentes por título + plataforma e evita duplicar sessões."}
          </div>
        )}

        <div className="modal-actions">
          <NotchButton variant="ghost" type="button" onClick={restorePreview ? onBack : onClose}>
            {restorePreview ? "Voltar" : "Cancelar"}
          </NotchButton>
          <NotchButton variant="primary" type="submit">
            {restorePreview ? (restorePreview.mode === "replace" ? "Substituir base local" : "Aplicar restore") : "Gerar preview"}
          </NotchButton>
        </div>
      </form>
    </Modal>
  );
}
