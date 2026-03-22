/**
 * Página de Seed de Mock Data (apenas para desenvolvimento)
 *
 * Para usar: navegue para /seed em desenvolvimento e clique em "Seed Database"
 */

import { useState } from "react";

export function SeedPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const handleSeed = async () => {
    setStatus("loading");
    setMessage("");

    try {
      // Importar dinamicamente para evitar bundle size em prod
      const { seedMockData } = await import("../core/mockDataSeeder");

      const result = await seedMockData({ clean: true });

      setCounts({
        games: result.games.length,
        libraryEntries: result.libraryEntries.length,
        stores: result.stores.length,
        platforms: result.platforms.length,
        playSessions: result.playSessions.length,
        tags: result.tags.length,
        lists: result.lists.length,
        goals: result.goals.length,
      });

      setStatus("success");
      setMessage("Seed concluído com sucesso!");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleClear = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const { clearAllData } = await import("../core/mockDataSeeder");
      await clearAllData();

      setStatus("success");
      setMessage("Database limpo!");
      setCounts(null);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Mock Data Seeder</h1>
      <p style={{ color: "#666" }}>
        Esta página é apenas para desenvolvimento. Ela popula o banco de dados com dados mock
        para testes.
      </p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
        <button
          onClick={handleSeed}
          disabled={status === "loading"}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: status === "loading" ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: status === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {status === "loading" ? "Seedando..." : "Seed Database"}
        </button>

        <button
          onClick={handleClear}
          disabled={status === "loading"}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: status === "loading" ? "#ccc" : "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: status === "loading" ? "not-allowed" : "pointer",
          }}
        >
          Clear Database
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: "4px",
            backgroundColor: status === "success" ? "#d4edda" : status === "error" ? "#f8d7da" : "#e2e3e5",
            color: status === "success" ? "#155724" : status === "error" ? "#721c24" : "#383d41",
          }}
        >
          {message}
        </div>
      )}

      {counts && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Registros inseridos:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>📦 Games: {counts.games}</li>
            <li>📚 Library Entries: {counts.libraryEntries}</li>
            <li>🏪 Stores: {counts.stores}</li>
            <li>🎮 Platforms: {counts.platforms}</li>
            <li>⏱️ Play Sessions: {counts.playSessions}</li>
            <li>🏷️ Tags: {counts.tags}</li>
            <li>📝 Lists: {counts.lists}</li>
            <li>🎯 Goals: {counts.goals}</li>
          </ul>
        </div>
      )}

      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "4px" }}>
        <strong>⚠️ Atenção:</strong> Isso substituirá todos os dados existentes no seu banco de dados local.
      </div>
    </div>
  );
}

export default SeedPage;
