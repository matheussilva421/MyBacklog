import { parseEtaHours } from "../../../backlog/shared";
import type { Game } from "../../../backlog/shared";

export function computePlannerScore(game: Game): number {
  let score = 0;
  const etaHours = parseEtaHours(game.eta);
  if (game.status === "Pausado") score += 36;
  if (game.status === "Jogando") score += 28;
  if (game.status === "Backlog") score += 12;
  if (game.priority === "Alta") score += 26;
  if (game.priority === "Média") score += 14;
  if (game.progress > 0) score += Math.min(22, Math.round(game.progress / 4));
  if (etaHours <= 5) score += 18;
  else if (etaHours <= 12) score += 14;
  else if (etaHours <= 25) score += 8;
  else if (etaHours <= 50) score += 2;
  else score -= 8;
  if (game.mood.toLowerCase().includes("cozy")) score += 4;
  if (game.mood.toLowerCase().includes("energia")) score += 6;
  if (game.status === "Wishlist") score = -999;
  if (game.status === "Terminado") score = -999;
  return score;
}

export function buildPlannerReason(game: Game): string {
  const reasons: string[] = [];
  const etaHours = parseEtaHours(game.eta);
  if (game.progress > 0) reasons.push("Já existe progresso e o atrito de retorno é baixo.");
  if (etaHours <= 12) reasons.push("Cabe em bloco curto e ajuda a limpar backlog rápido.");
  if (game.priority === "Alta") reasons.push("Prioridade manual alta mantém o jogo no topo.");
  if (reasons.length === 0) reasons.push("Bom encaixe para manter o backlog em movimento.");
  return reasons.join(" ");
}

export function buildPlannerFit(game: Game): string {
  const etaHours = parseEtaHours(game.eta);
  if (etaHours <= 3) return "Fim de semana curto";
  if (etaHours <= 12) return "Bloco médio";
  if (game.status === "Pausado") return "Retorno imediato";
  if (game.mood.toLowerCase().includes("energia")) return "Noites com energia";
  return "Sessões longas";
}
