import { type PlannerEntry, type Goal, type Rule } from "../../../backlog/shared";

export const plannerQueue: PlannerEntry[] = [];

export const tacticalGoals: Goal[] = [
  { label: "Limpar Backlog", value: 45, tone: "sunset" },
  { label: "Sessões Ativas", value: 12, tone: "violet" },
  { label: "Focus Master", value: 88, tone: "yellow" },
];

export const systemRules: Rule[] = [
  { text: "Prioridade máxima para Cyberpunk e RPGs táticos.", tone: "magenta" },
  { text: "Sessões mínimas de 30min para registro válido.", tone: "cyan" },
  { text: "Terminar antes de iniciar novo épico (>40h).", tone: "yellow" },
];
