import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  GitMerge,
  Sparkles,
  Wrench,
} from "lucide-react";
import { EmptyState, NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";
import type { CatalogMaintenanceReport } from "../utils/catalogMaintenance";

type CatalogMaintenanceScreenProps = {
  report: CatalogMaintenanceReport;
  hasRawgApiKey: boolean;
  onRepairStructural: () => Promise<void>;
  onMergeDuplicateGroup: (primaryEntryId: number, mergedEntryIds: number[]) => Promise<void>;
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
              <article className="audit-card" key={group.id}>
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
                    <article className="audit-card audit-card--compact" key={`${group.id}-candidate-${candidate.libraryEntryId}`}>
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
