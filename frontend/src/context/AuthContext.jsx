import { createContext, useCallback, useContext, useEffect, useState } from "react";

import * as authService from "../services/authService";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  /**
   * Three states, not a boolean — this is the load-bearing detail.
   *
   * The session lives in an httpOnly cookie, so JavaScript cannot read it and
   * there is no synchronous way to know whether we are signed in. Finding out
   * requires a request to /auth/me, which takes time.
   *
   * If "not yet known" were collapsed into "anonymous", then every hard refresh
   * on a protected page would redirect a signed-in cashier to /login before the
   * probe came back. "loading" exists so ProtectedRoute can wait instead of
   * guessing.
   */
  const [status, setStatus] = useState("loading"); // loading | authenticated | anonymous

  /** Ask the server who we are. Used on mount and after an external change. */
  const refresh = useCallback(async () => {
    try {
      const current = await authService.me();
      setUser(current);
      setStatus("authenticated");
      return current;
    } catch {
      // A 401 here is the normal case for a visitor who is not signed in.
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const current = await authService.me();
        if (!cancelled) {
          setUser(current);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setStatus("anonymous");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Sign in and adopt the returned user. Throws the classified error on failure
   *  so the login form can render a specific message. */
  const login = useCallback(async (credentials) => {
    // No second /auth/me round trip — the login response already carries the user.
    const signedIn = await authService.login(credentials);
    setUser(signedIn);
    setStatus("authenticated");
    return signedIn;
  }, []);

  const register = useCallback((details) => authService.register(details), []);

  /**
   * Sign out. The local state is cleared even if the request fails, because the
   * user's intent was to end the session; leaving the UI "signed in" after a
   * failed logout is worse than optimistically clearing it.
   *
   * Clearing the cart belongs to whoever calls this (the header), not here:
   * AuthProvider sits outside CartProvider and cannot reach the cart.
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = {
    user,
    status,
    isAuthenticated: status === "authenticated",
    isAdmin: user?.role === "admin",
    login,
    logout,
    register,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export default AuthContext;
