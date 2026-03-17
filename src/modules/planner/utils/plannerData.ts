import type { Goal, PlannerEntry, Rule } from "../../../backlog/shared";

export const plannerQueue: PlannerEntry[] = [];

export const tacticalGoals: Goal[] = [
  { label: "Finalizar 1 jogo curto", value: 70, tone: "sunset" },
  { label: "Registrar 5 sessões", value: 80, tone: "violet" },
  { label: "Reduzir backlog em 2 jogos", value: 40, tone: "yellow" },
];

export const systemRules: Rule[] = [
  { text: "+ Jogos curtos recebem bônus para limpar backlog mais rápido.", tone: "cyan" },
  { text: "+ Jogos já iniciados sobem na fila por terem menor atrito de retorno.", tone: "yellow" },
  { text: "+ Jogos longos entram quando houver espaço mental e janela de tempo real.", tone: "magenta" },
];
