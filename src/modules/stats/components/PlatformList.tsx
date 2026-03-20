import { Monitor, ChevronRight } from "lucide-react";
import type { Game, Platform } from "../../../backlog/shared";
import { Panel, SectionHeader, Pill } from "../../../components/cyberpunk-ui";

type PlatformListProps = {
  platforms: Platform[];
  games: Game[];
  onSelect: (platform: Platform) => void;
};

export function PlatformList({ platforms, games, onSelect }: PlatformListProps) {
  return (
    <Panel className="platform-list-panel anim-fade-in">
      <SectionHeader 
        icon={Monitor} 
        title="Minhas Plataformas" 
        description="Gerencie e visualize dados por hardware" 
      />
      
      <div className="platform-grid-legacy" style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
        gap: "1rem",
        marginTop: "1rem" 
      }}>
        {platforms.map(platform => {
          const platformGames = games.filter(g => g.platform === platform.name);
          const finishedCount = platformGames.filter(g => g.status === "Terminado").length;
          const playingCount = platformGames.filter(g => g.status === "Jogando").length;
          
          return (
            <div 
              key={platform.id || platform.name} 
              className="platform-card-interactive"
              onClick={() => onSelect(platform)}
              style={{
                border: "1px solid var(--border-color)",
                padding: "1rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
                background: "rgba(255,255,255,0.02)"
              }}
            >
              {platform.hexColor && (
                <div style={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  width: "4px", 
                  bottom: 0, 
                  background: platform.hexColor 
                }} />
              )}
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{platform.name}</h3>
                  <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", textTransform: "uppercase" }}>
                    {platform.brand || "Desconhecido"} {platform.generation ? `• G${platform.generation}` : ""}
                  </span>
                </div>
                <ChevronRight size={18} className="arrow-icon" />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <Pill tone="neutral">{platformGames.length} jogos</Pill>
                {playingCount > 0 && <Pill tone="cyan">{playingCount} jogando</Pill>}
                {finishedCount > 0 && <Pill tone="emerald">{finishedCount} zerados</Pill>}
              </div>

              <style>{`
                .platform-card-interactive:hover {
                  background: rgba(255,255,255,0.05) !important;
                  border-color: var(--accent) !important;
                  transform: translateY(-2px);
                }
                .platform-card-interactive:hover .arrow-icon {
                  color: var(--accent);
                  transform: translateX(4px);
                }
              `}</style>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
