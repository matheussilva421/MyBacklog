import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

const useAuthMock = vi.fn();

vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("./components/LoginScreen", () => ({
  LoginScreen: () => <div>login-screen</div>,
}));

vi.mock("./components/AppShell", () => ({
  default: () => <div>app-shell-screen</div>,
}));

function createAuthState(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    loading: false,
    isAuthEnabled: false,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    ...overrides,
  };
}

describe("App", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue(createAuthState());
  });

  it("shows the auth loading fallback", () => {
    useAuthMock.mockReturnValue(createAuthState({ loading: true }));

    render(<App />);

    expect(screen.getByText("Autenticando na interface neural...")).toBeInTheDocument();
  });

  it("renders login when cloud auth is enabled and there is no user", () => {
    useAuthMock.mockReturnValue(createAuthState({ isAuthEnabled: true, user: null }));

    render(<App />);

    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("renders the lazy shell when auth is not blocking the app", async () => {
    useAuthMock.mockReturnValue(createAuthState({ user: { uid: "local-user" } }));

    render(<App />);

    expect(await screen.findByText("app-shell-screen")).toBeInTheDocument();
  });
});
