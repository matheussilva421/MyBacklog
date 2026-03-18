import type { Game } from "../../../backlog/shared";
import { parseEtaHours } from "../../../core/utils";
import type { PlannerPreference } from "../../settings/utils/preferences";
import type { PlannerGoalSignals } from "./goals";

export type PlannerPreferenceContext = {
  plannerPreference: PlannerPreference;
  primaryPlatforms: string[];
  defaultStores: string[];
};

function normalizeTokens(values: string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function getPreferenceBoost(game: Game, preferences?: PlannerPreferenceContext): number {
  if (!preferences) return 0;

  let boost = 0;
  const preferredPlatforms = normalizeTokens(preferences.primaryPlatforms);
  const preferredStores = normalizeTokens(preferences.defaultStores);
  if (preferredPlatforms.has(game.platform.toLowerCase())) boost += 8;
  if (preferredStores.has(game.sourceStore.toLowerCase())) boost += 5;

  switch (preferences.plannerPreference) {
    case "clear_backlog":
      if (game.status === "Backlog") boost += 10;
      if (game.progress > 0) boost += 6;
      break;
    case "finish_active":
      if (game.status === "Jogando" || game.status === "Pausado") boost += 14;
      if (game.progress > 25) boost += 8;
      break;
    case "maximize_playtime":
      if (game.status === "Jogando") boost += 12;
      if (game.status === "Pausado") boost += 6;
      if (game.progress > 0) boost += 4;
      break;
    case "balanced":
    default:
      break;
  }

  return boost;
}

export function computePlannerScore(
  game: Game,
  goalSignals?: PlannerGoalSignals,
  preferences?: PlannerPreferenceContext,
): number {
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

  if (goalSignals) {
    if (goalSignals.finishPressure > 0) {
      if (game.progress > 0) score += Math.round(18 * goalSignals.finishPressure);
      if (game.status === "Jogando" || game.status === "Pausado") score += Math.round(12 * goalSignals.finishPressure);
      if (etaHours <= 12) score += Math.round(10 * goalSignals.finishPressure);
    }

    if (goalSignals.startPressure > 0) {
      if (game.status === "Backlog" && game.progress === 0) score += Math.round(18 * goalSignals.startPressure);
      if (etaHours <= 25) score += Math.round(8 * goalSignals.startPressure);
    }

    if (goalSignals.playtimePressure > 0) {
      if (game.status === "Jogando") score += Math.round(14 * goalSignals.playtimePressure);
      if (game.status === "Pausado") score += Math.round(10 * goalSignals.playtimePressure);
      if (game.progress > 10) score += Math.round(8 * goalSignals.playtimePressure);
    }

    if (goalSignals.backlogPressure > 0) {
      if (game.status !== "Wishlist" && game.status !== "Terminado") score += Math.round(8 * goalSignals.backlogPressure);
      if (game.progress > 0) score += Math.round(10 * goalSignals.backlogPressure);
      if (etaHours <= 25) score += Math.round(6 * goalSignals.backlogPressure);
      if (game.status === "Backlog" && game.progress === 0 && etaHours > 30) {
        score -= Math.round(8 * goalSignals.backlogPressure);
      }
    }
  }

  score += getPreferenceBoost(game, preferences);

  if (game.status === "Wishlist") score = -999;
  if (game.status === "Terminado") score = -999;
  return score;
}

export function buildPlannerReason(
  game: Game,
  goalSignals?: PlannerGoalSignals,
  preferences?: PlannerPreferenceContext,
): string {
  const reasons: string[] = [];
  const etaHours = parseEtaHours(game.eta);

  if (goalSignals?.finishPressure && goalSignals.finishPressure >= 0.35 && game.progress > 0) {
    reasons.push("Empurra a meta de conclusão com progresso já acumulado.");
  }
  if (goalSignals?.startPressure && goalSignals.startPressure >= 0.35 && game.status === "Backlog" && game.progress === 0) {
    reasons.push("Ajuda a meta de iniciar jogos sem abrir um projeto longo demais.");
  }
  if (goalSignals?.playtimePressure && goalSignals.playtimePressure >= 0.35 && (game.status === "Jogando" || game.status === "Pausado")) {
    reasons.push("Contribui direto para a meta de horas com baixo atrito.");
  }
  if (goalSignals?.backlogPressure && goalSignals.backlogPressure >= 0.35 && game.status !== "Wishlist" && game.status !== "Terminado") {
    reasons.push("Reduz backlog parado ao transformar fila em avanço real.");
  }
  if (preferences && normalizeTokens(preferences.primaryPlatforms).has(game.platform.toLowerCase())) {
    reasons.push("Roda na sua plataforma principal, com baixo atrito operacional.");
  }
  if (preferences && normalizeTokens(preferences.defaultStores).has(game.sourceStore.toLowerCase())) {
    reasons.push("Está dentro das suas fontes padrão e entra fácil no fluxo atual.");
  }
  if (game.progress > 0) reasons.push("Já existe progresso e o atrito de retorno é baixo.");
  if (etaHours <= 12) reasons.push("Cabe em bloco curto e ajuda a limpar backlog rápido.");
  if (game.priority === "Alta") reasons.push("Prioridade manual alta mantém o jogo no topo.");
  if (reasons.length === 0) reasons.push("Bom encaixe para manter o backlog em movimento.");

  return reasons.join(" ");
}

export function buildPlannerFit(
  game: Game,
  goalSignals?: PlannerGoalSignals,
  preferences?: PlannerPreferenceContext,
): string {
  const etaHours = parseEtaHours(game.eta);

  if (goalSignals?.finishPressure && goalSignals.finishPressure >= 0.35 && game.progress > 0) {
    return "Fechamento tático";
  }
  if (goalSignals?.startPressure && goalSignals.startPressure >= 0.35 && game.status === "Backlog" && game.progress === 0) {
    return "Meta de início";
  }
  if (goalSignals?.playtimePressure && goalSignals.playtimePressure >= 0.35 && game.status !== "Backlog") {
    return "Sessão útil";
  }
  if (preferences?.plannerPreference === "finish_active" && (game.status === "Jogando" || game.status === "Pausado")) {
    return "Fechar ativos";
  }
  if (preferences?.plannerPreference === "clear_backlog" && game.status === "Backlog") {
    return "Limpeza de backlog";
  }
  if (etaHours <= 3) return "Fim de semana curto";
  if (etaHours <= 12) return "Bloco médio";
  if (game.status === "Pausado") return "Retorno imediato";
  if (game.mood.toLowerCase().includes("energia")) return "Noites com energia";
  return "Sessões longas";
}
