import { useMemo } from "react";
import { ChevronRight, Monitor } from "lucide-react";
import type { Game, Platform } from "../../../backlog/shared";
import { getGamePlatforms } from "../../../backlog/structuredGameValues";
import { Panel, Pill, SectionHeader } from "../../../components/cyberpunk-ui";

type PlatformListProps = {
  platforms: Platform[];
  games: Game[];
  onSelect: (platform: Platform | string) => void;
};

type PlatformSummary = {
  totalGames: number;
  finishedCount: number;
  playingCount: number;
};

export function PlatformList({ platforms, games, onSelect }: PlatformListProps) {
  const summaryByPlatform = useMemo(() => {
    const map = new Map<string, PlatformSummary>();

    for (const game of games) {
      for (const platformName of getGamePlatforms(game)) {
        const current = map.get(platformName) ?? {
          totalGames: 0,
          finishedCount: 0,
          playingCount: 0,
        };

        current.totalGames += 1;
        if (game.status === "Terminado") current.finishedCount += 1;
        if (game.status === "Jogando") current.playingCount += 1;
        map.set(platformName, current);
      }
    }

    return map;
  }, [games]);

  const visiblePlatforms = useMemo(
    () =>
      Array.from(
        new Map(
          [...platforms, ...Array.from(summaryByPlatform.keys()).map((name) => ({ name } as Platform))].map(
            (platform) => [platform.name, platform] as const,
          ),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [platforms, summaryByPlatform],
  );

  return (
    <Panel className="platform-list-panel anim-fade-in">
      <SectionHeader
        icon={Monitor}
        title="Minhas Plataformas"
        description="Gerencie e visualize dados por hardware"
      />

      <div className="platform-grid-legacy">
        {visiblePlatforms.map((platform) => {
          const summary = summaryByPlatform.get(platform.name) ?? {
            totalGames: 0,
            finishedCount: 0,
            playingCount: 0,
          };

          return (
            <button
              type="button"
              key={platform.id || platform.name}
              className="platform-card-interactive"
              onClick={() => onSelect(platform.id != null ? platform : platform.name)}
            >
              {platform.hexColor ? (
                <span
                  className="platform-card-interactive__accent"
                  style={{ background: platform.hexColor }}
                  aria-hidden="true"
                />
              ) : null}

              <div className="platform-card-interactive__head">
                <div>
                  <h3>{platform.name}</h3>
                  <span className="platform-card-interactive__meta">
                    {platform.brand || "Desconhecido"}
                    {platform.generation ? ` • G${platform.generation}` : ""}
                  </span>
                </div>
                <ChevronRight size={18} className="platform-card-interactive__arrow" />
              </div>

              <div className="platform-card-interactive__pills">
                <Pill tone="neutral">{summary.totalGames} jogos</Pill>
                {summary.playingCount > 0 ? <Pill tone="cyan">{summary.playingCount} jogando</Pill> : null}
                {summary.finishedCount > 0 ? <Pill tone="emerald">{summary.finishedCount} zerados</Pill> : null}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
