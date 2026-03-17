import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Trophy,
  Gamepad2,
  Clock3,
  ListTodo,
  Star,
  Monitor,
  Sparkles,
  Flame,
  CalendarDays,
  ChevronRight,
  Zap,
  Radar,
  Cpu,
  Orbit,
  Activity,
  Swords,
  LayoutDashboard,
  Library,
  Route,
  BarChart3,
  User,
  Filter,
  Download,
  Plus,
  ArrowUpRight,
  Binary,
  Target,
  ScanLine,
  FolderKanban,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Heart,
  PanelsTopLeft,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

type Status = "Backlog" | "Jogando" | "Terminado" | "Pausado" | "Wishlist";

type Game = {
  id: number;
  title: string;
  platform: string;
  genre: string;
  status: Status;
  progress: number;
  hours: number;
  eta: string;
  priority: "Alta" | "Média" | "Baixa";
  mood: string;
  score: number;
  owned: boolean;
  year: number;
  notes: string;
  difficulty: string;
};

const libraryGames: Game[] = [
  {
    id: 1,
    title: "Cyberpunk 2077",
    platform: "PC",
    genre: "RPG / Open World",
    status: "Jogando",
    progress: 62,
    hours: 48,
    eta: "14h",
    priority: "Alta",
    mood: "Imersivo",
    score: 9.4,
    owned: true,
    year: 2020,
    notes: "Main story forte, side quests premium.",
    difficulty: "Média",
  },
  {
    id: 2,
    title: "Alan Wake 2",
    platform: "PS5",
    genre: "Survival Horror",
    status: "Jogando",
    progress: 41,
    hours: 16,
    eta: "9h",
    priority: "Alta",
    mood: "Narrativo",
    score: 9.2,
    owned: true,
    year: 2023,
    notes: "Atmosfera absurdamente boa.",
    difficulty: "Média",
  },
  {
    id: 3,
    title: "Sea of Stars",
    platform: "Switch",
    genre: "JRPG",
    status: "Jogando",
    progress: 37,
    hours: 21,
    eta: "16h",
    priority: "Média",
    mood: "Relax",
    score: 8.8,
    owned: true,
    year: 2023,
    notes: "Ótimo para sessões mais tranquilas.",
    difficulty: "Baixa",
  },
  {
    id: 4,
    title: "Resident Evil 4",
    platform: "PC",
    genre: "Action Horror",
    status: "Pausado",
    progress: 28,
    hours: 7,
    eta: "10h",
    priority: "Alta",
    mood: "Ação",
    score: 9.1,
    owned: true,
    year: 2023,
    notes: "Parado há dias. Dá para retomar fácil.",
    difficulty: "Média",
  },
  {
    id: 5,
    title: "Hi-Fi Rush",
    platform: "PC",
    genre: "Action Rhythm",
    status: "Backlog",
    progress: 0,
    hours: 0,
    eta: "11h",
    priority: "Alta",
    mood: "Energia",
    score: 8.9,
    owned: true,
    year: 2023,
    notes: "Cara de jogo perfeito para limpar backlog.",
    difficulty: "Baixa",
  },
  {
    id: 6,
    title: "A Short Hike",
    platform: "PC",
    genre: "Cozy Adventure",
    status: "Backlog",
    progress: 0,
    hours: 0,
    eta: "2h",
    priority: "Alta",
    mood: "Cozy",
    score: 8.7,
    owned: true,
    year: 2019,
    notes: "Ideal para meta de jogo curto.",
    difficulty: "Baixa",
  },
  {
    id: 7,
    title: "Balatro",
    platform: "PC",
    genre: "Roguelike Deckbuilder",
    status: "Jogando",
    progress: 18,
    hours: 6,
    eta: "∞",
    priority: "Média",
    mood: "Run rápida",
    score: 9.0,
    owned: true,
    year: 2024,
    notes: "Perigoso. Rouba tempo do backlog principal.",
    difficulty: "Média",
  },
  {
    id: 8,
    title: "Metaphor: ReFantazio",
    platform: "PS5",
    genre: "JRPG",
    status: "Wishlist",
    progress: 0,
    hours: 0,
    eta: "70h",
    priority: "Média",
    mood: "Épico",
    score: 9.3,
    owned: false,
    year: 2024,
    notes: "Acompanhar promo antes de entrar na fila.",
    difficulty: "Média",
  },
  {
    id: 9,
    title: "Hades",
    platform: "Switch",
    genre: "Roguelike",
    status: "Terminado",
    progress: 100,
    hours: 44,
    eta: "0h",
    priority: "Baixa",
    mood: "Combate",
    score: 9.5,
    owned: true,
    year: 2020,
    notes: "Fechado, mas sempre dá vontade de voltar.",
    difficulty: "Alta",
  },
  {
    id: 10,
    title: "Death Stranding 2",
    platform: "PS5",
    genre: "Cinematic Adventure",
    status: "Wishlist",
    progress: 0,
    hours: 0,
    eta: "Sem data",
    priority: "Alta",
    mood: "Imersivo",
    score: 9.0,
    owned: false,
    year: 2025,
    notes: "Vigiar lançamento e reviews.",
    difficulty: "Média",
  },
  {
    id: 11,
    title: "Dead Cells",
    platform: "PC",
    genre: "Roguelite",
    status: "Pausado",
    progress: 34,
    hours: 19,
    eta: "8h",
    priority: "Baixa",
    mood: "Arcade",
    score: 8.8,
    owned: true,
    year: 2018,
    notes: "Bom para partidas rápidas.",
    difficulty: "Alta",
  },
  {
    id: 12,
    title: "Persona 3 Reload",
    platform: "PC",
    genre: "JRPG",
    status: "Backlog",
    progress: 0,
    hours: 0,
    eta: "65h",
    priority: "Média",
    mood: "Narrativo",
    score: 8.9,
    owned: true,
    year: 2024,
    notes: "Jogo grande. Só entrar quando abrir espaço mental.",
    difficulty: "Baixa",
  },
];

