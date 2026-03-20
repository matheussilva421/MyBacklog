import { normalizeGameTitle, normalizeToken } from "./utils";

export type StructuredEntryIdentity = {
  normalizedTitle: string;
  platformTokens: string[];
  storeTokens: string[];
};

function dedupeNormalizedTokens(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => normalizeToken(value || "")).filter(Boolean))).sort();
}

export function createStructuredEntryIdentity(args: {
  title: string;
  platforms?: string[];
  stores?: string[];
  primaryPlatform?: string;
  primaryStore?: string;
}): StructuredEntryIdentity {
  return {
    normalizedTitle: normalizeGameTitle(args.title),
    platformTokens: dedupeNormalizedTokens([...(args.platforms ?? []), args.primaryPlatform]),
    storeTokens: dedupeNormalizedTokens([...(args.stores ?? []), args.primaryStore]),
  };
}

export function hasTokenOverlap(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const tokenSet = new Set(left);
  return right.some((value) => tokenSet.has(value));
}

export function hasStructuredEntryIdentityOverlap(
  left: StructuredEntryIdentity,
  right: StructuredEntryIdentity,
): boolean {
  if (left.normalizedTitle !== right.normalizedTitle) return false;
  if (hasTokenOverlap(left.platformTokens, right.platformTokens)) return true;
  if (left.platformTokens.length > 0 && right.platformTokens.length > 0) return false;
  return hasTokenOverlap(left.storeTokens, right.storeTokens);
}

export function buildStructuredEntryLookupAliases(identity: StructuredEntryIdentity): string[] {
  if (identity.platformTokens.length > 0) {
    return identity.platformTokens.map((token) => `${identity.normalizedTitle}::platform::${token}`);
  }
  if (identity.storeTokens.length > 0) {
    return identity.storeTokens.map((token) => `${identity.normalizedTitle}::store::${token}`);
  }
  return [`${identity.normalizedTitle}::empty`];
}
