import type { AccessModel, AccessSource, LibraryEntry } from "./types";

type EntryOwnershipShape = Pick<
  LibraryEntry,
  "ownershipStatus" | "progressStatus" | "completionPercent" | "playtimeMinutes" | "sourceStore"
>;

export type LibraryEntrySemantics = {
  possession: "wishlist" | "owned";
  accessModel: AccessModel;
  accessSource: AccessSource;
  label: string;
  canLaunch: boolean;
  hasPermanentOwnership: boolean;
};

export function classifyAccessSource(sourceStore?: string): AccessSource {
  const normalized = String(sourceStore || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "manual" || normalized === "importado") return "manual";
  if (normalized.includes("game pass")) return "game_pass";
  if (normalized.includes("ps plus")) return "ps_plus";
  if (normalized.includes("steam")) return "steam";
  if (normalized.includes("epic")) return "epic";
  if (normalized.includes("gog")) return "gog";
  if (normalized.includes("ubisoft")) return "ubisoft_connect";
  if (normalized.includes("ea app") || normalized.includes("ea play")) return "ea_app";
  if (normalized.includes("ps store") || normalized.includes("playstation")) return "ps_store";
  if (normalized.includes("nintendo eshop")) return "nintendo_eshop";
  if (normalized.includes("nintendo online")) return "nintendo_online";
  if (normalized.includes("apple arcade")) return "apple_arcade";
  if (normalized.includes("netflix")) return "netflix_games";
  return "other";
}

export function deriveAccessModel(entry: Pick<LibraryEntry, "ownershipStatus">): AccessModel {
  switch (entry.ownershipStatus) {
    case "wishlist":
      return "wishlist";
    case "subscription":
      return "subscription";
    case "borrowed":
      return "borrowed";
    case "emulated":
      return "emulated";
    case "owned":
      return "purchase";
    default:
      return "unknown";
  }
}

export function resolveLibraryEntrySemantics(entry: EntryOwnershipShape): LibraryEntrySemantics {
  const possession = entry.ownershipStatus === "wishlist" ? "wishlist" : "owned";
  const accessModel = deriveAccessModel(entry);
  const accessSource = classifyAccessSource(entry.sourceStore);
  const canLaunch = possession === "owned";
  const label =
    accessModel === "wishlist"
      ? "Wishlist"
      : accessModel === "purchase"
        ? "Compra"
        : accessModel === "subscription"
          ? "Assinatura"
          : accessModel === "borrowed"
            ? "Empréstimo"
            : accessModel === "emulated"
              ? "Emulação"
              : "Acesso indefinido";

  return {
    possession,
    accessModel,
    accessSource,
    label,
    canLaunch,
    hasPermanentOwnership: accessModel === "purchase",
  };
}

export function isCompleted(entry: Pick<LibraryEntry, "progressStatus" | "completionPercent">): boolean {
  return (
    entry.progressStatus === "finished" || entry.progressStatus === "completed_100" || entry.completionPercent >= 100
  );
}

export function isCurrentlyPlaying(entry: Pick<LibraryEntry, "progressStatus">): boolean {
  return entry.progressStatus === "playing";
}

export function isPaused(entry: Pick<LibraryEntry, "progressStatus">): boolean {
  return entry.progressStatus === "paused";
}

export function isWishlistEntry(entry: Pick<LibraryEntry, "ownershipStatus">): boolean {
  return entry.ownershipStatus === "wishlist";
}

export function hasStarted(
  entry: Pick<LibraryEntry, "progressStatus" | "completionPercent" | "playtimeMinutes">,
): boolean {
  return (
    isCurrentlyPlaying(entry) ||
    isPaused(entry) ||
    isCompleted(entry) ||
    entry.completionPercent > 0 ||
    entry.playtimeMinutes > 0
  );
}

export function isBacklogEntry(entry: EntryOwnershipShape): boolean {
  return !isWishlistEntry(entry) && !hasStarted(entry);
}

export function isWantToPlay(entry: EntryOwnershipShape): boolean {
  return isWishlistEntry(entry) || isBacklogEntry(entry);
}

export function canLaunchEntry(entry: EntryOwnershipShape): boolean {
  return resolveLibraryEntrySemantics(entry).canLaunch;
}
