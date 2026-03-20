import { useState } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Panel, NotchButton, SectionHeader } from "./cyberpunk-ui";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code);
}

export function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      setError(getErrorMessage(error, "Erro ao conectar."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      if (getErrorCode(error) !== "auth/popup-closed-by-user") {
        setError(getErrorMessage(error, "Erro ao conectar com Google."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div
        className="app-layout"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
      >
        <div style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}>
          <Panel className="auth-panel">
            <SectionHeader
              icon={Zap}
              title={isRegistering ? "Novo Cadastro" : "Acesso ao Sistema"}
              description="Autenticação Neural Obrigatória"
            />

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}
            >
              {error ? (
                <div
                  style={{
                    color: "#ff4d4f",
                    fontSize: "0.875rem",
                    padding: "0.5rem",
                    border: "1px solid #ff4d4f",
                    borderRadius: "4px",
                  }}
                >
                  {error}
                </div>
              ) : null}

              <label className="form-field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="username"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--c-surface-sunlight)",
                    border: "1px solid var(--c-surface-border)",
                    color: "var(--c-text-primary)",
                  }}
                />
              </label>

              <label className="form-field">
                <span>Senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--c-surface-sunlight)",
                    border: "1px solid var(--c-surface-border)",
                    color: "var(--c-text-primary)",
                  }}
                />
              </label>

              <NotchButton variant="primary" type="submit" disabled={isLoading} style={{ marginTop: "1rem" }}>
                {isLoading ? "Processando..." : isRegistering ? "Cadastrar" : "Entrar"}
              </NotchButton>

              <NotchButton
                variant="ghost"
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{ alignSelf: "center" }}
              >
                {isRegistering ? "Já tenho uma conta" : "Criar uma conta nova"}
              </NotchButton>

              <div style={{ display: "flex", alignItems: "center", margin: "0.5rem 0" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--c-surface-border)" }} />
                <span
                  style={{
                    padding: "0 1rem",
                    fontSize: "0.75rem",
                    color: "var(--c-text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  OU
                </span>
                <div style={{ flex: 1, height: "1px", background: "var(--c-surface-border)" }} />
              </div>

              <NotchButton
                variant="ghost"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                Entrar com o Google
              </NotchButton>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
