import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "../backlog/shared";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("cp-panel", className)}>
      <span className="cp-panel__accent" aria-hidden="true" />
      <span className="cp-panel__glow cp-panel__glow--pink" aria-hidden="true" />
      <span className="cp-panel__glow cp-panel__glow--cyan" aria-hidden="true" />
      <div className="cp-panel__content">{children}</div>
    </section>
  );
}

export function Tag({
  children,
  tone = "yellow",
  className = "",
}: {
  children: ReactNode;
  tone?: "yellow" | "cyan" | "magenta" | "neutral";
  className?: string;
}) {
  return <span className={cx("cp-tag", `cp-tag--${tone}`, className)}>{children}</span>;
}

export function Pill({
  children,
  tone,
  className = "",
}: {
  children: ReactNode;
  tone: string;
  className?: string;
}) {
  return <span className={cx("cp-pill", `cp-pill--${tone}`, className)}>{children}</span>;
}

export function NotchButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={cx("cp-button", `cp-button--${variant}`, className)} {...props}>
      {children}
    </button>
  );
}

export function SidebarItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={cx("sidebar-item", active && "sidebar-item--active")} onClick={onClick}>
      <Icon className="sidebar-item__icon" />
      <span>{label}</span>
    </button>
  );
}

export function ProgressBar({
  value,
  tone = "sunset",
  thin = false,
}: {
  value: number;
  tone?: "sunset" | "cyan" | "yellow" | "violet";
  thin?: boolean;
}) {
  const style = { width: `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;

  return (
    <div className={cx("progress-track", `progress-track--${tone}`, thin && "progress-track--thin")}>
      <span className="progress-track__fill" style={style} />
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <div className="section-header__title">
          <Icon className="section-header__icon" />
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  hint,
  delta,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  delta: string;
  icon: LucideIcon;
}) {
  return (
    <Panel className="metric-card">
      <div className="metric-card__head">
        <Tag className="metric-card__tag">Telemetria</Tag>
        <div className="metric-card__icon">
          <Icon />
        </div>
      </div>
      <p className="metric-card__title">{title}</p>
      <div className="metric-card__value">{value}</div>
      <p className="metric-card__hint">{hint}</p>
      <div className="metric-card__footer">
        <Pill tone="cyan">{delta}</Pill>
      </div>
    </Panel>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}

export function ChartFrame({
  className = "",
  children,
}: {
  className?: string;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = (width: number, height: number) => {
      const nextWidth = Math.max(0, Math.round(width));
      const nextHeight = Math.max(0, Math.round(height));
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    const rect = element.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cx("chart-area", className)}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-shell">
        <Panel className="modal-panel">
          <div className="modal-head">
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <NotchButton variant="ghost" onClick={onClose}>
              Fechar
            </NotchButton>
          </div>
          {children}
        </Panel>
      </div>
    </div>
  );
}
