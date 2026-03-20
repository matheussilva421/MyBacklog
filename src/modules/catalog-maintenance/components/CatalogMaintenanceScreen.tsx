import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  GitMerge,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cx } from "../../../backlog/shared";
import { EmptyState, NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";
import type { CatalogMaintenanceReport } from "../utils/catalogMaintenance";

type CatalogMaintenanceScreenProps = {
  report: CatalogMaintenanceReport;
  hasRawgApiKey: boolean;
  onRepairStructural: () => Promise<void>;
  onMergeDuplicateGroup: (primaryEntryId: number, mergedEntryIds: number[]) => Promise<void>;
  onNormalizeEntry: (libraryEntryId: number) => Promise<void>;
  onNormalizeQueue: () => Promise<void>;
  onConsolidateAliasGroup: (kind: "store" | "platform", normalizedName: string) => Promise<void>;
  onEnrichMetadata: (gameId: number) => Promise<void>;
  onEnrichMetadataQueue: () => Promise<void>;
  onOpenGamePage: (libraryEntryId: number) => void;
  onOpenEditGame: (libraryEntryId: number) => void;
};

export function CatalogMaintenanceScreen({
  report,
  hasRawgApiKey,
  onRepairStructural,
  onMergeDuplicateGroup,
  onNormalizeEntry,
  onNormalizeQueue,
  onConsolidateAliasGroup,
  onEnrichMetadata,
  onEnrichMetadataQueue,
  onOpenGamePage,
  onOpenEditGame,
}: CatalogMaintenanceScreenProps) {
  const structuralIssues = report.audit.issues.filter((issue) => issue.kind !== "missing_metadata");
  const orphanIssues = report.audit.issues.filter((issue) => issue.kind === "orphan_session");

  return (
    <div className="catalog-maintenance-layout">
      <Panel>
        <SectionHeader
          icon={DatabaseZap}
          title="Painel de manutenção"
          description="Auditoria, duplicados, metadado faltante e reparos operacionais do catálogo."
        />
        <div className="catalog-audit-summary">
          <div className="detail-stat">
            <span>Achados totais</span>
            <strong>{report.summary.totalIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Estruturais</span>
            <strong>{report.summary.structuralIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Duplicados</span>
            <strong>{report.summary.duplicateGroups}</strong>
          </div>
          <div className="detail-stat">
            <span>Fila de metadado</span>
            <strong>{report.summary.metadataQueue}</strong>
          </div>
          <div className="detail-stat">
            <span>Normalização</span>
            <strong>{report.summary.normalizationQueue}</strong>
          </div>
          <div className="detail-stat">
            <span>Aliases</span>
            <strong>{report.summary.aliasGroups}</strong>
          </div>
          <div className="detail-stat">
            <span>Sessões órfãs</span>
            <strong>{report.summary.orphanSessions}</strong>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={GitMerge}
          title="Detecção de duplicados"
          description="Grupos sugeridos para manter, ignorar ou mesclar sem perder histórico."
        />

        <div className="audit-list">
          {report.duplicateGroups.length === 0 ? (
            <EmptyState message="Nenhum grupo duplicado detectado no catálogo." />
          ) : (
            report.duplicateGroups.map((group) => (
              <article className={cx("audit-card", "app-card")} key={group.id}>
                <div className="audit-card__head">
                  <div className="audit-card__title">
                    <GitMerge size={18} />
                    <h3>
                      {group.title} • {group.platform}
                    </h3>
                  </div>
                  <Pill
                    tone={
                      group.suggestedAction === "merge"
                        ? "cyan"
                        : group.suggestedAction === "keep"
                          ? "yellow"
                          : "magenta"
                    }
                  >
                    Sugerido: {group.suggestedAction === "merge" ? "Mesclar" : group.suggestedAction === "keep" ? "Manter" : "Ignorar"}
                  </Pill>
                </div>

                <p>{group.reasons.join(" ")}</p>

                <div className="detail-note__tags">
                  {group.overlapPlatforms.map((platform) => (
                    <Pill key={`${group.id}-overlap-platform-${platform}`} tone="cyan">
                      {platform}
                    </Pill>
                  ))}
                  {group.overlapStores.map((store) => (
                    <Pill key={`${group.id}-overlap-store-${store}`} tone="yellow">
                      {store}
                    </Pill>
                  ))}
                  {group.candidates.map((candidate) => (
                    <Pill
                      key={`${group.id}-${candidate.libraryEntryId}`}
                      tone={candidate.libraryEntryId === group.suggestedPrimaryEntryId ? "cyan" : "neutral"}
                    >
                      {candidate.sourceStore} • {candidate.completionPercent}% • {Math.round(candidate.playtimeMinutes / 60)}h
                    </Pill>
                  ))}
                </div>

                <div className="audit-list">
                  {group.candidates.map((candidate) => (
                    <article className={cx("audit-card", "audit-card--compact", "app-card", "app-card--compact")} key={`${group.id}-candidate-${candidate.libraryEntryId}`}>
                      <div className="audit-card__head">
                        <div className="audit-card__title">
                          {candidate.libraryEntryId === group.suggestedPrimaryEntryId ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <AlertTriangle size={18} />
                          )}
                          <h3>
                            {candidate.sourceStore} • entrada #{candidate.libraryEntryId}
                          </h3>
                        </div>
                        <Pill tone={candidate.favorite ? "yellow" : "neutral"}>
                          {candidate.favorite ? "Favorito" : "Base auxiliar"}
                        </Pill>
                      </div>
                      <p>
                        {candidate.progressStatus} • {candidate.completionPercent}% • {Math.round(candidate.playtimeMinutes / 60)}h •{" "}
                        {candidate.sessionCount} sessão(ões)
                      </p>
                      <div className="detail-note__tags">
                        {candidate.platforms.map((platform) => (
                          <Pill key={`${group.id}-${candidate.libraryEntryId}-platform-${platform}`} tone="neutral">
                            {platform}
                          </Pill>
                        ))}
                        {candidate.stores.map((store) => (
                          <Pill key={`${group.id}-${candidate.libraryEntryId}-store-${store}`} tone="sunset">
                            {store}
                          </Pill>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="modal-actions">
                  <NotchButton
                    variant="primary"
                    onClick={() => onMergeDuplicateGroup(group.suggestedPrimaryEntryId, group.mergeableEntryIds)}
                    disabled={group.mergeableEntryIds.length === 0}
                  >
                    Mesclar grupo
                  </NotchButton>
                  <NotchButton variant="secondary" onClick={() => onOpenGamePage(group.suggestedPrimaryEntryId)}>
                    Abrir principal
                  </NotchButton>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={Sparkles}
          title="Fila de metadado faltante"
          description="Jogos sem capa, gênero, estúdio, publisher, ano ou plataformas completas."
          action={
            <NotchButton variant="secondary" onClick={onEnrichMetadataQueue} disabled={!hasRawgApiKey || report.metadataQueue.length === 0}>
              Enriquecer confiáveis
            </NotchButton>
          }
        />

        <div className="audit-list">
          {report.metadataQueue.length === 0 ? (
            <EmptyState message="Nenhum jogo pendente na fila de metadado." />
          ) : (
            report.metadataQueue.map((item) => (
              <article className="audit-card" key={item.id}>
                <div className="audit-card__head">
                  <div className="audit-card__title">
                    <Sparkles size={18} />
                    <h3>
                      {item.title}
                      {item.releaseYear ? ` (${item.releaseYear})` : ""}
                    </h3>
                  </div>
                  <Pill tone={item.rawgId ? "cyan" : "yellow"}>{item.rawgId ? "RAWG vinculado" : "Sem RAWG"}</Pill>
                </div>

                <p>
                  {item.linkedEntries} entrada(s) ligadas. Campos faltantes: {item.missingFields.join(", ")}.
                </p>

                <div className="detail-note__tags">
                  {item.missingFields.map((field) => (
                    <Pill key={`${item.id}-${field}`} tone="neutral">
                      {field}
                    </Pill>
                  ))}
                </div>

                <div className="modal-actions">
                  <NotchButton
                    variant="primary"
                    onClick={() => onEnrichMetadata(item.gameId)}
                    disabled={!hasRawgApiKey}
                  >
                    Enriquecer via RAWG
                  </NotchButton>
                  <NotchButton variant="secondary" onClick={() => onOpenEditGame(item.representativeEntryId)}>
                    Corrigir manualmente
                  </NotchButton>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={DatabaseZap}
          title="Normalização assistida"
          description="Promove principais, limpa redundâncias e ajuda a alinhar legado com relações estruturadas."
          action={
            <NotchButton
              variant="secondary"
              onClick={onNormalizeQueue}
              disabled={report.normalizationQueue.length === 0}
            >
              Normalizar fila
            </NotchButton>
          }
        />

        <div className="audit-list">
          {report.normalizationQueue.length === 0 ? (
            <EmptyState message="Nenhum item pendente na fila de normalização." />
          ) : (
            report.normalizationQueue.map((item) => (
              <article className="audit-card" key={item.id}>
                <div className="audit-card__head">
                  <div className="audit-card__title">
                    <DatabaseZap size={18} />
                    <h3>{item.title}</h3>
                  </div>
                  <Pill tone="cyan">entrada #{item.libraryEntryId}</Pill>
                </div>
                <p>
                  Plataforma: {item.currentPlatform} → {item.recommendedPlatform}. Store: {item.currentStore} →{" "}
                  {item.recommendedStore}.
                </p>
                <div className="detail-note__tags">
                  {item.platformNames.map((platform) => (
                    <Pill key={`${item.id}-platform-${platform}`} tone="neutral">
                      {platform}
                    </Pill>
                  ))}
                  {item.storeNames.map((store) => (
                    <Pill key={`${item.id}-store-${store}`} tone="sunset">
                      {store}
                    </Pill>
                  ))}
                </div>
                <div className="detail-note__tags">
                  {item.reasons.map((reason) => (
                    <Pill key={`${item.id}-${reason}`} tone="yellow">
                      {reason}
                    </Pill>
                  ))}
                </div>
                <div className="modal-actions">
                  <NotchButton variant="primary" onClick={() => onNormalizeEntry(item.libraryEntryId)}>
                    Promover principal
                  </NotchButton>
                  <NotchButton variant="secondary" onClick={() => onOpenEditGame(item.libraryEntryId)}>
                    Corrigir manualmente
                  </NotchButton>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={GitMerge}
          title="Consolidação de aliases"
          description="Unifica stores e plataformas duplicadas por nome normalizado."
        />

        <div className="audit-list">
          {report.aliasGroups.length === 0 ? (
            <EmptyState message="Nenhum alias estrutural pendente." />
          ) : (
            report.aliasGroups.map((group) => (
              <article className={cx("audit-card", "app-card")} key={group.id}>
                <div className="audit-card__head">
                  <div className="audit-card__title">
                    <GitMerge size={18} />
                    <h3>
                      {group.kind === "store" ? "Store" : "Plataforma"} • {group.canonicalName}
                    </h3>
                  </div>
                  <Pill tone="neutral">{group.aliases.length} alias(es)</Pill>
                </div>
                <p>
                  {group.aliases.join(", ")}. Impacto: {group.affectedEntries} entrada(s) e {group.affectedGames} jogo(s).
                </p>
                <div className="modal-actions">
                  <NotchButton
                    variant="primary"
                    onClick={() => onConsolidateAliasGroup(group.kind, group.normalizedName)}
                  >
                    Consolidar aliases
                  </NotchButton>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={Wrench}
          title="Integridade estrutural"
          description="Progresso x status, horas x sessões, sessões órfãs e demais inconsistências reparáveis."
          action={
            <NotchButton
              variant={report.audit.summary.repairableIssues > 0 ? "primary" : "secondary"}
              onClick={onRepairStructural}
              disabled={report.audit.summary.repairableIssues === 0}
            >
              Reparar estruturais
            </NotchButton>
          }
        />

        <div className="catalog-audit-summary">
          <div className="detail-stat">
            <span>Reparáveis</span>
            <strong>{report.audit.summary.repairableIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Horas divergentes</span>
            <strong>{report.audit.summary.playtimeIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Progresso x status</span>
            <strong>{report.audit.summary.progressIssues}</strong>
          </div>
          <div className="detail-stat">
            <span>Sessões órfãs</span>
            <strong>{report.audit.summary.orphanSessions}</strong>
          </div>
        </div>

        <div className="audit-list">
          {structuralIssues.length === 0 ? (
            <EmptyState message="Nenhuma inconsistência estrutural encontrada." />
          ) : (
            structuralIssues.map((issue) => (
              <article className="audit-card" key={issue.id}>
                <div className="audit-card__head">
                  <div className="audit-card__title">
                    {issue.repairable ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                    <h3>{issue.title}</h3>
                  </div>
                  <Pill tone={issue.tone}>{issue.repairable ? "Reparo automático" : "Revisão manual"}</Pill>
                </div>
                <p>{issue.description}</p>
                {issue.libraryEntryId ? (
                  <div className="modal-actions">
                    <NotchButton variant="secondary" onClick={() => onOpenGamePage(issue.libraryEntryId!)}>
                      Abrir item
                    </NotchButton>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        {orphanIssues.length > 0 ? (
          <div className="detail-note">
            <strong>Sessões órfãs:</strong> o reparo estrutural remove automaticamente essas linhas porque elas não têm mais item
            correspondente na biblioteca.
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
