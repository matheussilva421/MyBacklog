import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { NotchButton } from "../components/cyberpunk-ui";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary global para capturar erros de renderização.
 * MED-07: Implementa fallback UI graciosa ao invés de tela branca.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro para diagnóstico
    logger.error("[ErrorBoundary] Erro capturado:", error);
    logger.error("[ErrorBoundary] Stack:", errorInfo.componentStack);

    this.setState({ errorInfo });

    // Em produção, enviar para serviço de telemetria
    if (process.env["NODE_ENV"] === "production") {
      // TODO: Integrar com serviço de error tracking (Sentry, etc.)
      logger.error("[ErrorBoundary] Production error:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Recarregar a página para resetar o estado global
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="app-shell">
          <div className="app-shell__backdrop" aria-hidden="true" />
          <div className="app-layout">
            <main className="main-column">
              <div className="error-boundary-fallback" role="alert" aria-live="assertive">
                <div className="error-boundary-fallback__content">
                  <div className="error-boundary-fallback__icon" aria-hidden="true">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>

                  <h1 className="error-boundary-fallback__title">Ops! Algo deu errado</h1>

                  <p className="error-boundary-fallback__message">
                    O Arsenal Gamer encontrou um erro inesperado. Isso pode ser causado por:
                  </p>

                  <ul className="error-boundary-fallback__causes">
                    <li>Dados corrompidos no banco local</li>
                    <li>Problema de conexão com o sync</li>
                    <li>Erro de renderização de componente</li>
                  </ul>

                  <div className="error-boundary-fallback__actions">
                    <NotchButton variant="primary" onClick={this.handleReset}>
                      Recarregar Aplicação
                    </NotchButton>
                  </div>

                  {this.state.error && (
                    <details className="error-boundary-fallback__details">
                      <summary>Detalhes técnicos (para debug)</summary>
                      <pre className="error-boundary-fallback__stack">
                        <code>
                          {this.state.error.message}
                          {"\n\n"}
                          {this.state.error.stack}
                          {"\n\n"}
                          {this.state.errorInfo?.componentStack}
                        </code>
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
