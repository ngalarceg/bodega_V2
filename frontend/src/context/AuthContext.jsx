import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';

const STORAGE_KEY = 'bodega.auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          setToken(parsed.token);
          setUser(parsed.user);
        }
      }
    } catch (error) {
      console.error('No se pudo leer la sesión almacenada', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken && nextUser) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token: nextToken, user: nextUser })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      setToken(response.token);
      setUser(response.user);
      persistSession(response.token, response.user);
      return response.user;
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    persistSession(null, null);
  }, [persistSession]);

  const hasRole = useCallback(
    (...roles) => {
      if (!user) {
        return false;
      }
      return roles.includes(user.role);
    },
    [user]
  );

  const request = useCallback(
    (path, options = {}) =>
      apiRequest(path, {
        ...options,
        token,
      }),
    [token]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
      hasRole,
      request,
      setUser,
    }),
    [token, user, loading, login, logout, hasRole, request]
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
