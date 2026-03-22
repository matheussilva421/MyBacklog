/**
 * Gerador de Mock Data para MyBacklog
 *
 * Gera dados realistas para todas as 15 tabelas do schema,
 * com relacionamentos consistentes e timestamps variados.
 */

import type {
  Game,
  LibraryEntry,
  PlaySession,
  Review,
  Tag,
  GameTag,
  List,
  LibraryEntryList,
  Store,
  LibraryEntryStore,
  Platform,
  GamePlatform,
  Goal,
  Setting,
  SavedView,
  ImportJob,
  ProgressStatus,
  OwnershipStatus,
  Priority,
  GameFormat,
} from "../core/types";

// Utils helpers
const generateUuid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDateInRange = (startDays: number, endDays: number) => {
  const days = randomInt(endDays, startDays);
  return daysAgo(days);
};

// Dados de jogos reais para mock
const mockGamesData = [
  { title: "Cyberpunk 2077", rawgId: 41494, genres: "RPG, Action", platforms: "PC, PS5, Xbox", developer: "CD PROJEKT RED", publisher: "CD PROJEKT RED", releaseYear: 2020, estimatedTime: "60h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900_2x.jpg" },
  { title: "Hades", rawgId: 3498, genres: "Roguelike, Action, Indie", platforms: "PC, Switch, PS5, Xbox", developer: "Supergiant Games", publisher: "Supergiant Games", releaseYear: 2020, estimatedTime: "25h", difficulty: "Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900_2x.jpg" },
  { title: "The Witcher 3: Wild Hunt", rawgId: 2608, genres: "RPG, Action, Adventure", platforms: "PC, PS5, Xbox, Switch", developer: "CD PROJEKT RED", publisher: "WB Games", releaseYear: 2015, estimatedTime: "100h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/library_600x900_2x.jpg" },
  { title: "Hollow Knight", rawgId: 8398, genres: "Metroidvania, Indie, Action", platforms: "PC, Switch, PS5, Xbox", developer: "Team Cherry", publisher: "Team Cherry", releaseYear: 2017, estimatedTime: "30h", difficulty: "Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900_2x.jpg" },
  { title: "Stardew Valley", rawgId: 3010, genres: "Simulation, Indie, RPG", platforms: "PC, Switch, PS4, Xbox, Mobile", developer: "ConcernedApe", publisher: "ConcernedApe", releaseYear: 2016, estimatedTime: "80h", difficulty: "Baixa", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/library_600x900_2x.jpg" },
  { title: "Elden Ring", rawgId: 5168, genres: "RPG, Action, Souls-like", platforms: "PC, PS5, Xbox", developer: "FromSoftware", publisher: "Bandai Namco", releaseYear: 2022, estimatedTime: "80h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900_2x.jpg" },
  { title: "Celeste", rawgId: 3466, genres: "Platformer, Indie, Action", platforms: "PC, Switch, PS4, Xbox", developer: "Maddy Makes Games", publisher: "Maddy Makes Games", releaseYear: 2018, estimatedTime: "12h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/504230/library_600x900_2x.jpg" },
  { title: "Red Dead Redemption 2", rawgId: 3449, genres: "Action, Adventure, Western", platforms: "PC, PS4, Xbox, Stadia", developer: "Rockstar Games", publisher: "Rockstar Games", releaseYear: 2018, estimatedTime: "80h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/library_600x900_2x.jpg" },
  { title: "Disco Elysium", rawgId: 5062, genres: "RPG, Indie, Narrative", platforms: "PC, PS5, Xbox, Switch", developer: "ZA/UM", publisher: "ZA/UM", releaseYear: 2019, estimatedTime: "24h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/632470/library_600x900_2x.jpg" },
  { title: "God of War", rawgId: 3572, genres: "Action, Adventure, Hack and Slash", platforms: "PC, PS5", developer: "Santa Monica Studio", publisher: "Sony Interactive Entertainment", releaseYear: 2018, estimatedTime: "25h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1593500/library_600x900_2x.jpg" },
  { title: "Persona 5 Royal", rawgId: 4119, genres: "RPG, JRPG, Turn-Based", platforms: "PC, PS5, Switch, Xbox", developer: "Atlus", publisher: "Sega", releaseYear: 2019, estimatedTime: "120h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1687950/library_600x900_2x.jpg" },
  { title: "Dark Souls III", rawgId: 3384, genres: "RPG, Souls-like, Action", platforms: "PC, PS4, Xbox", developer: "FromSoftware", publisher: "Bandai Namco", releaseYear: 2016, estimatedTime: "40h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/374320/library_600x900_2x.jpg" },
  { title: "Outer Wilds", rawgId: 4634, genres: "Adventure, Indie, Exploration", platforms: "PC, PS4, Xbox, Switch", developer: "Mobius Digital", publisher: "Annapurna Interactive", releaseYear: 2019, estimatedTime: "20h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/753640/library_600x900_2x.jpg" },
  { title: "Divinity: Original Sin 2", rawgId: 3626, genres: "RPG, Strategy, Turn-Based", platforms: "PC, PS4, Xbox, Switch", developer: "Larian Studios", publisher: "Larian Studios", releaseYear: 2017, estimatedTime: "80h", difficulty: "Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/435150/library_600x900_2x.jpg" },
  { title: "Sekiro: Shadows Die Twice", rawgId: 3958, genres: "Action, Souls-like, Stealth", platforms: "PC, PS4, Xbox", developer: "FromSoftware", publisher: "Activision", releaseYear: 2019, estimatedTime: "30h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/814380/library_600x900_2x.jpg" },
  { title: "Terraria", rawgId: 2001, genres: "Sandbox, Adventure, Indie", platforms: "PC, Switch, PS4, Xbox, Mobile", developer: "Re-Logic", publisher: "Re-Logic", releaseYear: 2011, estimatedTime: "100h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/105600/library_600x900_2x.jpg" },
  { title: "Final Fantasy VII Rebirth", rawgId: 963310, genres: "RPG, JRPG, Action", platforms: "PS5", developer: "Square Enix", publisher: "Square Enix", releaseYear: 2024, estimatedTime: "100h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2909400/library_600x900_2x.jpg" },
  { title: "Spider-Man Remastered", rawgId: 4200, genres: "Action, Adventure, Superhero", platforms: "PC, PS5", developer: "Insomniac Games", publisher: "Sony Interactive Entertainment", releaseYear: 2018, estimatedTime: "20h", difficulty: "Baixa", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1817070/library_600x900_2x.jpg" },
  { title: "Slay the Spire", rawgId: 3864, genres: "Roguelike, Strategy, Card Game", platforms: "PC, Switch, PS4, Xbox, Mobile", developer: "MegaCrit", publisher: "MegaCrit", releaseYear: 2017, estimatedTime: "40h", difficulty: "Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/646570/library_600x900_2x.jpg" },
  { title: "Baldur's Gate 3", rawgId: 5404, genres: "RPG, Strategy, D&D", platforms: "PC, PS5, Xbox", developer: "Larian Studios", publisher: "Larian Studios", releaseYear: 2023, estimatedTime: "100h", difficulty: "Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/library_600x900_2x.jpg" },
  { title: "Ghost of Tsushima", rawgId: 4562, genres: "Action, Adventure, Open World", platforms: "PC, PS4, PS5", developer: "Sucker Punch Productions", publisher: "Sony Interactive Entertainment", releaseYear: 2020, estimatedTime: "30h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2215430/library_600x900_2x.jpg" },
  { title: "Returnal", rawgId: 5892, genres: "Roguelike, Action, Sci-Fi", platforms: "PC, PS5", developer: "Housemarque", publisher: "Sony Interactive Entertainment", releaseYear: 2021, estimatedTime: "20h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1649240/library_600x900_2x.jpg" },
  { title: "Death Stranding", rawgId: 4498, genres: "Action, Adventure, Sci-Fi", platforms: "PC, PS4, PS5", developer: "Kojima Productions", publisher: "Sony Interactive Entertainment", releaseYear: 2019, estimatedTime: "40h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1190460/library_600x900_2x.jpg" },
  { title: "Horizon Zero Dawn", rawgId: 3266, genres: "RPG, Action, Open World", platforms: "PC, PS4, PS5", developer: "Guerrilla Games", publisher: "Sony Interactive Entertainment", releaseYear: 2017, estimatedTime: "35h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1151640/library_600x900_2x.jpg" },
  { title: "The Last of Us Part I", rawgId: 4356, genres: "Action, Adventure, Survival Horror", platforms: "PC, PS5", developer: "Naughty Dog", publisher: "Sony Interactive Entertainment", releaseYear: 2022, estimatedTime: "15h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1888930/library_600x900_2x.jpg" },
  { title: "Resident Evil 4", rawgId: 5678, genres: "Survival Horror, Action, Shooter", platforms: "PC, PS4, PS5, Xbox", developer: "Capcom", publisher: "Capcom", releaseYear: 2023, estimatedTime: "16h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2050650/library_600x900_2x.jpg" },
  { title: "Sekiro: Shadows Die Twice", rawgId: 3958, genres: "Action, Souls-like", platforms: "PC, PS4, Xbox", developer: "FromSoftware", publisher: "Activision", releaseYear: 2019, estimatedTime: "30h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/814380/library_600x900_2x.jpg" },
  { title: "It Takes Two", rawgId: 5234, genres: "Co-op, Platformer, Adventure", platforms: "PC, PS4, PS5, Xbox, Switch", developer: "Hazelight Studios", publisher: "EA Originals", releaseYear: 2021, estimatedTime: "12h", difficulty: "Baixa", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1426210/library_600x900_2x.jpg" },
  { title: "Cuphead", rawgId: 3604, genres: "Platformer, Indie, Action", platforms: "PC, Switch, PS4, Xbox", developer: "Studio MDHR", publisher: "Studio MDHR", releaseYear: 2017, estimatedTime: "10h", difficulty: "Muito Alta", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/268910/library_600x900_2x.jpg" },
  { title: "Subnautica", rawgId: 3108, genres: "Survival, Adventure, Open World", platforms: "PC, PS4, Xbox, Switch", developer: "Unknown Worlds", publisher: "Unknown Worlds", releaseYear: 2018, estimatedTime: "30h", difficulty: "Média", coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/264710/library_600x900_2x.jpg" },
];

// Stores disponíveis
const storesData = [
  { name: "Steam", sourceKey: "steam" as const },
  { name: "Epic Games", sourceKey: "epic" as const },
  { name: "GOG", sourceKey: "gog" as const },
  { name: "EA App", sourceKey: "ea_app" as const },
  { name: "Ubisoft Connect", sourceKey: "ubisoft_connect" as const },
  { name: "Game Pass", sourceKey: "game_pass" as const },
  { name: "PlayStation Store", sourceKey: "ps_store" as const },
  { name: "Nintendo eShop", sourceKey: "nintendo_eshop" as const },
  { name: "Manual", sourceKey: "manual" as const },
];

// Plataformas disponíveis
const platformsData = [
  { name: "PC", brand: "Various", generation: 1, hexColor: "#4a90d9" },
  { name: "PlayStation 5", brand: "Sony", generation: 9, hexColor: "#003791" },
  { name: "PlayStation 4", brand: "Sony", generation: 8, hexColor: "#003791" },
  { name: "Xbox Series X", brand: "Microsoft", generation: 9, hexColor: "#107c10" },
  { name: "Xbox One", brand: "Microsoft", generation: 8, hexColor: "#107c10" },
  { name: "Nintendo Switch", brand: "Nintendo", generation: 8, hexColor: "#e60012" },
  { name: "Steam Deck", brand: "Valve", generation: 9, hexColor: "#1a9fff" },
];

// Tags comuns
const tagsData = [
  "RPG", "Indie", "Souls-like", "Roguelike", "Metroidvania",
  "Open World", "Story Rich", "Co-op", "Singleplayer", "Multiplayer",
  "Action", "Adventure", "Strategy", "Simulation", "Platformer",
  "Survival", "Horror", "Sci-Fi", "Fantasy", "Post-apocalyptic"
];

// Listas comuns
const listsData = [
  "Favorites",
  "2026 Goal",
  "Co-op Games",
  "Rainy Day Games",
  "Quick Sessions"
];

// Status e prioridades disponíveis
const progressStatuses: ProgressStatus[] = ["not_started", "playing", "paused", "finished", "completed_100", "abandoned"];
const ownershipStatuses: OwnershipStatus[] = ["owned", "subscription", "wishlist", "borrowed"];
const priorities: Priority[] = ["low", "medium", "high"];
const formats: GameFormat[] = ["digital", "physical", "subscription"];

export interface MockDataResult {
  games: Game[];
  libraryEntries: LibraryEntry[];
  stores: Store[];
  libraryEntryStores: LibraryEntryStore[];
  platforms: Platform[];
  gamePlatforms: GamePlatform[];
  playSessions: PlaySession[];
  reviews: Review[];
  tags: Tag[];
  gameTags: GameTag[];
  lists: List[];
  libraryEntryLists: LibraryEntryList[];
  goals: Goal[];
  settings: Setting[];
  savedViews: SavedView[];
  importJobs: ImportJob[];
}

export function generateMockData(): MockDataResult {
  const now = new Date().toISOString();

  // 1. Gerar stores (9 stores)
  const stores: Store[] = storesData.map((store, index) => ({
    id: index + 1,
    uuid: generateUuid(),
    version: 1,
    name: store.name,
    normalizedName: store.name.toLowerCase(),
    sourceKey: store.sourceKey,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(randomInt(0, 30)),
    deletedAt: null,
  }));

  // 2. Gerar platforms (7 platforms)
  const platforms: Platform[] = platformsData.map((platform, index) => ({
    id: index + 1,
    uuid: generateUuid(),
    version: 1,
    name: platform.name,
    normalizedName: platform.name.toLowerCase(),
    brand: platform.brand,
    generation: platform.generation,
    hexColor: platform.hexColor,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(randomInt(0, 30)),
    deletedAt: null,
  }));

  // 3. Gerar tags (20 tags)
  const tags: Tag[] = tagsData.map((tagName, index) => ({
    id: index + 1,
    uuid: generateUuid(),
    version: 1,
    name: tagName,
    createdAt: daysAgo(randomInt(100, 365)),
    updatedAt: daysAgo(randomInt(0, 100)),
    deletedAt: null,
  }));

  // 4. Gerar lists (5 lists)
  const lists: List[] = listsData.map((listName, index) => ({
    id: index + 1,
    uuid: generateUuid(),
    version: 1,
    name: listName,
    createdAt: daysAgo(randomInt(100, 365)),
    updatedAt: daysAgo(randomInt(0, 100)),
    deletedAt: null,
  }));

  // 5. Gerar games (30 jogos)
  const games: Game[] = mockGamesData.map((gameData, index) => ({
    id: index + 1,
    uuid: generateUuid(),
    version: 1,
    title: gameData.title,
    normalizedTitle: gameData.title.toLowerCase().replace(/[^a-z0-9]/g, ""),
    coverUrl: gameData.coverUrl,
    rawgId: gameData.rawgId,
    description: gameData.title + " - " + gameData.genres.split(",")[0] + " game",
    genres: gameData.genres,
    estimatedTime: gameData.estimatedTime,
    difficulty: gameData.difficulty,
    releaseYear: gameData.releaseYear,
    platforms: gameData.platforms,
    developer: gameData.developer,
    publisher: gameData.publisher,
    createdAt: randomDateInRange(365, 180),
    updatedAt: randomDateInRange(180, 0),
    deletedAt: null,
  }));

  // 6. Gerar library entries (30 entries, uma por jogo)
  const libraryEntries: LibraryEntry[] = games.map((game, index) => {
    const status = randomChoice(progressStatuses);
    const isFinished = status === "finished" || status === "completed_100";
    const isPlaying = status === "playing";
    const completionPercent = isFinished ? 100 : isPlaying ? randomInt(10, 95) : randomInt(0, 10);

    return {
      id: index + 1,
      uuid: generateUuid(),
      version: 1,
      gameId: game.id!,
      platform: randomChoice(platformsData).name,
      sourceStore: randomChoice(storesData).name,
      format: randomChoice(formats),
      ownershipStatus: randomChoice(ownershipStatuses),
      progressStatus: status,
      playtimeMinutes: isFinished || isPlaying ? randomInt(300, 5000) : randomInt(0, 120),
      completionPercent,
      priority: randomChoice(priorities),
      personalRating: isFinished ? randomInt(6, 10) : undefined,
      notes: completionPercent >= 100 ? "Zerado!" : undefined,
      startedAt: randomDateInRange(180, 30),
      completionDate: isFinished ? randomDateInRange(60, 0) : undefined,
      lastSessionAt: isPlaying ? randomDateInRange(14, 0) : undefined,
      favorite: Math.random() > 0.7,
      createdAt: randomDateInRange(365, 180),
      updatedAt: randomDateInRange(180, 0),
      deletedAt: null,
    };
  });

  // 7. Gerar gamePlatforms (relações game-platforms)
  const gamePlatforms: GamePlatform[] = [];
  let gpId = 1;
  games.forEach((game) => {
    const gamePlatformNames = game.platforms?.split(",").map((p) => p.trim()) || ["PC"];
    gamePlatformNames.forEach((platformName) => {
      const platform = platforms.find((p) => p.name.toLowerCase() === platformName.toLowerCase());
      if (platform) {
        gamePlatforms.push({
          id: gpId++,
          uuid: generateUuid(),
          version: 1,
          gameId: game.id!,
          platformId: platform.id!,
          createdAt: randomDateInRange(365, 180),
          updatedAt: randomDateInRange(180, 0),
          deletedAt: null,
        });
      }
    });
  });

  // 8. Gerar libraryEntryStores (relações entry-stores)
  const libraryEntryStores: LibraryEntryStore[] = libraryEntries.map((entry, index) => ({
    id: index + 1,
    uuid: generateUuid(),
    version: 1,
    libraryEntryId: entry.id!,
    storeId: stores.find((s) => s.name === entry.sourceStore)?.id || stores[0].id!,
    isPrimary: true,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    deletedAt: null,
  }));

  // 9. Gerar playSessions (80 sessões distribuídas)
  const playSessions: PlaySession[] = [];
  const sessionsPerEntry = Math.floor(80 / libraryEntries.length) + 1;
  let sessionId = 1;

  libraryEntries.forEach((entry) => {
    const numSessions = entry.progressStatus === "playing" || entry.progressStatus === "finished"
      ? sessionsPerEntry + randomInt(0, 5)
      : randomInt(0, 2);

    for (let i = 0; i < numSessions; i++) {
      playSessions.push({
        id: sessionId++,
        uuid: generateUuid(),
        version: 1,
        libraryEntryId: entry.id!,
        date: randomDateInRange(180, 0),
        platform: entry.platform,
        durationMinutes: randomInt(15, 180),
        completionPercent: entry.completionPercent ? Math.max(0, entry.completionPercent - randomInt(0, 20)) : undefined,
        mood: randomChoice(["focused", "relaxed", "frustrated", "excited", "tired"]),
        note: Math.random() > 0.6 ? `Sessão ${i + 1}` : undefined,
        createdAt: randomDateInRange(180, 0),
        updatedAt: randomDateInRange(180, 0),
        deletedAt: null,
      });
    }
  });

  // 10. Gerar reviews (10 reviews para jogos finalizados)
  const reviews: Review[] = [];
  let reviewId = 1;
  libraryEntries
    .filter((entry) => entry.progressStatus === "finished" || entry.progressStatus === "completed_100")
    .slice(0, 10)
    .forEach((entry) => {
      reviews.push({
        id: reviewId++,
        uuid: generateUuid(),
        version: 1,
        libraryEntryId: entry.id!,
        score: entry.personalRating || randomInt(6, 10),
        shortReview: `Jogo incrível! ${randomChoice(["Recomendo muito", "Vale a pena", "Experiência única"])}`,
        longReview: Math.random() > 0.5 ? `Uma obra-prima do gênero. ${entry.completionPercent}% concluído com muito aproveitamento.` : undefined,
        pros: randomChoice(["Gráficos", "História", "Jogabilidade", "Trilha sonora"]),
        cons: Math.random() > 0.5 ? randomChoice(["Dificuldade", "Performance", "Preço"]) : undefined,
        recommend: "yes",
        hasSpoiler: false,
        createdAt: randomDateInRange(90, 0),
        updatedAt: randomDateInRange(90, 0),
        deletedAt: null,
      });
    });

  // 11. Gerar gameTags (relações game-tags)
  const gameTags: GameTag[] = [];
  let gtId = 1;
  libraryEntries.forEach((entry) => {
    const numTags = randomInt(1, 4);
    const usedTagIds = new Set<number>();
    for (let i = 0; i < numTags; i++) {
      let tagId: number;
      do {
        tagId = randomInt(1, tags.length);
      } while (usedTagIds.has(tagId));
      usedTagIds.add(tagId);

      gameTags.push({
        id: gtId++,
        uuid: generateUuid(),
        version: 1,
        libraryEntryId: entry.id!,
        tagId,
        createdAt: randomDateInRange(180, 0),
        updatedAt: randomDateInRange(180, 0),
        deletedAt: null,
      });
    }
  });

  // 12. Gerar libraryEntryLists (relações entry-lists)
  const libraryEntryLists: LibraryEntryList[] = [];
  let lelId = 1;
  libraryEntries.forEach((entry) => {
    if (Math.random() > 0.5) {
      const numLists = randomInt(1, 2);
      const usedListIds = new Set<number>();
      for (let i = 0; i < numLists; i++) {
        let listId: number;
        do {
          listId = randomInt(1, lists.length);
        } while (usedListIds.has(listId));
        usedListIds.add(listId);

        libraryEntryLists.push({
          id: lelId++,
          uuid: generateUuid(),
          version: 1,
          libraryEntryId: entry.id!,
          listId,
          createdAt: randomDateInRange(180, 0),
          updatedAt: randomDateInRange(180, 0),
          deletedAt: null,
        });
      }
    }
  });

  // 13. Gerar goals (4 goals)
  const goals: Goal[] = [
    {
      id: 1,
      uuid: generateUuid(),
      version: 1,
      type: "playtime",
      target: 100,
      current: Math.floor(playSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60),
      period: "yearly",
      createdAt: daysAgo(365),
      updatedAt: daysAgo(randomInt(0, 30)),
      deletedAt: null,
    },
    {
      id: 2,
      uuid: generateUuid(),
      version: 1,
      type: "finished",
      target: 12,
      current: libraryEntries.filter((e) => e.progressStatus === "finished" || e.progressStatus === "completed_100").length,
      period: "yearly",
      createdAt: daysAgo(365),
      updatedAt: daysAgo(randomInt(0, 30)),
      deletedAt: null,
    },
    {
      id: 3,
      uuid: generateUuid(),
      version: 1,
      type: "started",
      target: 24,
      current: libraryEntries.filter((e) => e.progressStatus === "playing").length,
      period: "monthly",
      createdAt: daysAgo(30),
      updatedAt: daysAgo(randomInt(0, 7)),
      deletedAt: null,
    },
    {
      id: 4,
      uuid: generateUuid(),
      version: 1,
      type: "backlog_reduction",
      target: 5,
      current: libraryEntries.filter((e) => e.progressStatus === "not_started").length,
      period: "monthly",
      createdAt: daysAgo(30),
      updatedAt: daysAgo(randomInt(0, 7)),
      deletedAt: null,
    },
  ];

  // 14. Gerar settings (5 settings)
  const settings: Setting[] = [
    { id: 1, key: "skipDefaultSeed", value: "true", updatedAt: now },
    { id: 2, key: "guidedTourCompleted", value: "true", updatedAt: now },
    { id: 3, key: "plannerWeights.playtimeWeight", value: "0.3", updatedAt: now },
    { id: 4, key: "plannerWeights.priorityWeight", value: "0.4", updatedAt: now },
    { id: 5, key: "plannerWeights.moodWeight", value: "0.3", updatedAt: now },
  ];

  // 15. Gerar savedViews (3 views salvas)
  const savedViews: SavedView[] = [
    {
      id: 1,
      uuid: generateUuid(),
      version: 1,
      scope: "library",
      name: "Backlog Alta Prioridade",
      statusFilter: "backlog",
      sortBy: "priority",
      sortDirection: "desc",
      groupBy: "priority",
      createdAt: randomDateInRange(90, 30),
      updatedAt: randomDateInRange(30, 0),
      deletedAt: null,
    },
    {
      id: 2,
      uuid: generateUuid(),
      version: 1,
      scope: "library",
      name: "Jogando Atualmente",
      statusFilter: "playing",
      sortBy: "updatedAt",
      sortDirection: "desc",
      groupBy: "platform",
      createdAt: randomDateInRange(90, 30),
      updatedAt: randomDateInRange(30, 0),
      deletedAt: null,
    },
    {
      id: 3,
      uuid: generateUuid(),
      version: 1,
      scope: "library",
      name: "Zerados 2026",
      statusFilter: "completed",
      sortBy: "completionDate",
      sortDirection: "desc",
      groupBy: "none",
      createdAt: randomDateInRange(90, 30),
      updatedAt: randomDateInRange(30, 0),
      deletedAt: null,
    },
  ];

  // 16. Gerar importJobs (1 job de exemplo)
  const importJobs: ImportJob[] = [
    {
      id: 1,
      uuid: generateUuid(),
      version: 1,
      source: "steam",
      status: "completed",
      totalItems: 15,
      processedItems: 15,
      summary: "15 jogos importados do Steam",
      changes: "12 criados, 3 atualizados",
      createdAt: randomDateInRange(90, 30),
      updatedAt: randomDateInRange(30, 0),
      deletedAt: null,
    },
  ];

  return {
    games,
    libraryEntries,
    stores,
    libraryEntryStores,
    platforms,
    gamePlatforms,
    playSessions,
    reviews,
    tags,
    gameTags,
    lists,
    libraryEntryLists,
    goals,
    settings,
    savedViews,
    importJobs,
  };
}

export default generateMockData;
