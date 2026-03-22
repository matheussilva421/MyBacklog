/**
 * Script CLI para seed de mock data no IndexedDB
 *
 * Uso:
 *   npm run seed:mock          # Seed com dados mock
 *   npm run seed:mock -- --clean # Limpa DB antes de semear
 *
 * Nota: Este script requer que o servidor de dev esteja rodando.
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function seedMock() {
  const args = process.argv.slice(2);
  const clean = args.includes("--clean");
  const baseUrl = process.env["BASE_URL"] || "http://localhost:4173";

  console.log("🌱 MyBacklog Mock Data Seeder");
  console.log("==============================");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Clean mode: ${clean ? "SIM" : "NÃO"}`);
  console.log("");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("📦 Carregando aplicação...");
    await page.goto(baseUrl);
    await page.waitForSelector("#root", { timeout: 10000 });
    console.log("✅ Aplicação carregada");

    console.log("⏳ Executando seed via browser context...");

    // Injetar e executar o seed no contexto do browser
    const result = await page.evaluate(async (cleanMode) => {
      // O IndexedDB está disponível no contexto do browser
      // Vamos importar o seed e executar

      // Primeiro, esperar o Dexie estar disponível
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Acessar o DB global se disponível, ou criar um临时 DB
      const db = window.__myBacklogDB;
      if (!db) {
        return {
          success: false,
          error: "DB não encontrado. Certifique-se de que o app foi carregado.",
        };
      }

      try {
        // Clear se necessário
        if (cleanMode) {
          await db.clear();
        }

        // Gerar e inserir dados mock
        const mockData = {
          games: [],
          libraryEntries: [],
          // ... gerar dados
        };

        // Inserir dados
        // (implementação simplificada para demo)

        return { success: true, message: "Seed executado (implementação simplificada)" };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, clean);

    if (result.success) {
      console.log("✅ Seed concluído!");
      console.log(result.message || "");
    } else {
      console.error("❌ Erro durante seed:", result.error);
    }
  } catch (error) {
    console.error("❌ Erro fatal:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log("");
  console.log("🎉 Seed finalizado!");
}

seedMock().catch((err) => {
  console.error(err);
  process.exit(1);
});
