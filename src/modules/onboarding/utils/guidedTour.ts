import type { ScreenKey } from "../../../backlog/shared";

export type GuidedTourTarget =
  | "dashboard"
  | "quick-actions"
  | "library"
  | "maintenance"
  | "sessions"
  | "planner"
  | "stats"
  | "profile";

export type GuidedTourStep = {
  id: string;
  screen: Exclude<ScreenKey, "game">;
  target: GuidedTourTarget;
  title: string;
  description: string;
  bullets: string[];
};

export const guidedTourSteps: GuidedTourStep[] = [
  {
    id: "dashboard-overview",
    screen: "dashboard",
    target: "dashboard",
    title: "Painel central do operador",
    description: "A Dashboard resume ritmo, backlog, horas, prioridades e conquistas em uma leitura só.",
    bullets: [
      "Use este painel para entender rapidamente o estado geral da sua biblioteca.",
      "Os cards, badges e o recap mensal reagem aos dados reais das sessões e do catálogo.",
    ],
  },
  {
    id: "quick-actions",
    screen: "dashboard",
    target: "quick-actions",
    title: "Ações rápidas",
    description: "Este bloco acelera o uso diário sem exigir navegação extra.",
    bullets: [
      "Crie um jogo, importe biblioteca, restaure backup ou registre sessão a partir daqui.",
      "É o melhor ponto de entrada para operações rápidas do dia a dia.",
    ],
  },
  {
    id: "library",
    screen: "library",
    target: "library",
    title: "Biblioteca e ficha do jogo",
    description: "Aqui você filtra o catálogo, escolhe o que está ativo e abre a página dedicada de cada jogo.",
    bullets: [
      "A biblioteca separa metadado do jogo da sua relação pessoal com ele.",
      "Ao abrir um item, você acessa review, tags, listas, sessões e ações rápidas da ficha dedicada.",
    ],
  },
  {
    id: "maintenance",
    screen: "maintenance",
    target: "maintenance",
    title: "Manutenção do catálogo",
    description: "Este módulo audita duplicados, metadado faltante, sessões órfãs e inconsistências estruturais.",
    bullets: [
      "Você pode mesclar duplicados sem perder histórico.",
      "A fila de metadado faltante ajuda a manter o catálogo forte e pronto para planner, badges e estatísticas.",
    ],
  },
  {
    id: "sessions",
    screen: "sessions",
    target: "sessions",
    title: "Sessões e telemetria",
    description: "As sessões alimentam progresso, horas, recap mensal, planner e conquistas pessoais.",
    bullets: [
      "Registre, edite e exclua sessões com filtros por período, plataforma e status.",
      "Quando o uso é consistente, o resto do app fica mais inteligente.",
    ],
  },
  {
    id: "planner",
    screen: "planner",
    target: "planner",
    title: "Planner tático",
    description: "O planner monta sua fila com base em atrito, progresso, metas, prioridade manual e cadência recente.",
    bullets: [
      "Use esta tela para decidir o que vale jogar agora e por quê.",
      "As metas persistidas influenciam o ranking e ajudam a limpar backlog com menos ruído.",
    ],
  },
  {
    id: "stats",
    screen: "stats",
    target: "stats",
    title: "Estatísticas operacionais",
    description:
      "A área de estatísticas mostra distribuição do catálogo e comportamento das sessões ao longo do tempo.",
    bullets: [
      "É a tela para enxergar gargalos, plataformas mais usadas e padrões de duração.",
      "Ela ajuda a transformar sensação em leitura objetiva da sua rotina de jogo.",
    ],
  },
  {
    id: "profile",
    screen: "profile",
    target: "profile",
    title: "Perfil e preferências",
    description: "No Perfil você mantém listas, ajustes do operador, chave RAWG e reabre este guia quando quiser.",
    bullets: [
      "As preferências afetam criação, importação e comportamento do planner.",
      "Se precisar revisar o funcionamento do app, o tutorial pode ser aberto novamente daqui.",
    ],
  },
];
