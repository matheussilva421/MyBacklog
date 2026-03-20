import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { GameModal } from "./backlog-modals";

vi.mock("../modules/import-export/utils/rawg", () => ({
  searchRawgCandidates: vi.fn(async () => [
    {
      rawgId: 109150,
      title: "Cyberpunk 2077",
      releaseYear: 2020,
      coverUrl: "https://example.com/cyberpunk.jpg",
      platforms: ["PC", "PS5"],
      genres: ["RPG", "Open World"],
      score: 100,
    },
  ]),
  fetchRawgMetadata: vi.fn(async () => ({
    rawgId: 109150,
    coverUrl: "https://example.com/cyberpunk.jpg",
    genres: "RPG, Open World",
    releaseYear: 2020,
    platforms: "PC, PS5",
    developer: "CD Projekt RED",
    publisher: "CD Projekt",
    description: "Mercenário em Night City.",
  })),
}));

const baseForm = {
  title: "Cyberpunk",
  platform: "PC",
  catalogPlatforms: "PC",
  sourceStore: "Manual",
  genre: "",
  status: "Backlog" as const,
  priority: "Média" as const,
  progress: "0",
  hours: "0",
  eta: "12h",
  score: "",
  year: "2026",
  mood: "",
  difficulty: "Média",
  coverUrl: "",
  rawgId: "",
  developer: "",
  publisher: "",
  description: "",
  notes: "",
};

describe("GameModal", () => {
  it("searches RAWG and applies metadata to the form", async () => {
    const onChange = vi.fn();

    render(
      <GameModal
        mode="create"
        form={baseForm}
        rawgApiKey="rawg-key"
        onChange={onChange}
        onSubmit={vi.fn(async () => undefined)}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /buscar na rawg/i }));

    await waitFor(() => {
      expect(screen.getByText(/cyberpunk 2077/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /aplicar metadados/i }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("title", "Cyberpunk 2077");
      expect(onChange).toHaveBeenCalledWith("coverUrl", "https://example.com/cyberpunk.jpg");
      expect(onChange).toHaveBeenCalledWith("genre", "RPG, Open World");
      expect(onChange).toHaveBeenCalledWith("developer", "CD Projekt RED");
      expect(onChange).toHaveBeenCalledWith("publisher", "CD Projekt");
      expect(onChange).toHaveBeenCalledWith("description", "Mercenário em Night City.");
    });
  });
});
