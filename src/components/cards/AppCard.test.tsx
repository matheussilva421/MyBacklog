import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardBody, AppCardFooter, AppCardActions } from "./AppCard";

describe("AppCard", () => {
  describe("renderização básica", () => {
    it("renderiza um card com classe base app-card", () => {
      render(<AppCard>Conteúdo</AppCard>);
      const card = screen.getByText("Conteúdo");
      expect(card).toHaveClass("app-card");
    });

    it("renderiza com tipo informative por padrão", () => {
      render(<AppCard>Conteúdo</AppCard>);
      const card = screen.getByText("Conteúdo");
      expect(card).toHaveClass("app-card--informative");
    });

    it("renderiza com densidade normal por padrão", () => {
      render(<AppCard>Conteúdo</AppCard>);
      const card = screen.getByText("Conteúdo");
      expect(card).toHaveClass("app-card--normal");
    });
  });

  describe("propriedades de estado", () => {
    it("aplica classe selected quando selected=true", () => {
      render(<AppCard selected>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--selected");
    });

    it("aplica classe active quando active=true", () => {
      render(<AppCard active>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--active");
    });

    it("aplica classe locked quando locked=true", () => {
      render(<AppCard locked>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--locked");
    });

    it("aplica classe disabled quando disabled=true", () => {
      render(<AppCard disabled>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--disabled");
    });
  });

  describe("densidade", () => {
    it("aplica classe compact quando density='compact'", () => {
      render(<AppCard density="compact">Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--compact");
    });

    it("aplica classe relaxed quando density='relaxed'", () => {
      render(<AppCard density="relaxed">Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--relaxed");
    });
  });

  describe("tons", () => {
    it("aplica classe tone quando tone é especificado", () => {
      const tones: Array<"cyan" | "yellow" | "magenta" | "emerald" | "orange" | "violet"> = [
        "cyan",
        "yellow",
        "magenta",
        "emerald",
        "orange",
        "violet",
      ];

      tones.forEach((tone) => {
        const { container, unmount } = render(<AppCard tone={tone}>Conteúdo {tone}</AppCard>);
        expect(container.firstChild).toHaveClass(`app-card--${tone}`);
        unmount();
      });
    });

    it("não aplica classe de tone quando tone='default'", () => {
      render(<AppCard tone="default">Conteúdo</AppCard>);
      const card = screen.getByText("Conteúdo");
      expect(card).not.toHaveClass("app-card--default");
    });
  });

  describe("interatividade", () => {
    it("aplica classe interactive quando onClick é fornecido", () => {
      render(<AppCard onClick={() => {}}>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).toHaveClass("app-card--interactive");
    });

    it("não aplica classe interactive quando onClick não é fornecido", () => {
      render(<AppCard>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo")).not.toHaveClass("app-card--interactive");
    });

    it("chama onClick quando clicado", () => {
      const handleClick = vi.fn();
      render(<AppCard onClick={handleClick}>Conteúdo</AppCard>);
      screen.getByText("Conteúdo").click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("elemento HTML", () => {
    it("renderiza como div por padrão", () => {
      render(<AppCard>Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo").tagName).toBe("DIV");
    });

    it("renderiza como article quando as='article'", () => {
      render(<AppCard as="article">Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo").tagName).toBe("ARTICLE");
    });

    it("renderiza como button quando as='button'", () => {
      render(<AppCard as="button">Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo").tagName).toBe("BUTTON");
    });

    it("renderiza como section quando as='section'", () => {
      render(<AppCard as="section">Conteúdo</AppCard>);
      expect(screen.getByText("Conteúdo").tagName).toBe("SECTION");
    });
  });

  describe("subcomponentes", () => {
    it("renderiza AppCardHeader com classe app-card__head", () => {
      render(<AppCardHeader>Cabeçalho</AppCardHeader>);
      expect(screen.getByText("Cabeçalho")).toHaveClass("app-card__head");
    });

    it("renderiza AppCardTitle com classe app-card__title e h3", () => {
      render(<AppCardTitle>Título</AppCardTitle>);
      const titleContainer = screen.getByText("Título").closest(".app-card__title");
      expect(titleContainer).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Título");
    });

    it("renderiza AppCardTitle com ícone quando fornecido", () => {
      render(<AppCardTitle icon={<span data-testid="icon">📌</span>}>Título</AppCardTitle>);
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("renderiza AppCardBody com classe app-card__body", () => {
      render(<AppCardBody>Corpo</AppCardBody>);
      expect(screen.getByText("Corpo")).toHaveClass("app-card__body");
    });

    it("renderiza AppCardFooter com classe app-card__footer", () => {
      render(<AppCardFooter>Rodapé</AppCardFooter>);
      expect(screen.getByText("Rodapé")).toHaveClass("app-card__footer");
    });

    it("renderiza AppCardActions com classe app-card__actions", () => {
      render(<AppCardActions>Ações</AppCardActions>);
      expect(screen.getByText("Ações")).toHaveClass("app-card__actions");
    });
  });

  describe("className personalizada", () => {
    it("aplica className personalizada junto com classes base", () => {
      render(<AppCard className="custom-class">Conteúdo</AppCard>);
      const card = screen.getByText("Conteúdo");
      expect(card).toHaveClass("app-card");
      expect(card).toHaveClass("custom-class");
    });
  });
});
