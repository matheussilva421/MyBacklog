export function normalizeGameTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function mergePlatformList(current: string | undefined, platform: string): string {
  const tokens = new Set(
    [current, platform]
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return Array.from(tokens).join(", ");
}

export function parseEtaHours(raw: string): number {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned.includes("sem data") || cleaned.includes("infinito")) {
    return Number.POSITIVE_INFINITY;
  }
  const match = cleaned.match(/(\d+[.,]?\d*)/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1].replace(",", "."));
}

export function formatDuration(durationMinutes: number): string {
  const safe = Math.max(0, Math.round(durationMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatRemainingEta(raw: string, progressPercent: number, loggedHours = 0): string {
  const etaHours = parseEtaHours(raw);
  if (!Number.isFinite(etaHours)) return "Sem ETA";

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
  if (clampedProgress >= 100) return "Concluído";

  let remainingHours = etaHours;
  if (clampedProgress > 0) {
    remainingHours = etaHours * ((100 - clampedProgress) / 100);
  } else if (loggedHours > 0) {
    remainingHours = etaHours - loggedHours;
  }

  if (remainingHours <= 0.5) return "<1h restante";

  const roundedHours = Math.ceil(remainingHours);
  return `${roundedHours}h restante${roundedHours === 1 ? "" : "s"}`;
}

export function formatMonthLabel(date: Date): string {
  return date
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^\w/, (value) => value.toUpperCase());
}

export function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
