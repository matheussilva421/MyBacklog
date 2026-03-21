import type { CSSProperties } from "react";
import { ArrowLeft, BarChart3, Clock3, Coins, Database, Target, Trophy } from "lucide-react";
import { formatDuration, type Game, type Platform } from "../../../backlog/shared";
import { getGamePlatforms, getGameStores } from "../../../backlog/structuredGameValues";
import { EmptyState, NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";

type PlatformDashboardProps = {
  platform: Platform | string;
  games: Game[];
  onBack: () => void;
};

export function PlatformDashboard({ platform, games, onBack }: PlatformDashboardProps) {
  const platformName = typeof platform === "string" ? platform : platform.name;
  const platformMeta = typeof platform === "string" ? null : platform;

  const platformGames = games.filter((game) => getGamePlatforms(game).includes(platformName));
  const totalGames = platformGames.length;
  const finishedGames = platformGames.filter((game) => game.status === "Terminado").length;
  const wishlistGames = platformGames.filter((game) => game.status === "Wishlist").length;
  const activeGames = Math.max(totalGames - wishlistGames, 0);
  const completionRate = activeGames > 0 ? Math.round((finishedGames / activeGames) * 100) : 0;
  const totalMinutes = platformGames.reduce((acc, game) => acc + game.hours * 60, 0);
  const totalSpent = platformGames.reduce((acc, game) => acc + (game.pricePaid || 0), 0);
  const totalTarget = platformGames.reduce((acc, game) => acc + (game.targetPrice || 0), 0);
  const currency = platformGames.find((game) => game.currency)?.currency || "R$";
  const accentColor = platformMeta?.hexColor || "var(--accent)";
  const investmentGames = platformGames.filter((game) => (game.pricePaid || 0) > 0).length;

  return (
    <div className="platform-dashboard anim-fade-in">
      <div className="platform-dashboard__header">
        <NotchButton variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} />
        </NotchButton>
        <div className="platform-dashboard__title-block">
          <h2
            className="glitch-text platform-dashboard__title"
            data-text={platformName}
            style={{ "--platform-accent": accentColor } as CSSProperties}
          >
            {platformName}
          </h2>
          {platformMeta?.brand && (
            <span className="platform-dashboard__eyebrow">
              {platformMeta.brand} {platformMeta.generation ? `• Geração ${platformMeta.generation}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid--top">
        <Panel className="stat-card">
          <SectionHeader icon={Database} title="Acervo" description="Volume total de jogos" />
          <div className="stat-card__value">{totalGames}</div>
          <div className="stat-card__label">jogos registrados</div>
        </Panel>

        <Panel className="stat-card">
          <SectionHeader icon={Trophy} title="Conclusão" description="Taxa de finalização" />
          <div className="stat-card__value">{completionRate}%</div>
          <div className="stat-card__label">
            {activeGames > 0
              ? `${finishedGames} terminados de ${activeGames} ativos`
              : "Sem jogos ativos fora da wishlist"}
          </div>
        </Panel>

        <Panel className="stat-card">
          <SectionHeader icon={Clock3} title="Tempo Total" description="Investimento de vida" />
          <div className="stat-card__value">{Math.round(totalMinutes / 60)}h</div>
          <div className="stat-card__label">{formatDuration(totalMinutes)} total</div>
        </Panel>
      </div>

      <div className="dashboard-grid platform-dashboard__summary-grid">
        <Panel className="stat-card stat-card--accent">
          <SectionHeader icon={Coins} title="Investimento" description="Valor total pago" />
          <div className="stat-card__value">
            {currency} {totalSpent.toFixed(2)}
          </div>
          <div className="stat-card__label">em {investmentGames} jogos</div>
        </Panel>

        <Panel className="stat-card stat-card--dim">
          <SectionHeader icon={Target} title="Wishlist" description="Custo projetado de desejos" />
          <div className="stat-card__value">
            {currency} {totalTarget.toFixed(2)}
          </div>
          <div className="stat-card__label">para {wishlistGames} jogos desejados</div>
        </Panel>
      </div>

      <div className="platform-dashboard__games">
        <Panel>
          <SectionHeader icon={BarChart3} title="Jogos na Plataforma" description="Lista resumida de entradas" />
          {platformGames.length === 0 ? (
            <EmptyState message={`Nenhum jogo foi associado a ${platformName} ainda.`} />
          ) : (
            <div className="preview-list preview-list--platform">
              {platformGames.map((game) => (
                <div key={game.id} className="preview-card preview-card--platform">
                  <div className="preview-card__head preview-card__head--compact">
                    <div>
                      <strong>{game.title}</strong>
                      <div className="platform-dashboard__game-meta">
                        {game.genre} • {getGameStores(game).join(", ")}
                      </div>
                    </div>
                    <Pill
                      tone={game.status === "Terminado" ? "emerald" : game.status === "Jogando" ? "cyan" : "neutral"}
                    >
                      {game.status}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
