import type { BarPoint, LinePoint, PiePoint } from "../../../backlog/shared";

export const backlogByDuration: BarPoint[] = [
  { name: "Até 10h", total: 0 },
  { name: "10-25h", total: 0 },
  { name: "25-50h", total: 0 },
  { name: "50h+", total: 0 },
];

export const platformDistribution: PiePoint[] = [];

export const yearlyEvolution: LinePoint[] = [
  { month: "Jan", finished: 0, started: 0 },
  { month: "Fev", finished: 0, started: 0 },
  { month: "Mar", finished: 0, started: 0 },
  { month: "Abr", finished: 0, started: 0 },
  { month: "Mai", finished: 0, started: 0 },
  { month: "Jun", finished: 0, started: 0 },
  { month: "Jul", finished: 0, started: 0 },
  { month: "Ago", finished: 0, started: 0 },
  { month: "Set", finished: 0, started: 0 },
  { month: "Out", finished: 0, started: 0 },
  { month: "Nov", finished: 0, started: 0 },
  { month: "Dez", finished: 0, started: 0 },
];
