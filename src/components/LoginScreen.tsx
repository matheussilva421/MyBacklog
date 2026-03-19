import { useState } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Panel, NotchButton, SectionHeader } from "./cyberpunk-ui";

export function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || "Erro ao conectar com Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
          <Panel className="auth-panel">
            <SectionHeader
              icon={Zap}
            title={isRegistering ? "Novo Cadastro" : "Acesso ao Sistema"}
            description="Autenticação Neural Obrigatória"
          />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {error && (
              <div style={{ color: '#ff4d4f', fontSize: '0.875rem', padding: '0.5rem', border: '1px solid #ff4d4f', borderRadius: '4px' }}>
                {error}
              </div>
            )}

            <label className="form-field">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', background: 'var(--c-surface-sunlight)', border: '1px solid var(--c-surface-border)', color: 'var(--c-text-primary)' }}
              />
            </label>

            <label className="form-field">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', background: 'var(--c-surface-sunlight)', border: '1px solid var(--c-surface-border)', color: 'var(--c-text-primary)' }}
              />
            </label>

            <NotchButton variant="primary" type="submit" disabled={isLoading} style={{ marginTop: '1rem' }}>
              {isLoading ? "Processando..." : (isRegistering ? "Cadastrar" : "Entrar")}
            </NotchButton>

            <NotchButton 
              variant="ghost" 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ alignSelf: 'center' }}
            >
              {isRegistering ? "Já tenho uma conta" : "Criar uma conta nova"}
            </NotchButton>

            <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--c-surface-border)' }} />
              <span style={{ padding: '0 1rem', fontSize: '0.75rem', color: 'var(--c-text-muted)', fontFamily: 'var(--font-mono)' }}>OU</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--c-surface-border)' }} />
            </div>

            <NotchButton 
              variant="ghost" 
              type="button" 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{ width: '100%', borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(255,255,255,0.05)' }}
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
