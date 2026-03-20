import { ArrowLeft, BarChart3, Clock3, Coins, Database, Target, Trophy } from "lucide-react";
import { formatDuration, type Game, type Platform } from "../../../backlog/shared";
import { NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";

type PlatformDashboardProps = {
  platform: Platform | string;
  games: Game[];
  onBack: () => void;
};

export function PlatformDashboard({ platform, games, onBack }: PlatformDashboardProps) {
  const platformName = typeof platform === "string" ? platform : platform.name;
  const platformMeta = typeof platform === "string" ? null : platform;

  const platformGames = games.filter((game) => game.platform === platformName);
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
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <NotchButton variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} />
        </NotchButton>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 className="glitch-text" data-text={platformName} style={{ marginBottom: 0, color: accentColor }}>
            {platformName}
          </h2>
          {platformMeta?.brand && (
            <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
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
            {activeGames > 0 ? `${finishedGames} terminados de ${activeGames} ativos` : "Sem jogos ativos fora da wishlist"}
          </div>
        </Panel>

        <Panel className="stat-card">
          <SectionHeader icon={Clock3} title="Tempo Total" description="Investimento de vida" />
          <div className="stat-card__value">{Math.round(totalMinutes / 60)}h</div>
          <div className="stat-card__label">{formatDuration(totalMinutes)} total</div>
        </Panel>
      </div>

      <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
        <Panel className="stat-card stat-card--accent">
          <SectionHeader icon={Coins} title="Investimento" description="Valor total pago" />
          <div className="stat-card__value">{currency} {totalSpent.toFixed(2)}</div>
          <div className="stat-card__label">em {investmentGames} jogos</div>
        </Panel>

        <Panel className="stat-card stat-card--dim">
          <SectionHeader icon={Target} title="Wishlist" description="Custo projetado de desejos" />
          <div className="stat-card__value">{currency} {totalTarget.toFixed(2)}</div>
          <div className="stat-card__label">para {wishlistGames} jogos desejados</div>
        </Panel>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Panel>
          <SectionHeader icon={BarChart3} title="Jogos na Plataforma" description="Lista resumida de entradas" />
          <div className="preview-list" style={{ maxHeight: "40vh", overflowY: "auto" }}>
            {platformGames.map((game) => (
              <div key={game.id} className="preview-card" style={{ padding: "0.75rem" }}>
                <div className="preview-card__head" style={{ marginBottom: 0 }}>
                  <div>
                    <strong>{game.title}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>{game.genre}</div>
                  </div>
                  <Pill tone={game.status === "Terminado" ? "emerald" : game.status === "Jogando" ? "cyan" : "neutral"}>
                    {game.status}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
