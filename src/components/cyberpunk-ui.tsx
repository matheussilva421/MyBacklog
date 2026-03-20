import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "../backlog/shared";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

let scrollLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousRootOverflow = "";
const modalStack: string[] = [];

function lockDocumentScroll() {
  if (typeof document === "undefined") return () => undefined;

  const { body, documentElement } = document;
  if (scrollLockCount === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    previousRootOverflow = documentElement.style.overflow;

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount > 0 || typeof document === "undefined") return;

    const { body, documentElement } = document;
    body.style.overflow = previousBodyOverflow;
    body.style.paddingRight = previousBodyPaddingRight;
    documentElement.style.overflow = previousRootOverflow;
  };
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && !element.hidden && element.getAttribute("aria-hidden") !== "true",
  );
}

export function useDocumentScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    return lockDocumentScroll();
  }, [active]);
}

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
  highlighted = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx("sidebar-item", active && "sidebar-item--active", highlighted && "tour-focus")}
      onClick={onClick}
    >
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
      <span className="empty-state__eyebrow">Sem dados</span>
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
      {size.width > 0 && size.height > 0 ? (
        children(size)
      ) : (
        <div className="chart-area__placeholder" aria-hidden="true">
          <span className="chart-area__pulse" />
          <span>Inicializando gráfico...</span>
        </div>
      )}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  closeDisabled = false,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  const modalId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useDocumentScrollLock(true);

  useEffect(() => {
    if (typeof document === "undefined") return;

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(modalId);

    const focusInitialElement = () => {
      if (modalStack[modalStack.length - 1] !== modalId) return;
      const root = modalRef.current;
      if (!root) return;

      const focusable = getFocusableElements(root);
      const nextTarget =
        root.querySelector<HTMLElement>("[data-autofocus]") ??
        root.querySelector<HTMLElement>("[autofocus]") ??
        focusable[0] ??
        root;
      nextTarget.focus({ preventScroll: true });
    };
    focusInitialElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== modalId) return;

      if (event.key === "Escape") {
        if (closeDisabled) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const root = modalRef.current;
      if (!root) return;

      const focusable = getFocusableElements(root);
      if (focusable.length === 0) {
        event.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (activeElement === first || !activeElement || !root.contains(activeElement)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
        return;
      }

      if (activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const stackIndex = modalStack.lastIndexOf(modalId);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      if (previousActiveElementRef.current?.isConnected) {
        previousActiveElementRef.current.focus({ preventScroll: true });
      }
    };
  }, [closeDisabled, modalId, onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (closeDisabled) return;
        if (modalStack[modalStack.length - 1] !== modalId) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="modal-shell" role="document" tabIndex={-1}>
        <Panel className="modal-panel">
          <div className="modal-head">
            <div>
              <h3 id={titleId}>{title}</h3>
              <p id={descriptionId}>{description}</p>
            </div>
            <NotchButton type="button" variant="ghost" onClick={onClose} disabled={closeDisabled}>
              Fechar
            </NotchButton>
          </div>
          {children}
        </Panel>
      </div>
    </div>
  );
}
