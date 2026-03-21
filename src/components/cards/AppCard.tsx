import { cx } from "../../backlog/shared";
import type { ReactNode } from "react";
import React from "react";

export type AppCardType =
  | "informative"
  | "interactive"
  | "statistic"
  | "status"
  | "selection"
  | "action"
  | "analytic"
  | "history";

export type AppCardDensity = "normal" | "compact" | "relaxed";

export type AppCardTone = "default" | "cyan" | "yellow" | "magenta" | "emerald" | "orange" | "violet";

export interface AppCardProps {
  /** Tipo funcional do card (afeta semântica e alguns estilos) */
  type?: AppCardType;

  /** Densidade de spacing (normal=16px, compact=12px, relaxed=14px) */
  density?: AppCardDensity;

  /** Tom de ênfase (aplica border/color específico) */
  tone?: AppCardTone;

  /** Estado de selecionado (border cyan) */
  selected?: boolean;

  /** Estado ativo/atuando (border yellow) */
  active?: boolean;

  /** Estado travado/bloqueado (opacity reduzida) */
  locked?: boolean;

  /** Estado desabilitado (pointer-events none) */
  disabled?: boolean;

  /** Conteúdo do card */
  children: ReactNode;

  /** Classe CSS adicional */
  className?: string;

  /** Handler de click (automaticamente torna interativo) */
  onClick?: () => void;

  /** Elemento HTML a ser renderizado (padrão: div) */
  as?: "div" | "article" | "section" | "button";
}

/**
 * AppCard - Componente base para cards do sistema
 *
 * Usa a classe CSS `.app-card` como base com modificadores
 * para estados e variações.
 *
 * @example
 * // Card informativo básico
 * <AppCard>Conteúdo do card</AppCard>
 *
 * @example
 * // Card interativo selecionável
 * <AppCard
 *   type="interactive"
 *   selected={isSelected}
 *   onClick={handleClick}
 * >
 *   Conteúdo clicável
 * </AppCard>
 *
 * @example
 * // Card compacto com tom de ênfase
 * <AppCard density="compact" tone="cyan">
 *   Conteúdo compacto
 * </AppCard>
 */
export const AppCard = React.memo(function AppCard({
  type = "informative",
  density = "normal",
  tone,
  selected = false,
  active = false,
  locked = false,
  disabled = false,
  children,
  className = "",
  onClick,
  as = "div",
}: AppCardProps) {
  const Component = as;

  const classes = cx(
    "app-card",
    `app-card--${type}`,
    `app-card--${density}`,
    tone && tone !== "default" && `app-card--${tone}`,
    selected && "app-card--selected",
    active && "app-card--active",
    locked && "app-card--locked",
    disabled && "app-card--disabled",
    onClick && "app-card--interactive",
    className,
  );

  const handleClick = onClick || undefined;

  return (
    <Component className={classes} onClick={handleClick}>
      {children}
    </Component>
  );
});

/**
 * Subcomponente para cabeçalho de card
 */
export function AppCardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("app-card__head", className)}>{children}</div>;
}

/**
 * Subcomponente para título de card
 */
export function AppCardTitle({
  children,
  className = "",
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cx("app-card__title", className)}>
      {icon}
      <h3>{children}</h3>
    </div>
  );
}

/**
 * Subcomponente para corpo/conteúdo principal do card
 */
export function AppCardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("app-card__body", className)}>{children}</div>;
}

/**
 * Subcomponente para rodapé/metadados do card
 */
export function AppCardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("app-card__footer", className)}>{children}</div>;
}

/**
 * Subcomponente para ações do card (botões)
 */
export function AppCardActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("app-card__actions", className)}>{children}</div>;
}
