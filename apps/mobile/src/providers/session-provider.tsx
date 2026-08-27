import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/auth-api";
import type { AuthAccount, AuthResponse, AuthSession } from "@/types/member";

const STORAGE_KEY = "hoopkit.auth.session.v1";
type StoredAuth = { account: AuthAccount; session: AuthSession };
type SessionContextValue = {
  account: AuthAccount | null;
  session: AuthSession | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<boolean>;
  logout(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [loading, setLoading] = useState(true);

  const acceptResponse = useCallback(async (response: AuthResponse) => {
    if (!response.user || !response.session) return false;
    const next = { account: response.user, session: response.session };
    setAuth(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  }, []);

  useEffect(() => {
    void restore();
    async function restore() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw) as StoredAuth;
        const shouldRefresh =
          !stored.session.expiresAt ||
          stored.session.expiresAt * 1000 < Date.now() + 60_000;
        if (!shouldRefresh) {
          setAuth(stored);
          return;
        }
        await acceptResponse(
          await authApi.refreshSession(stored.session.refreshToken),
        );
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    }
  }, [acceptResponse]);

  const login = useCallback(
    async (email: string, password: string) => {
      const accepted = await acceptResponse(
        await authApi.login(email.trim(), password),
      );
      if (!accepted) throw new Error("登入沒有取得有效 session。");
    },
    [acceptResponse],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      return acceptResponse(
        await authApi.register(email.trim(), password, displayName.trim()),
      );
    },
    [acceptResponse],
  );

  const logout = useCallback(async () => {
    setAuth(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      account: auth?.account ?? null,
      session: auth?.session ?? null,
      loading,
      login,
      register,
      logout,
    }),
    [auth, loading, login, logout, register],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value)
    throw new Error("useSession must be used inside SessionProvider.");
  return value;
}
