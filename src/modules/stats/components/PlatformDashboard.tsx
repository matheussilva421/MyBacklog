import { ArrowLeft, BarChart3, Clock3, Coins, Database, Target, Trophy } from "lucide-react";
import { formatDuration, type Game } from "../../../backlog/shared";
import { NotchButton, Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";

type PlatformDashboardProps = {
  platform: string;
  games: Game[];
  onBack: () => void;
};

export function PlatformDashboard({ platform, games, onBack }: PlatformDashboardProps) {
  const platformGames = games.filter(g => g.platform === platform);
  
  const totalGames = platformGames.length;
  const finishedGames = platformGames.filter(g => g.status === "Terminado").length;
  const wishlistGames = platformGames.filter(g => g.status === "Wishlist").length;
  const completionRate = totalGames > 0 ? Math.round((finishedGames / (totalGames - wishlistGames)) * 100) : 0;
  
  const totalMinutes = platformGames.reduce((acc, g) => acc + (g.hours * 60), 0);
  const totalSpent = platformGames.reduce((acc, g) => acc + (g.pricePaid || 0), 0);
  const totalTarget = platformGames.reduce((acc, g) => acc + (g.targetPrice || 0), 0);
  
  const currency = platformGames.find(g => g.currency)?.currency || "R$";

  return (
    <div className="platform-dashboard anim-fade-in">
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <NotchButton variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} />
        </NotchButton>
        <h2 className="glitch-text" data-text={platform}>{platform}</h2>
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
          <div className="stat-card__label">{finishedGames} terminados de {totalGames - wishlistGames} ativos</div>
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
          <div className="stat-card__label">em {platformGames.filter(g => (g.pricePaid || 0) > 0).length} jogos</div>
        </Panel>

        <Panel className="stat-card stat-card--dim">
          <SectionHeader icon={Target} title="Wishlist" description="Custo projetado de desejos" />
          <div className="stat-card__value">{currency} {totalTarget.toFixed(2)}</div>
          <div className="stat-card__label">para {wishlistGames} jogos desejados</div>
        </Panel>
      </div>

      <Panel style={{ marginTop: "1rem" }}>
        <SectionHeader icon={BarChart3} title="Jogos na Plataforma" description="Lista resumida de entradas" />
        <div className="preview-list" style={{ maxHeight: "40vh", overflowY: "auto" }}>
          {platformGames.map(game => (
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
  );
}
