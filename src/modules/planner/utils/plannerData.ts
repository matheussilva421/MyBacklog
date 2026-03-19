import type { Game, Goal, Rule } from "../../../backlog/shared";
import { parseEtaHours } from "../../../core/utils";
import type { PlaySession } from "../../../core/types";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildDynamicTacticalGoals(
  games: Game[],
  sessionRows: PlaySession[],
  now = new Date(),
): Goal[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. "Finalizar jogo curto" — progresso médio dos jogos curtos ativos
  const shortActiveGames = games.filter((game) => {
    if (game.status !== "Jogando" && game.status !== "Pausado") return false;
    return parseEtaHours(game.eta) <= 12;
  });
  const shortGameProgress =
    shortActiveGames.length > 0
      ? shortActiveGames.reduce((sum, game) => sum + game.progress, 0) / shortActiveGames.length
      : 0;

  // 2. "Sessões este mês" — sessões registradas no mês atual vs meta de 5
  const sessionsThisMonth = sessionRows.filter((session) => {
    const parts = session.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return false;
    const sessionDate = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return sessionDate >= monthStart;
  });
  const sessionTarget = 5;
  const sessionProgress = clamp((sessionsThisMonth.length / sessionTarget) * 100);

  // 3. "Redução de backlog" — jogos que saíram do backlog puro (progresso > 0 ou concluídos) vs total owned
  const ownedGames = games.filter(
    (game) => game.status !== "Wishlist",
  );
  const advancedGames = ownedGames.filter(
    (game) => game.status === "Terminado" || game.progress > 0,
  );
  const backlogProgress =
    ownedGames.length > 0
      ? clamp((advancedGames.length / ownedGames.length) * 100)
      : 0;

  return [
    {
      label: shortActiveGames.length > 0
        ? `Fechar ${shortActiveGames.length} jogo${shortActiveGames.length > 1 ? "s" : ""} curto${shortActiveGames.length > 1 ? "s" : ""}`
        : "Iniciar 1 jogo curto",
      value: Math.round(shortGameProgress),
      tone: "sunset",
    },
    {
      label: `Sessões em ${now.toLocaleString("pt-BR", { month: "short" }).replace(".", "")}`,
      value: sessionProgress,
      tone: "violet",
    },
    {
      label: "Redução de backlog",
      value: backlogProgress,
      tone: "yellow",
    },
  ];
}

export const systemRules: Rule[] = [
  { text: "+ Jogos curtos recebem bônus para limpar backlog mais rápido.", tone: "cyan" },
  { text: "+ Jogos já iniciados sobem na fila por terem menor atrito de retorno.", tone: "yellow" },
  { text: "+ Jogos longos entram quando houver espaço mental e janela de tempo real.", tone: "magenta" },
];