const monthlyProgress = [
  { month: "Jan", finished: 2, started: 3 },
  { month: "Fev", finished: 1, started: 4 },
  { month: "Mar", finished: 3, started: 2 },
  { month: "Abr", finished: 2, started: 5 },
  { month: "Mai", finished: 4, started: 3 },
  { month: "Jun", finished: 2, started: 2 },
];

const platformData = [
  { name: "PC", value: 48 },
  { name: "PS5", value: 22 },
  { name: "Switch", value: 15 },
  { name: "Retro", value: 9 },
  { name: "Mobile", value: 6 },
];

const backlogBuckets = [
  { name: "Até 10h", total: 18 },
  { name: "10–25h", total: 24 },
  { name: "25–50h", total: 17 },
  { name: "50h+", total: 8 },
];

const recentSessions = [
  { game: "Cyberpunk 2077", platform: "PC", time: "2h 10m", note: "Missão principal + side quest", progress: 62 },
  { game: "Balatro", platform: "PC", time: "45m", note: "Run bem melhor que ontem", progress: 18 },
  { game: "Alan Wake 2", platform: "PS5", time: "1h 30m", note: "Capítulo novo, clima impecável", progress: 41 },
  { game: "Hades", platform: "Switch", time: "55m", note: "Mais uma tentativa sofrida e bonita", progress: 73 },
];

const plannerQueue = [
  {
    rank: 1,
    title: "A Short Hike",
    reason: "Resolve a meta de jogo curto e libera dopamina rápida.",
    eta: "2h",
    fit: "Fim de semana curto",
  },
  {
    rank: 2,
    title: "Resident Evil 4",
    reason: "Já começou e está fácil de retomar. Alto retorno por pouco atrito.",
    eta: "10h",
    fit: "Noites com energia",
  },
  {
    rank: 3,
    title: "Hi-Fi Rush",
    reason: "Combina com seu gosto por ação estilosa sem compromisso de 50h+.",
    eta: "11h",
    fit: "Bloco médio",
  },
  {
    rank: 4,
    title: "Sea of Stars",
    reason: "Já existe progresso, mas exige mais janela mental.",
    eta: "16h",
    fit: "Sessões longas",
  },
];

