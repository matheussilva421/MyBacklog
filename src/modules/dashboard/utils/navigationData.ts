import type { ScreenKey } from "../../../backlog/shared";

export const screenMeta: Record<ScreenKey, { before: string; accent: string }> = {
  dashboard: { before: "Visao", accent: "Geral" },
  library: { before: "Catalogo", accent: "Tatico" },
  sessions: { before: "Diario de", accent: "Sessoes" },
  planner: { before: "Fila de", accent: "Execucao" },
  stats: { before: "Telemetria", accent: "Pessoal" },
  profile: { before: "Camada de", accent: "Perfil" },
  game: { before: "Ficha do", accent: "Jogo" },
};
