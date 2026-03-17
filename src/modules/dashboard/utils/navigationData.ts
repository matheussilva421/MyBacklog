import { LayoutDashboard, Library, Radar, BarChart3, User } from "lucide-react";
import type { ScreenKey } from "../../../backlog/shared";

export const screenMeta: Record<ScreenKey, { label: string; icon: any }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  library: { label: "Catalogo", icon: Library },
  planner: { label: "Planner", icon: Radar },
  stats: { label: "Stats", icon: BarChart3 },
  profile: { label: "Perfil", icon: User },
};
