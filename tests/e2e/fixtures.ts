/**
 * Fixtures compartilhadas para testes E2E do MyBacklog
 */

import { test as base, expect } from "@playwright/test";
import type { MockDataResult } from "../src/core/mockDataGenerator";

// Tipo para o fixture de seed
type SeedFixture = {
  mockData: MockDataResult;
  seedMockData: () => Promise<MockDataResult>;
  clearDatabase: () => Promise<void>;
};

// Fixture base com seed de dados
export const test = base.extend<SeedFixture>({
  mockData: async ({}, use) => {
    // Setup: gerar dados mock
    const { generateMockData } = await import("../src/core/mockDataGenerator");
    const mockData = generateMockData();

    await use(mockData);
  },

  seedMockData: async ({ page }, use) => {
    const seedFunction = async () => {
      const { seedMockData } = await import("../src/core/mockDataSeeder");
      return await seedMockData({ clean: true });
    };

    await use(seedFunction);
  },

  clearDatabase: async ({ page }, use) => {
    const clearFunction = async () => {
      await page.evaluate(async () => {
        const { clearAllData } = await import("../src/core/mockDataSeeder");
        await clearAllData();
      });
    };

    await use(clearFunction);
  },
});

// Re-exportar expect
export { expect };

// Helper para navegar para uma tela
export async function navigateToScreen(page: typeof base.prototype.page, screen: string) {
  const navItem = page.getByTestId(`nav-${screen}`);
  if (await navItem.isVisible()) {
    await navItem.click();
  } else {
    // Fallback: navegação direta por URL
    const urlMap: Record<string, string> = {
      dashboard: "/",
      library: "/library",
      planner: "/planner",
      sessions: "/sessions",
      stats: "/stats",
      profile: "/profile",
    };
    await page.goto(urlMap[screen] || "/");
  }
}

// Helper para aguardar carregamento da aplicação
export async function waitForAppLoad(page: typeof base.prototype.page) {
  await page.waitForSelector("#root", { timeout: 10000 });
  // Aguardar algum conteúdo específico carregar
  await page.waitForTimeout(1000); // Dar tempo para React hydrate
}

// Helper para verificar erros de console
export function setupConsoleErrorHandling(page: typeof base.prototype.page, testName: string) {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    errors.push(`[Page Error] ${error.message}`);
  });

  return {
    expectNoErrors: () => {
      if (errors.length > 0) {
        console.error(`Errors in ${testName}:`, errors);
      }
      expect(errors).toHaveLength(0);
    },
  };
}

export default test;
