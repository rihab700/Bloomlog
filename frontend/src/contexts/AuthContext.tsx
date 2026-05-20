import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TokenResponse, UserPublic } from "../types";
import { loginUser, registerUser, fetchCurrentUser } from "../api";

interface AuthContextState {
  user: UserPublic | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

const storageKey = "bloomlog_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    fetchCurrentUser(token)
      .then((userData) => setUser(userData))
      .catch(() => {
        setToken(null);
        localStorage.removeItem(storageKey);
        setUser(null);
      });
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      login: async (email: string, password: string) => {
        const data = await loginUser(email, password);
        localStorage.setItem(storageKey, data.access_token);
        setToken(data.access_token);
        setUser(await fetchCurrentUser(data.access_token));
      },
      signup: async (email: string, password: string, fullName?: string) => {
        await registerUser(email, password, fullName);
      },
      logout: () => {
        localStorage.removeItem(storageKey);
        setToken(null);
        setUser(null);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
