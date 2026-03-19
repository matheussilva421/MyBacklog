export function normalizeGameTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function splitCsvTokens(value: string | Array<string | undefined> | undefined): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  const tokens = new Set(
    rawValues
      .flatMap((entry) => String(entry || "").split(","))
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  return Array.from(tokens);
}

export function getPrimaryCsvToken(
  value: string | Array<string | undefined> | undefined,
  fallback: string,
): string {
  return splitCsvTokens(value)[0] || fallback;
}

export function mergePlatformList(current: string | undefined, platform: string): string {
  return splitCsvTokens([current, platform]).join(", ");
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

export function parseDateInput(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getTime());
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(trimmed);
}

export function startOfWeek(value: string | Date): Date {
  const date = parseDateInput(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfLocalDay(value: string | Date): Date {
  const date = parseDateInput(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDatePtBr(value: string | Date): string {
  return parseDateInput(value).toLocaleDateString("pt-BR");
}

export function toDateInputValue(value: string | Date): string {
  const date = parseDateInput(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateInputValue(now = new Date()): string {
  return toDateInputValue(now);
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
