import type { Game as DbGameMetadata } from "../../../core/types";
import type { ImportPayload } from "../../../backlog/shared";
import { mergePlatformList, normalizeGameTitle } from "../../../core/utils";

const rawgApiBase = "https://api.rawg.io/api";

export type RawgCandidate = {
  rawgId: number;
  title: string;
  slug?: string;
  releaseYear?: number;
  coverUrl?: string;
  platforms: string[];
  genres: string[];
  score: number;
};

export type RawgMetadata = Pick<
  DbGameMetadata,
  "slug" | "coverUrl" | "rawgId" | "description" | "genres" | "releaseYear" | "platforms" | "developer" | "publisher"
>;

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRawgUrl(path: string, apiKey: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${rawgApiBase}${path}`);
  url.searchParams.set("key", apiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function normalizeRawgPlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry === "object" && "platform" in entry) {
            const platform = (entry as { platform?: { name?: string } }).platform?.name;
            return platform ?? "";
          }
          return "";
        })
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeRawgGenres(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => {
          if (!entry || typeof entry !== "object" || !("name" in entry)) return "";
          return String((entry as { name?: string }).name ?? "").trim();
        })
        .filter(Boolean),
    ),
  );
}

function getSimilarityScore(searchTitle: string, candidateTitle: string): number {
  const normalizedSearch = normalizeGameTitle(searchTitle);
  const normalizedCandidate = normalizeGameTitle(candidateTitle);
  if (normalizedSearch === normalizedCandidate) return 100;
  if (normalizedCandidate.startsWith(normalizedSearch) || normalizedSearch.startsWith(normalizedCandidate)) return 88;
  if (normalizedCandidate.includes(normalizedSearch) || normalizedSearch.includes(normalizedCandidate)) return 72;

  const searchTokens = new Set(normalizedSearch.split(/\s+/).filter(Boolean));
  const candidateTokens = new Set(normalizedCandidate.split(/\s+/).filter(Boolean));
  const overlap = Array.from(searchTokens).filter((token) => candidateTokens.has(token)).length;
  return overlap * 10;
}

async function rawgFetch<T>(path: string, apiKey: string, params: Record<string, string | number | undefined>) {
  const response = await fetch(buildRawgUrl(path, apiKey, params));
  if (!response.ok) {
    throw new Error(`RAWG ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function searchRawgCandidates(title: string, apiKey: string): Promise<RawgCandidate[]> {
  const normalizedTitle = title.trim();
  if (!apiKey || !normalizedTitle) return [];

  const data = await rawgFetch<{ results?: Array<Record<string, unknown>> }>(
    "/games",
    apiKey,
    { search: normalizedTitle, page_size: 5 },
  );

  const results = Array.isArray(data.results) ? data.results : [];
  const normalizedCandidates = results
    .map((item): RawgCandidate | null => {
      const rawgId = Number(item.id);
      const titleValue = String(item.name ?? "").trim();
      if (!rawgId || !titleValue) return null;

      return {
        rawgId,
        title: titleValue,
        slug: String(item.slug ?? "") || undefined,
        releaseYear: item.released ? Number(String(item.released).slice(0, 4)) || undefined : undefined,
        coverUrl: String(item.background_image ?? "") || undefined,
        platforms: normalizeRawgPlatforms(item.platforms),
        genres: normalizeRawgGenres(item.genres),
        score: getSimilarityScore(normalizedTitle, titleValue),
      } satisfies RawgCandidate;
    })
    .filter((item): item is RawgCandidate => item !== null);

  return normalizedCandidates.sort((left, right) => right.score - left.score);
}

export async function fetchRawgMetadata(rawgId: number, apiKey: string): Promise<RawgMetadata | null> {
  if (!apiKey || !rawgId) return null;

  const item = await rawgFetch<Record<string, unknown>>(`/games/${rawgId}`, apiKey, {});
  const developers = Array.isArray(item.developers) ? item.developers : [];
  const publishers = Array.isArray(item.publishers) ? item.publishers : [];

  return {
    slug: String(item.slug ?? "") || undefined,
    coverUrl: String(item.background_image ?? "") || undefined,
    rawgId,
    genres: normalizeRawgGenres(item.genres).join(", ") || undefined,
    releaseYear: item.released ? Number(String(item.released).slice(0, 4)) || undefined : undefined,
    platforms: normalizeRawgPlatforms(item.platforms).join(", ") || undefined,
    description:
      String(item.description_raw ?? "").trim() ||
      stripHtml(String(item.description ?? "")).trim() ||
      undefined,
    developer:
      developers
        .map((developer) =>
          developer && typeof developer === "object" && "name" in developer
            ? String((developer as { name?: string }).name ?? "").trim()
            : "",
        )
        .filter(Boolean)
        .join(", ") || undefined,
    publisher:
      publishers
        .map((publisher) =>
          publisher && typeof publisher === "object" && "name" in publisher
            ? String((publisher as { name?: string }).name ?? "").trim()
            : "",
        )
        .filter(Boolean)
        .join(", ") || undefined,
  };
}

export async function resolveBestRawgCandidate(title: string, apiKey: string): Promise<RawgCandidate | null> {
  const candidates = await searchRawgCandidates(title, apiKey);
  if (candidates.length === 0) return null;

  const best = candidates[0];
  if (best.score >= 88) return best;
  if (candidates.length === 1 && best.score >= 72) return best;
  return null;
}

export function applyRawgMetadataToImportPayload(payload: ImportPayload, metadata: RawgMetadata | null): ImportPayload {
  if (!metadata) return payload;

  return {
    ...payload,
    rawgId: payload.rawgId ?? metadata.rawgId,
    coverUrl: payload.coverUrl || metadata.coverUrl,
    genres: payload.genres || metadata.genres,
    releaseYear: payload.releaseYear ?? metadata.releaseYear,
    developer: payload.developer || metadata.developer,
    publisher: payload.publisher || metadata.publisher,
    description: payload.description || metadata.description,
  };
}

export function mergeRawgMetadataIntoGame(game: DbGameMetadata, metadata: RawgMetadata): DbGameMetadata {
  return {
    ...game,
    slug: game.slug || metadata.slug,
    coverUrl: game.coverUrl || metadata.coverUrl,
    rawgId: game.rawgId ?? metadata.rawgId,
    description: game.description || metadata.description,
    genres: game.genres || metadata.genres,
    releaseYear: game.releaseYear ?? metadata.releaseYear,
    platforms:
      metadata.platforms && metadata.platforms.trim()
        ? mergePlatformList(game.platforms, metadata.platforms)
        : game.platforms,
    developer: game.developer || metadata.developer,
    publisher: game.publisher || metadata.publisher,
    updatedAt: new Date().toISOString(),
  };
}
