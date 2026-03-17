import { Cpu, Zap, Library, Radar, type LucideIcon } from "lucide-react";
import { type Achievement } from "../../../backlog/shared";

export const profileAchievements: Achievement[] = [
  { icon: Cpu, title: "Hardware Junkie", description: "Cadastrou mais de 5 plataformas diferentes.", tone: "cyan" },
  { icon: Zap, title: "Speedrunner", description: "Terminou um jogo com menos de 5h.", tone: "magenta" },
  { icon: Library, title: "Bibliotecário", description: "Alcançou a marca de 50 jogos no catálogo.", tone: "emerald" },
  { icon: Radar, title: "Estrategista", description: "Limpou 3 itens da fila prioritária do Planner.", tone: "yellow" },
];
