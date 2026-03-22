/**
 * Seeder de Mock Data para MyBacklog
 *
 * Popula o IndexedDB com dados mock gerados pelo mockDataGenerator.
 * Pode ser usado no browser ou em testes E2E.
 */

import { db } from "./db";
import generateMockData from "./mockDataGenerator";
import type { MockDataResult } from "./mockDataGenerator";

export interface SeedOptions {
  clean?: boolean; // Se true, limpa o DB antes de semear
  onProgress?: (step: string) => void; // Callback para progresso
}

export async function seedMockData(options: SeedOptions = {}): Promise<MockDataResult> {
  const { clean = true, onProgress } = options;

  try {
    if (onProgress) onProgress("Gerando dados mock...");

    const mockData = generateMockData();

    if (clean) {
      if (onProgress) onProgress("Limpando banco de dados...");

      await db.transaction(
        "rw",
        [
          db.pendingMutations,
          db.games,
          db.libraryEntries,
          db.stores,
          db.libraryEntryStores,
          db.platforms,
          db.gamePlatforms,
          db.playSessions,
          db.reviews,
          db.tags,
          db.gameTags,
          db.lists,
          db.libraryEntryLists,
          db.goals,
          db.settings,
          db.savedViews,
          db.importJobs,
        ],
        async () => {
          await db.games.clear();
          await db.libraryEntries.clear();
          await db.stores.clear();
          await db.libraryEntryStores.clear();
          await db.platforms.clear();
          await db.gamePlatforms.clear();
          await db.playSessions.clear();
          await db.reviews.clear();
          await db.tags.clear();
          await db.gameTags.clear();
          await db.lists.clear();
          await db.libraryEntryLists.clear();
          await db.goals.clear();
          await db.settings.clear();
          await db.savedViews.clear();
          await db.importJobs.clear();
          await db.pendingMutations.clear();
        }
      );
    }

    if (onProgress) onProgress("Inserindo dados nas tabelas...");

    // Inserir dados em ordem de dependência
    await db.transaction(
      "rw",
      [
        db.pendingMutations,
        db.settings,
        db.stores,
        db.platforms,
        db.games,
        db.libraryEntries,
        db.libraryEntryStores,
        db.gamePlatforms,
        db.tags,
        db.gameTags,
        db.lists,
        db.libraryEntryLists,
        db.playSessions,
        db.reviews,
        db.goals,
        db.savedViews,
        db.importJobs,
      ],
      async () => {
        // Settings primeiro (sem dependências)
        await db.settings.bulkPut(mockData.settings);

        // Stores e Platforms (entidades independentes)
        await db.stores.bulkPut(mockData.stores);
        await db.platforms.bulkPut(mockData.platforms);

        // Games (independentes, mas referenciados por outros)
        await db.games.bulkPut(mockData.games);

        // Library Entries (referenciam games)
        await db.libraryEntries.bulkPut(mockData.libraryEntries);

        // Relações que dependem de library entries
        await db.libraryEntryStores.bulkPut(mockData.libraryEntryStores);
        await db.gamePlatforms.bulkPut(mockData.gamePlatforms);

        // Tags e relações
        await db.tags.bulkPut(mockData.tags);
        await db.gameTags.bulkPut(mockData.gameTags);

        // Lists e relações
        await db.lists.bulkPut(mockData.lists);
        await db.libraryEntryLists.bulkPut(mockData.libraryEntryLists);

        // Dados derivados
        await db.playSessions.bulkPut(mockData.playSessions);
        await db.reviews.bulkPut(mockData.reviews);

        // Goals, saved views, import jobs
        await db.goals.bulkPut(mockData.goals);
        await db.savedViews.bulkPut(mockData.savedViews);
        await db.importJobs.bulkPut(mockData.importJobs);
      }
    );

    if (onProgress) onProgress("Seed concluído com sucesso!");

    // Log para debug (não usado em produção)
    const logInfo = {
      games: mockData.games.length,
      libraryEntries: mockData.libraryEntries.length,
      stores: mockData.stores.length,
      platforms: mockData.platforms.length,
      playSessions: mockData.playSessions.length,
      tags: mockData.tags.length,
      lists: mockData.lists.length,
      goals: mockData.goals.length,
    };
    // eslint-disable-next-line no-console
    console.debug("[MockDataSeeder] Dados inseridos:", logInfo);

    return mockData;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao semear dados mock: ${detail}`);
  }
}

/**
 * Limpa todos os dados do banco (exceto settings críticos)
 */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.pendingMutations,
      db.games,
      db.libraryEntries,
      db.stores,
      db.libraryEntryStores,
      db.platforms,
      db.gamePlatforms,
      db.playSessions,
      db.reviews,
      db.tags,
      db.gameTags,
      db.lists,
      db.libraryEntryLists,
      db.goals,
      db.savedViews,
      db.importJobs,
    ],
    async () => {
      await db.games.clear();
      await db.libraryEntries.clear();
      await db.stores.clear();
      await db.libraryEntryStores.clear();
      await db.platforms.clear();
      await db.gamePlatforms.clear();
      await db.playSessions.clear();
      await db.reviews.clear();
      await db.tags.clear();
      await db.gameTags.clear();
      await db.lists.clear();
      await db.libraryEntryLists.clear();
      await db.goals.clear();
      await db.savedViews.clear();
      await db.importJobs.clear();
      await db.pendingMutations.clear();
    }
  );
}

export default seedMockData;
