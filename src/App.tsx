import { Suspense, lazy } from "react";
import { useAuth } from "./contexts/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";

const AppShell = lazy(() => import("./components/AppShell"));

function ModuleFallback({ message }: { message: string }) {
  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-layout">
        <main className="main-column">
          <div className="loading-shell" role="status" aria-live="polite">
            <span className="loading-shell__pulse" aria-hidden="true" />
            <strong>{message}</strong>
            <p>Aguarde enquanto o Arsenal Gamer prepara a próxima camada da interface.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, logout, isAuthEnabled } = useAuth();

  if (loading) {
    return <ModuleFallback message="Autenticando na interface neural..." />;
  }

  if (isAuthEnabled && !user) {
    return <LoginScreen />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<ModuleFallback message="Carregando Arsenal Gamer..." />}>
        <AppShell user={user} logout={logout} isAuthEnabled={isAuthEnabled} />
      </Suspense>
    </ErrorBoundary>
  );
}
