import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppRoleSchema, AuthAttributesSchema } from '../utils/tokenValidator';
import type { AppRole, AuthAuthorization, AuthAttributes, ValidatedAuthUser } from '../utils/tokenValidator';
import { supabase } from '../services/supabase';

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
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((role) => {
    const parsed = AppRoleSchema.safeParse(role);
    return parsed.success ? [parsed.data] : [];
  });
}

function parseInstitution(value: unknown): Institution | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const institution = value as Record<string, unknown>;
  if (typeof institution.name !== 'string' || institution.name.trim().length === 0) {
    return undefined;
  }

  return {
    name: institution.name,
    ...(typeof institution.id === 'string' ? { id: institution.id } : {}),
    ...(typeof institution.jurisdiction === 'string' ? { jurisdiction: institution.jurisdiction } : {}),
    ...(typeof institution.registrationNumber === 'string'
      ? { registrationNumber: institution.registrationNumber }
      : {}),
    ...(typeof institution.walletAddress === 'string' &&
    /^0x[a-fA-F0-9]{40}$/.test(institution.walletAddress)
      ? { walletAddress: institution.walletAddress }
      : {}),
    ...(typeof institution.status === 'string' ? { status: institution.status } : {}),
    ...(typeof institution.type === 'string' ? { type: institution.type } : {}),
  };
}

function getSessionState(session: Session | null): {
  user: User | null;
  authorization: AuthAuthorization | null;
} {
  if (!session?.user.email) {
    return { user: null, authorization: null };
  }

  const metadata = session.user.user_metadata ?? {};
  const parsedRole = AppRoleSchema.safeParse(metadata.role);
  const role: AppRole = parsedRole.success ? parsedRole.data : 'COLLECTOR';
  const roles = [...new Set([role, ...parseRoles(metadata.roles)])];
  const permissions = Array.isArray(metadata.permissions)
    ? [...new Set(metadata.permissions.filter((permission): permission is string =>
        typeof permission === 'string' && permission.length > 0
      ))]
    : [];
  const parsedAttributes = AuthAttributesSchema.safeParse(metadata.attributes);
  const attributes: AuthAttributes = parsedAttributes.success ? parsedAttributes.data : {};
  const walletAddress = typeof metadata.walletAddress === 'string' &&
    /^0x[a-fA-F0-9]{40}$/.test(metadata.walletAddress)
    ? metadata.walletAddress
    : undefined;
  if (walletAddress) attributes.walletAddress = walletAddress;

  const user: User = {
    id: session.user.id,
    email: session.user.email.toLowerCase(),
    name: typeof metadata.name === 'string'
      ? metadata.name
      : typeof metadata.full_name === 'string'
        ? metadata.full_name
        : session.user.email.split('@')[0],
    role,
    roles,
    permissions,
    attributes,
    institution: parseInstitution(metadata.institution),
    walletAddress: walletAddress ?? null,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    createdAt: session.user.created_at,
    updatedAt: session.user.updated_at,
  };
  const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000 + session.expires_in);

  return {
    user,
    authorization: {
      userId: user.id,
      email: user.email,
      exp: expiresAt,
      roles,
      permissions,
      attributes,
    },
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authorization, setAuthorization] = useState<AuthAuthorization | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const profileRequestId = useRef(0);

  const applySession = useCallback((session: Session | null) => {
    const requestId = ++profileRequestId.current;
    const state = getSessionState(session);
    setToken(session?.access_token ?? null);
    setUser(state.user);
    setAuthorization(state.authorization);

    if (!session || !state.user || !state.authorization) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const profileUrl = new URL(
      `${apiBaseUrl.replace(/\/$/, '')}/auth/me`,
      window.location.origin,
    );

    void fetch(profileUrl, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Profile lookup failed with HTTP ${response.status}.`);
        }
        return response.json();
      })
      .then((profile: Record<string, unknown>) => {
        const parsedRole = AppRoleSchema.safeParse(profile.role);
        if (!parsedRole.success) {
          throw new Error('The user profile contains an unsupported account role.');
        }
        if (requestId !== profileRequestId.current) return;

        const role = parsedRole.data;
        const walletAddress = typeof profile.walletAddress === 'string' &&
          /^0x[a-fA-F0-9]{40}$/.test(profile.walletAddress)
          ? profile.walletAddress
          : undefined;
        setUser((current) => current?.id === session.user.id
          ? {
              ...current,
              name: typeof profile.name === 'string' && profile.name.trim()
                ? profile.name
                : current.name,
              role,
              roles: [role],
              walletAddress: walletAddress ?? current.walletAddress,
              attributes: walletAddress
                ? { ...current.attributes, walletAddress }
                : current.attributes,
            }
          : current);
        setAuthorization((current) => current?.userId === session.user.id
          ? {
              ...current,
              roles: [role],
              attributes: walletAddress
                ? { ...current.attributes, walletAddress }
                : current.attributes,
            }
          : current);
      })
      .catch((error: unknown) => {
        if (requestId === profileRequestId.current) {
          console.error('Could not load the account role from the user profile:', error);
        }
      })
      .finally(() => {
        if (requestId === profileRequestId.current) setLoading(false);
      });
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      applySession(null);
    }
  }, [applySession]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        applySession(data.session);
      })
      .catch((error: unknown) => {
        console.error('Failed to restore Supabase Auth session:', error);
        applySession(null);
      });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser((previous) => previous ? {
      ...previous,
      ...updatedData,
      id: previous.id,
      email: previous.email,
      role: previous.role,
      roles: previous.roles,
      permissions: previous.permissions,
      attributes: previous.attributes,
    } : null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authorization,
        isAuthenticated: !!token && !!user && !!authorization,
        loading,
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
