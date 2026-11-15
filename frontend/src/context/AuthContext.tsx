import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface Institution {
  id?: string;
  name: string;
  jurisdiction?: string;
  registrationNumber?: string;
  walletAddress?: string;
  status?: string;
  type?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AUTHENTICATOR' | 'VIEWER' | 'COLLECTOR' | string;
  walletAddress?: string | null;
  institution?: Institution | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Hydrate user and token from localStorage on initial mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('aureum_token') || localStorage.getItem('token');
      const storedUser = localStorage.getItem('aureum_user') || localStorage.getItem('user');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      }
    } catch (err) {
      console.error('Failed to parse auth data from localStorage:', err);
      localStorage.removeItem('aureum_token');
      localStorage.removeItem('token');
      localStorage.removeItem('aureum_user');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    try {
      localStorage.setItem('aureum_token', newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('aureum_user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to persist auth data in localStorage:', err);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('aureum_token');
      localStorage.removeItem('token');
      localStorage.removeItem('aureum_user');
      localStorage.removeItem('user');
    } catch (err) {
      console.error('Failed to clear localStorage on logout:', err);
    }
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...updatedData,
        institution: updatedData.institution !== undefined ? updatedData.institution : prev.institution,
      };
      try {
        localStorage.setItem('aureum_user', JSON.stringify(updated));
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update user in localStorage:', err);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
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
