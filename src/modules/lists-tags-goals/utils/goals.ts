import type { GoalType, Period } from "../../../core/types";

export type Goal = {
  type: GoalType;
  period: Period;
  label: string;
  value: number;
  tone: "cyan" | "magenta" | "yellow" | "green";
};

export type Rule = {
  text: string;
  tone: "cyan" | "magenta" | "yellow" | "neutral";
};

export const systemRules: Rule[] = [
  { text: "Jogos em andamento recebem boost de 28pts.", tone: "cyan" },
  { text: "Pausados tem prioridade maxima de retorno.", tone: "magenta" },
  { text: "ETA curto (<12h) prioriza limpeza de fila.", tone: "yellow" },
  { text: "Notas altas e favoritos sobem no ranking.", tone: "neutral" },
];