const pieColors = ["#F8EF00", "#00E5FF", "#FF4DB8", "#FF7A00", "#8B5CF6"];
const cutStyle = { clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 24px 100%, 0 calc(100% - 24px))" } as React.CSSProperties;
const cutStyleSmall = { clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" } as React.CSSProperties;

function CutPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      style={cutStyle}
      className={`relative overflow-hidden border border-[#f8ef00]/20 bg-[#0c0d12]/95 shadow-[0_0_0_1px_rgba(248,239,0,0.06),0_0_28px_rgba(248,239,0,0.08)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,239,0,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(248,239,0,0.05)_1px,transparent_1px)] bg-[size:26px_26px] opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(248,239,0,0.03))]" />
      <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-28 bg-[#f8ef00]" />
      <div className="pointer-events-none absolute right-0 top-0 h-14 w-14 bg-[radial-gradient(circle,rgba(255,77,184,0.14),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-16 bg-[radial-gradient(circle,rgba(0,229,255,0.10),transparent_70%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function CyberButton({ children, className = "", variant = "primary", onClick }: { children: React.ReactNode; className?: string; variant?: "primary" | "secondary" | "ghost"; onClick?: () => void }) {
  const variants = {
    primary: "bg-[#f8ef00] text-black hover:bg-[#fff35c] border-[#f8ef00]/80 shadow-[0_0_24px_rgba(248,239,0,0.18)]",
    secondary: "bg-[#12141b] text-[#f8ef00] hover:bg-[#191c25] border-[#f8ef00]/25",
    ghost: "bg-[#111318] text-white hover:bg-[#161922] border-white/10",
  };

  return (
    <Button
      onClick={onClick}
      style={cutStyleSmall}
      className={`h-11 border uppercase tracking-[0.18em] text-[11px] font-bold rounded-none ${variants[variant]} ${className}`}
    >
      {children}
    </Button>
  );
}

function SectionTitle({ title, description, icon: Icon }: { title: string; description: string; icon?: any }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[#f8ef00]" /> : null}
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    Backlog: "border-[#f8ef00]/20 bg-[#f8ef00]/10 text-[#f8ef00]",
    Jogando: "border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#9ef6ff]",
    Terminado: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    Pausado: "border-[#ff4db8]/20 bg-[#ff4db8]/10 text-[#ffb5df]",
    Wishlist: "border-white/10 bg-white/5 text-zinc-200",
  };

  return (
    <Badge style={cutStyleSmall} className={`rounded-none ${map[status]} hover:bg-inherit`}>
      {status}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Game["priority"] }) {
  const map = {
    Alta: "border-[#ff4db8]/20 bg-[#ff4db8]/10 text-[#ffb8e1]",
    Média: "border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#a6f7ff]",
    Baixa: "border-white/10 bg-white/5 text-zinc-300",
  };
  return (
    <Badge style={cutStyleSmall} className={`rounded-none ${map[priority]} hover:bg-inherit`}>
      {priority}
    </Badge>
  );
}

function SidebarItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={cutStyleSmall}
      className={`group flex w-full items-center gap-3 border px-4 py-3 text-left uppercase tracking-[0.16em] text-[11px] font-bold transition ${
        active
          ? "border-[#f8ef00]/40 bg-[#f8ef00]/12 text-[#f8ef00] shadow-[0_0_18px_rgba(248,239,0,0.08)]"
          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-[#f8ef00]/25 hover:bg-[#16181f]"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-[#f8ef00]" : "text-zinc-400 group-hover:text-[#f8ef00]"}`} />
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, delta, icon: Icon, hint }: { title: string; value: string; delta: string; icon: any; hint: string }) {
  return (
    <CutPanel>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div style={cutStyleSmall} className="inline-flex items-center gap-2 border border-[#f8ef00]/20 bg-[#f8ef00]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f8ef00]">
              <Radar className="h-3 w-3" />
              Telemetria
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-zinc-500">{title}</p>
            <h3 className="mt-2 text-4xl font-black tracking-tight text-[#f5f7fa]">{value}</h3>
            <p className="mt-2 text-xs text-zinc-400">{hint}</p>
          </div>
          <div style={cutStyleSmall} className="border border-[#f8ef00]/20 bg-[#f8ef00]/10 p-3 text-[#f8ef00] shadow-[0_0_18px_rgba(248,239,0,0.08)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div style={cutStyleSmall} className="border border-[#00e5ff]/20 bg-[#00e5ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00e5ff]">
            {delta}
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-[#f8ef00]/40 via-[#ff4db8]/20 to-transparent" />
        </div>
      </div>
    </CutPanel>
  );
}

export default function GameBacklogApp() {
  const [screen, setScreen] = useState<"dashboard" | "library" | "planner" | "stats" | "profile">("dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"Todos" | Status>("Todos");
  const [selectedGameId, setSelectedGameId] = useState<number>(1);

  const selectedGame = libraryGames.find((g) => g.id === selectedGameId) ?? libraryGames[0];

  const filteredGames = useMemo(() => {
    return libraryGames.filter((g) => {
      const matchesQuery = [g.title, g.platform, g.genre, g.mood].join(" ").toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "Todos" ? true : g.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  const stats = useMemo(() => {
    const total = libraryGames.length;
    const backlog = libraryGames.filter((g) => g.status === "Backlog").length;
    const playing = libraryGames.filter((g) => g.status === "Jogando").length;
    const finished = libraryGames.filter((g) => g.status === "Terminado").length;
    const hours = libraryGames.reduce((acc, g) => acc + g.hours, 0);
    return { total, backlog, playing, finished, hours };
  }, []);

  const dashboardView = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total na biblioteca" value={String(stats.total)} delta="+8 este mês" icon={Gamepad2} hint="Entre PC, consoles e wishlist" />
        <StatCard title="No backlog" value={String(stats.backlog)} delta="-3 na semana" icon={ListTodo} hint="Ainda não iniciados" />
        <StatCard title="Jogando agora" value={String(stats.playing)} delta="2 ativos" icon={Flame} hint="Fluxo atual" />
        <StatCard title="Finalizados" value={String(stats.finished)} delta="31% de conclusão" icon={Trophy} hint="Histórico consolidado" />
        <StatCard title="Horas registradas" value={`${stats.hours}h`} delta="+17h em 7 dias" icon={Clock3} hint="Telemetria manual" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <CutPanel className="xl:col-span-2">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <SectionTitle title="Evolução do ano" description="Jogos iniciados vs. finalizados por mês" icon={Activity} />
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyProgress}>
                  <CartesianGrid stroke="rgba(248,239,0,0.12)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.46)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.46)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(248,239,0,0.2)', borderRadius: 0, boxShadow: '0 0 24px rgba(248,239,0,0.08)' }} />
                  <Line type="monotone" dataKey="started" stroke="#00E5FF" strokeWidth={3.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="finished" stroke="#F8EF00" strokeWidth={3.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </CutPanel>

        <CutPanel>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <SectionTitle title="Plataformas" description="Distribuição da sua coleção" icon={Monitor} />
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>
                    {platformData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(248,239,0,0.2)', borderRadius: 0, boxShadow: '0 0 24px rgba(248,239,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {platformData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: pieColors[i % pieColors.length], boxShadow: `0 0 12px ${pieColors[i % pieColors.length]}` }} />
                    {item.name} <span className="text-zinc-500">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CutPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CutPanel className="lg:col-span-2">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <SectionTitle title="Continuar jogando" description="Jogos ativos e pausados com alto retorno" icon={Swords} />
              <CyberButton variant="secondary" className="h-10 px-4" onClick={() => setScreen("library")}>Abrir biblioteca</CyberButton>
            </CardHeader>
            <CardContent className="space-y-4">
              {libraryGames.filter((g) => g.status === "Jogando" || g.status === "Pausado").slice(0, 3).map((game) => (
                <div key={game.id} style={cutStyleSmall} className="border border-[#f8ef00]/16 bg-[#0a0c11] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{game.title}</h3>
                        <StatusBadge status={game.status} />
                      </div>
                      <p className="text-sm text-zinc-400">{game.platform} • {game.genre}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge style={cutStyleSmall} className="rounded-none border border-[#ff4db8]/20 bg-[#ff4db8]/10 text-[#ff9bd6] hover:bg-[#ff4db8]/10">{game.eta} restantes</Badge>
                      <CyberButton variant="primary" className="h-10 px-4" onClick={() => { setSelectedGameId(game.id); setScreen("library"); }}>Detalhes</CyberButton>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                      <span>Progresso</span>
                      <span>{game.progress}%</span>
                    </div>
                    <Progress value={game.progress} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#f8ef00] [&>div]:to-[#ff4db8]" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </CutPanel>

        <CutPanel>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <SectionTitle title="Radar de prioridade" description="O sistema sugere sua fila ideal" icon={Target} />
            </CardHeader>
            <CardContent className="space-y-3">
              {plannerQueue.slice(0, 3).map((item) => (
                <div key={item.rank} style={cutStyleSmall} className="border border-[#f8ef00]/16 bg-[#0a0c11] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Posição {item.rank}</p>
                      <h3 className="font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{item.reason}</p>
                    </div>
                    <Badge style={cutStyleSmall} className="rounded-none border border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#a6f7ff] hover:bg-[#00e5ff]/10">{item.eta}</Badge>
                  </div>
                </div>
              ))}
              <CyberButton variant="primary" className="w-full" onClick={() => setScreen("planner")}>Abrir planner</CyberButton>
            </CardContent>
          </Card>
        </CutPanel>
      </div>
    </div>
  );

  const libraryView = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <CutPanel>
          <div className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <SectionTitle title="Biblioteca" description="Catálogo completo com filtros e seleção rápida" icon={Library} />
              <div className="flex flex-wrap gap-2">
                <CyberButton variant="secondary" className="h-10 px-4"><Download className="mr-2 h-4 w-4" />Exportar</CyberButton>
                <CyberButton variant="primary" className="h-10 px-4"><Plus className="mr-2 h-4 w-4" />Adicionar</CyberButton>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f8ef00]/80" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar título, plataforma, gênero, mood..."
                  className="h-12 rounded-none border-[#f8ef00]/20 bg-[#0b0d12] pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-[#f8ef00]/30"
                  style={cutStyleSmall}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["Todos", "Backlog", "Jogando", "Pausado", "Terminado", "Wishlist"] as const).map((status) => (
                  <CyberButton key={status} variant={filter === status ? "primary" : "secondary"} className="h-10 px-4" onClick={() => setFilter(status)}>
                    <Filter className="mr-2 h-4 w-4" />{status}
                  </CyberButton>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGameId(game.id)}
                  style={cutStyleSmall}
                  className={`border bg-[#0a0c11] p-4 text-left transition ${selectedGameId === game.id ? "border-[#f8ef00]/42 shadow-[0_0_20px_rgba(248,239,0,0.10)]" : "border-white/10 hover:border-[#f8ef00]/22"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{game.platform}</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{game.title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{game.genre}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge status={game.status} />
                    <PriorityBadge priority={game.priority} />
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                      <span>Progresso</span>
                      <span>{game.progress}%</span>
                    </div>
                    <Progress value={game.progress} className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#f8ef00] [&>div]:to-[#00e5ff]" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-zinc-400">
                    <div>
                      <p className="uppercase tracking-[0.18em] text-zinc-500">Nota</p>
                      <p className="mt-1 font-bold text-white">{game.score}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.18em] text-zinc-500">Horas</p>
                      <p className="mt-1 font-bold text-white">{game.hours}h</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.18em] text-zinc-500">ETA</p>
                      <p className="mt-1 font-bold text-white">{game.eta}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CutPanel>

        <CutPanel>
          <div className="p-5">
            <SectionTitle title="Ficha do jogo" description="Painel lateral com detalhes e ações rápidas" icon={PanelsTopLeft} />
            <div className="mt-5 space-y-4">
              <div style={cutStyleSmall} className="border border-[#f8ef00]/18 bg-[#0a0c11] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#f8ef00]">Selecionado</p>
                    <h3 className="mt-2 text-2xl font-black text-white">{selectedGame.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{selectedGame.platform} • {selectedGame.year} • {selectedGame.genre}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <StatusBadge status={selectedGame.status} />
                    <PriorityBadge priority={selectedGame.priority} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Progresso</p>
                    <p className="mt-1 font-bold text-white">{selectedGame.progress}%</p>
                  </div>
                  <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Horas</p>
                    <p className="mt-1 font-bold text-white">{selectedGame.hours}h</p>
                  </div>
                  <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">ETA</p>
                    <p className="mt-1 font-bold text-white">{selectedGame.eta}</p>
                  </div>
                  <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Nota</p>
                    <p className="mt-1 font-bold text-white">{selectedGame.score}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    <span>Barra de avanço</span>
                    <span>{selectedGame.progress}%</span>
                  </div>
                  <Progress value={selectedGame.progress} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#f8ef00] [&>div]:to-[#ff4db8]" />
                </div>
              </div>

              <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Leitura do sistema</p>
                <p className="mt-2 text-sm text-zinc-300">{selectedGame.notes}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge style={cutStyleSmall} className="rounded-none border border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#a6f7ff] hover:bg-[#00e5ff]/10">Mood: {selectedGame.mood}</Badge>
                  <Badge style={cutStyleSmall} className="rounded-none border border-[#ff4db8]/20 bg-[#ff4db8]/10 text-[#ffb8e1] hover:bg-[#ff4db8]/10">Dificuldade: {selectedGame.difficulty}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CyberButton variant="primary" className="w-full"><PlayIcon />Retomar</CyberButton>
                <CyberButton variant="secondary" className="w-full"><Heart className="mr-2 h-4 w-4" />Favoritar</CyberButton>
                <CyberButton variant="ghost" className="w-full"><Plus className="mr-2 h-4 w-4" />Nova sessão</CyberButton>
                <CyberButton variant="ghost" className="w-full" onClick={() => setScreen("planner")}><Route className="mr-2 h-4 w-4" />Enviar ao planner</CyberButton>
              </div>
            </div>
          </div>
        </CutPanel>
      </div>
    </div>
  );

  const plannerView = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <CutPanel>
          <div className="p-5">
            <SectionTitle title="Backlog planner" description="Fila de execução, metas e inteligência de prioridade" icon={FolderKanban} />
            <div className="mt-5 space-y-4">
              {plannerQueue.map((item) => (
                <div key={item.rank} style={cutStyleSmall} className="border border-[#f8ef00]/16 bg-[#0a0c11] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div style={cutStyleSmall} className="min-w-[58px] border border-[#f8ef00]/20 bg-[#f8ef00]/10 px-3 py-2 text-center text-[#f8ef00]">
                        <p className="text-[10px] uppercase tracking-[0.22em]">Slot</p>
                        <p className="mt-1 text-2xl font-black">{item.rank}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm text-zinc-400">{item.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge style={cutStyleSmall} className="rounded-none border border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#a6f7ff] hover:bg-[#00e5ff]/10">ETA {item.eta}</Badge>
                          <Badge style={cutStyleSmall} className="rounded-none border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/5">{item.fit}</Badge>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CutPanel>

        <div className="space-y-6">
          <CutPanel>
            <div className="p-5">
              <SectionTitle title="Metas táticas" description="Pequenas vitórias para reduzir o acúmulo" icon={Target} />
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
                    <span>Finalizar 1 jogo curto</span>
                    <span>70%</span>
                  </div>
                  <Progress value={70} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#f8ef00] [&>div]:to-[#ff4db8]" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
                    <span>Registrar 5 sessões</span>
                    <span>80%</span>
                  </div>
                  <Progress value={80} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#00e5ff] [&>div]:to-[#8b5cf6]" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
                    <span>Reduzir backlog em 2 jogos</span>
                    <span>40%</span>
                  </div>
                  <Progress value={40} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#ff7a00] [&>div]:to-[#f8ef00]" />
                </div>
              </div>
            </div>
          </CutPanel>

          <CutPanel>
            <div className="p-5">
              <SectionTitle title="Regras do motor" description="Como a fila está sendo priorizada" icon={Binary} />
              <div className="mt-5 space-y-3 text-sm text-zinc-300">
                <div style={cutStyleSmall} className="border border-[#00e5ff]/20 bg-[#00e5ff]/10 p-4 text-[#b9f7ff]">+ Jogos curtos recebem bônus para limpar backlog mais rápido.</div>
                <div style={cutStyleSmall} className="border border-[#f8ef00]/20 bg-[#f8ef00]/10 p-4 text-[#fffab0]">+ Jogos já iniciados sobem na fila por terem menor atrito de retorno.</div>
                <div style={cutStyleSmall} className="border border-[#ff4db8]/20 bg-[#ff4db8]/10 p-4 text-[#ffc3e8]">+ Jogos longos entram quando houver espaço mental e janela de tempo real.</div>
              </div>
            </div>
          </CutPanel>
        </div>
      </div>
    </div>
  );

  const statsView = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CutPanel>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <SectionTitle title="Backlog por duração" description="Onde está o gargalo do seu acervo" icon={BarChart3} />
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={backlogBuckets}>
                  <CartesianGrid stroke="rgba(248,239,0,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.46)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.46)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(248,239,0,0.2)', borderRadius: 0, boxShadow: '0 0 24px rgba(248,239,0,0.08)' }} />
                  <Bar dataKey="total" radius={[0, 0, 0, 0]} fill="#F8EF00" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </CutPanel>

        <CutPanel>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <SectionTitle title="Sessões recentes" description="Diário rápido de jogo" icon={CalendarDays} />
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.game} style={cutStyleSmall} className="border border-[#f8ef00]/16 bg-[#0a0c11] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{session.game}</h3>
                        <Badge style={cutStyleSmall} className="rounded-none border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/5">{session.platform}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{session.note}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm text-zinc-400">
                      <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#00e5ff]" /> {session.time}</div>
                      <div className="flex items-center gap-2"><Star className="h-4 w-4 text-[#f8ef00]" /> {session.progress}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </CutPanel>
      </div>
    </div>
  );

  const profileView = (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <CutPanel>
        <div className="p-5">
          <SectionTitle title="Perfil" description="Sua camada pessoal dentro do backlog OS" icon={User} />
          <div className="mt-5 space-y-4">
            <div style={cutStyleSmall} className="border border-[#f8ef00]/16 bg-[#0a0c11] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#f8ef00]">Operador</p>
              <h3 className="mt-2 text-3xl font-black text-white">Matheus</h3>
              <p className="mt-2 text-sm text-zinc-400">Curadoria agressiva de backlog, foco em catálogo, progresso e estatística pessoal.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Plataforma principal</p>
                <p className="mt-1 font-bold text-white">PC</p>
              </div>
              <div style={cutStyleSmall} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Estilo</p>
                <p className="mt-1 font-bold text-white">Backlog Planner</p>
              </div>
            </div>
          </div>
        </div>
      </CutPanel>

      <CutPanel>
        <div className="p-5">
          <SectionTitle title="Conquistas do sistema" description="Resumo de hábitos, padrões e sinalizações" icon={CheckCircle2} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div style={cutStyleSmall} className="border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
              <CheckCircle2 className="mb-3 h-5 w-5" />
              <p className="font-bold">39 jogos finalizados</p>
              <p className="mt-1 text-sm text-emerald-100/80">Histórico sólido e biblioteca viva.</p>
            </div>
            <div style={cutStyleSmall} className="border border-[#00e5ff]/20 bg-[#00e5ff]/10 p-4 text-[#b9f7ff]">
              <ScanLine className="mb-3 h-5 w-5" />
              <p className="font-bold">Radar de progresso ativo</p>
              <p className="mt-1 text-sm text-[#d4fbff]/80">4 jogos com acompanhamento contínuo.</p>
            </div>
            <div style={cutStyleSmall} className="border border-[#ff4db8]/20 bg-[#ff4db8]/10 p-4 text-[#ffd0eb]">
              <PauseCircle className="mb-3 h-5 w-5" />
              <p className="font-bold">2 jogos pausados</p>
              <p className="mt-1 text-sm text-[#ffdff0]/80">Baixo atrito para retomar e gerar avanço real.</p>
            </div>
            <div style={cutStyleSmall} className="border border-[#f8ef00]/20 bg-[#f8ef00]/10 p-4 text-[#fff8b2]">
              <XCircle className="mb-3 h-5 w-5" />
              <p className="font-bold">Gargalo de médio porte</p>
              <p className="mt-1 text-sm text-[#fff8cc]/80">Faixa 10–25h segue como principal bloco do backlog.</p>
            </div>
          </div>
        </div>
      </CutPanel>
    </div>
  );

  return (
    <div className="min-h-screen overflow-hidden bg-[#06070a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,239,0,0.11),transparent_18%),radial-gradient(circle_at_85%_10%,rgba(255,77,184,0.10),transparent_16%),radial-gradient(circle_at_70%_80%,rgba(0,229,255,0.08),transparent_20%),linear-gradient(180deg,#050608_0%,#0a0b10_50%,#050608_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(248,239,0,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(248,239,0,0.022)_1px,transparent_1px)] bg-[size:34px_34px] opacity-[0.1]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.014)_1px,transparent_1px,transparent_4px)] opacity-[0.06]" />
      <div className="pointer-events-none absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-transparent via-[#f8ef00]/60 to-transparent" />
      <div className="pointer-events-none absolute left-[-60px] top-24 h-72 w-72 rounded-full bg-[#f8ef00]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-60px] top-16 h-72 w-72 rounded-full bg-[#ff4db8]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#00e5ff]/8 blur-3xl" />

      <div className="relative mx-auto max-w-[1650px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-6">
            <CutPanel>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div style={cutStyleSmall} className="border border-[#f8ef00]/25 bg-[#f8ef00]/12 p-3 text-[#f8ef00] shadow-[0_0_24px_rgba(248,239,0,0.16)]">
                    <Orbit className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#f8ef00]">Night City backlog OS</p>
                    <h1 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.03em] text-white">
                      Arsenal<br />gamer
                    </h1>
                    <p className="mt-3 text-sm text-zinc-400">Sistema de catálogo, execução e telemetria pessoal.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <SidebarItem active={screen === "dashboard"} icon={LayoutDashboard} label="Dashboard" onClick={() => setScreen("dashboard")} />
                  <SidebarItem active={screen === "library"} icon={Library} label="Biblioteca" onClick={() => setScreen("library")} />
                  <SidebarItem active={screen === "planner"} icon={Route} label="Planner" onClick={() => setScreen("planner")} />
                  <SidebarItem active={screen === "stats"} icon={BarChart3} label="Estatísticas" onClick={() => setScreen("stats")} />
                  <SidebarItem active={screen === "profile"} icon={User} label="Perfil" onClick={() => setScreen("profile")} />
                </div>
              </div>
            </CutPanel>

            <CutPanel>
              <div className="p-5">
                <SectionTitle title="Quick actions" description="Atalhos do sistema" icon={Zap} />
                <div className="mt-4 space-y-2">
                  <CyberButton variant="primary" className="w-full"><Plus className="mr-2 h-4 w-4" />Novo jogo</CyberButton>
                  <CyberButton variant="secondary" className="w-full"><Download className="mr-2 h-4 w-4" />Importar biblioteca</CyberButton>
                  <CyberButton variant="ghost" className="w-full"><CalendarDays className="mr-2 h-4 w-4" />Registrar sessão</CyberButton>
                </div>
              </div>
            </CutPanel>
          </div>

          <div className="space-y-6">
            <CutPanel>
              <header className="p-5 md:p-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge style={cutStyleSmall} className="rounded-none border border-[#f8ef00]/25 bg-[#f8ef00]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#f8ef00] hover:bg-[#f8ef00]/10">Backlog OS</Badge>
                      <Badge style={cutStyleSmall} className="rounded-none border border-[#00e5ff]/25 bg-[#00e5ff]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#00e5ff] hover:bg-[#00e5ff]/10">Night City Mode</Badge>
                      <Badge style={cutStyleSmall} className="rounded-none border border-[#ff4db8]/25 bg-[#ff4db8]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#ff4db8] hover:bg-[#ff4db8]/10">Aggressive Premium UI</Badge>
                    </div>

                    <div className="mt-5 flex items-start gap-4">
                      <div style={cutStyleSmall} className="border border-[#f8ef00]/25 bg-[#f8ef00]/12 p-3 text-[#f8ef00] shadow-[0_0_24px_rgba(248,239,0,0.16)]">
                        <Cpu className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.34em] text-[#f8ef00]">Neural interface</p>
                        <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-[-0.03em] text-white md:text-5xl">
                          {screen === "dashboard" && <>visão <span className="text-[#f8ef00]">geral</span></>}
                          {screen === "library" && <>catálogo <span className="text-[#f8ef00]">tático</span></>}
                          {screen === "planner" && <>fila de <span className="text-[#f8ef00]">execução</span></>}
                          {screen === "stats" && <>telemetria <span className="text-[#f8ef00]">pessoal</span></>}
                          {screen === "profile" && <>camada de <span className="text-[#f8ef00]">perfil</span></>}
                        </h2>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300 md:text-base">
                          Catálogo, backlog, planner e estatísticas em uma interface cyberpunk com leitura rápida, foco em decisão e sensação de produto premium.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid w-full gap-3 xl:w-[430px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f8ef00]/80" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Busca global..."
                        className="h-12 rounded-none border-[#f8ef00]/20 bg-[#0b0d12] pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-[#f8ef00]/30"
                        style={cutStyleSmall}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                      <CyberButton variant="primary"><Zap className="mr-2 h-4 w-4" />Adicionar</CyberButton>
                      <CyberButton variant="secondary">Importar</CyberButton>
                      <CyberButton variant="secondary" onClick={() => setScreen("planner")}>Planner</CyberButton>
                      <CyberButton variant="ghost" onClick={() => setScreen("library")}>Catálogo</CyberButton>
                    </div>
                  </div>
                </div>
              </header>
            </CutPanel>

            {screen === "dashboard" && dashboardView}
            {screen === "library" && libraryView}
            {screen === "planner" && plannerView}
            {screen === "stats" && statsView}
            {screen === "profile" && profileView}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return <ChevronRight className="mr-2 h-4 w-4" />;
}
