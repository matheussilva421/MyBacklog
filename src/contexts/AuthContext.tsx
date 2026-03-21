import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const disabledAuthMessage =
  "Autenticacao em nuvem indisponivel. Configure as variaveis VITE_FIREBASE_* para habilitar login e sincronizacao.";

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthEnabled: false,
  login: async () => {
    throw new Error(disabledAuthMessage);
  },
  register: async () => {
    throw new Error(disabledAuthMessage);
  },
  logout: async () => {
    throw new Error(disabledAuthMessage);
  },
  loginWithGoogle: async () => {
    throw new Error(disabledAuthMessage);
  },
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error(disabledAuthMessage);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    if (!auth) throw new Error(disabledAuthMessage);
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error(disabledAuthMessage);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthEnabled: isFirebaseConfigured,
        login,
        register,
        logout,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
