import type { ScreenKey } from "../../../backlog/shared";

export const screenMeta: Record<ScreenKey, { before: string; accent: string }> = {
  dashboard: { before: "Visão", accent: "Geral" },
  library: { before: "Catálogo", accent: "Tático" },
  planner: { before: "Fila de", accent: "Execução" },
  stats: { before: "Telemetria", accent: "Pessoal" },
  profile: { before: "Camada de", accent: "Perfil" },
  game: { before: "Ficha do", accent: "Jogo" },
};
