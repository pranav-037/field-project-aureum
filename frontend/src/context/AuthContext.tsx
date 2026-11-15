import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AUTH_INVALID_EVENT, clearStoredAuth } from '../utils/authEvents';
import {
  CLOCK_SKEW_MS,
  validateAuthSession,
} from '../utils/tokenValidator';
import type {
  AuthAuthorization,
  ValidatedAuthUser,
} from '../utils/tokenValidator';

export type User = ValidatedAuthUser;

export interface Institution extends Record<string, unknown> {
  id?: string;
  name: string;
  jurisdiction?: string;
  registrationNumber?: string;
  walletAddress?: string;
  status?: string;
  type?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  authorization: AuthAuthorization | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: unknown) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authorization, setAuthorization] = useState<AuthAuthorization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthorization(null);
    clearStoredAuth();
  }, []);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('aureum_token') || localStorage.getItem('token');
      const storedUser = localStorage.getItem('aureum_user') || localStorage.getItem('user');

      if (storedToken && storedUser) {
        const result = validateAuthSession(storedToken, JSON.parse(storedUser) as unknown);
        if (result.success) {
          setToken(storedToken);
          setUser(result.session.user);
          setAuthorization(result.session.authorization);
        } else {
          clearStoredAuth();
        }
      } else if (storedToken || storedUser) {
        clearStoredAuth();
      }
    } catch (error) {
      console.error('Failed to restore auth data from localStorage:', error);
      clearStoredAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleInvalidAuth = () => logout();
    window.addEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
    return () => window.removeEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
  }, [logout]);

  useEffect(() => {
    if (!authorization) return;

    let timeout: number | undefined;
    const checkExpiration = () => {
      const expiresIn = authorization.exp * 1000 - Date.now() - CLOCK_SKEW_MS;
      if (expiresIn <= 0) {
        logout();
        return;
      }
      timeout = window.setTimeout(checkExpiration, Math.min(expiresIn, 2_147_483_647));
    };

    checkExpiration();
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [authorization, logout]);

  const login = (newToken: string, userData: unknown) => {
    const result = validateAuthSession(newToken, userData);
    if (!result.success) {
      logout();
      throw new Error(`The server returned an invalid session: ${result.reason}`);
    }

    setToken(newToken);
    setUser(result.session.user);
    setAuthorization(result.session.authorization);
    try {
      localStorage.setItem('aureum_token', newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('aureum_user', JSON.stringify(result.session.user));
      localStorage.setItem('user', JSON.stringify(result.session.user));
    } catch (error) {
      console.error('Failed to persist auth data in localStorage:', error);
    }
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((previous) => {
      if (!previous) return null;
      const updated: User = {
        ...previous,
        ...updatedData,
        id: previous.id,
        email: previous.email,
        role: previous.role,
        roles: previous.roles,
        permissions: previous.permissions,
        attributes: previous.attributes,
      };
      try {
        localStorage.setItem('aureum_user', JSON.stringify(updated));
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update user in localStorage:', error);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authorization,
        isAuthenticated: !!token && !!user && !!authorization,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
