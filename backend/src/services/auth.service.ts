import { decode, verify } from 'jsonwebtoken';
import https from 'https';
import { supabase } from '../db/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'aureum-dev-secret-change-in-production';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  walletAddress?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

/** Subset of the Google tokeninfo payload */
interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: string | boolean;
  aud: string;
  error?: string;
}

/** Verify a Google ID token by calling Google's tokeninfo endpoint */
function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  return new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const payload = JSON.parse(data) as GoogleTokenPayload;
          if (payload.error) {
            return reject(new Error(`Google token verification failed: ${payload.error}`));
          }
          resolve(payload);
        } catch {
          reject(new Error('Failed to parse Google tokeninfo response'));
        }
      });
    }).on('error', reject);
  });
}

export class AuthService {
  /**
   * Register a new user using Supabase Authentication.
   * Completely scraps legacy Prisma plain-text password storage.
   */
  static async register(
    email: string,
    password: string,
    name: string,
    role: string = 'COLLECTOR',
    walletAddress?: string
  ): Promise<LoginResponse> {
    if (!email || !email.trim()) {
      throw new Error('Email address is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Please provide a valid email address (e.g. name@domain.com).');
    }

    if (!name || name.trim().length < 2) {
      throw new Error('Full name is required and must be at least 2 characters long.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const resolvedRole = role || 'COLLECTOR';
    const trimmedName = name.trim();
    const cleanWallet = walletAddress?.trim() || null;

    // 1. Create user account via Supabase Auth
    let authUser: any = null;
    let sessionToken: string = '';

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          role: resolvedRole,
          walletAddress: cleanWallet,
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        throw new Error(`An account with the email "${normalizedEmail}" already exists. Please sign in instead.`);
      }
      throw new Error(`Supabase registration failed: ${signUpError.message}`);
    }

    if (!signUpData?.user) {
      throw new Error('Registration failed: no user returned by Supabase Auth.');
    }

    authUser = signUpData.user;
    sessionToken = signUpData.session?.access_token || '';

    // If email confirmation is required and no session was returned,
    // attempt auto-confirming if service role is available, then sign in
    if (!sessionToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabase.auth.admin.updateUserById(authUser.id, {
          email_confirm: true,
        });
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInData?.session?.access_token) {
          sessionToken = signInData.session.access_token;
        }
      } catch (autoConfirmErr) {
        console.warn('Could not auto-confirm email via admin API:', autoConfirmErr);
      }
    }

    // 2. Synchronize user profile in "User" table in Supabase
    const userProfile: AuthenticatedUser = {
      id: authUser.id,
      email: normalizedEmail,
      name: trimmedName,
      role: resolvedRole,
      walletAddress: cleanWallet,
      createdAt: authUser.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await supabase.from('User').upsert({
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        walletAddress: userProfile.walletAddress,
        password: '', // Plaintext password removed / retired
        updatedAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('Failed to upsert user profile into "User" table:', dbErr);
    }

    // 3. If institution with wallet, ensure institution record
    if (resolvedRole === 'AUTHENTICATOR' && cleanWallet) {
      try {
        await supabase.from('Institution').upsert(
          {
            name: trimmedName,
            walletAddress: cleanWallet,
            status: 'APPROVED',
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { onConflict: 'walletAddress' }
        );
      } catch (instErr) {
        console.warn('Failed to upsert institution record:', instErr);
      }
    }

    // 4. Record registration activity
    try {
      await supabase.from('Activity').insert({
        userId: userProfile.id,
        userEmail: userProfile.email,
        type: 'REGISTER',
        title: 'Account Registered',
        detail: `${userProfile.name} (${userProfile.email}) registered as ${userProfile.role}`,
        badge: 'ACCOUNT',
      });
    } catch (actErr) {
      console.warn('Failed to log register activity:', actErr);
    }

    return {
      token: sessionToken,
      user: userProfile,
    };
  }

  /**
   * Authenticate a user using Supabase Authentication.
   * Completely scraps legacy Prisma plain-text password comparison.
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('Incorrect password or email. Please double-check your credentials and try again.');
      }
      if (msg.includes('email not confirmed')) {
        // If unconfirmed and we have admin credentials, auto-confirm for dev ease
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const { data: usersList } = await supabase.auth.admin.listUsers();
          const target = usersList?.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
          if (target) {
            await supabase.auth.admin.updateUserById(target.id, { email_confirm: true });
            const retry = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
            if (retry.data?.session?.access_token) {
              return this.buildLoginSuccess(retry.data.user, retry.data.session.access_token);
            }
          }
        }
        throw new Error('Email address has not been confirmed yet. Please check your inbox or confirmation email.');
      }
      throw new Error(error.message);
    }

    if (!data?.user || !data.session) {
      throw new Error('Authentication failed: no session returned from Supabase.');
    }

    return this.buildLoginSuccess(data.user, data.session.access_token);
  }

  /**
   * Internal helper to retrieve user profile and build the LoginResponse
   */
  private static async buildLoginSuccess(authUser: any, token: string): Promise<LoginResponse> {
    let userProfile: AuthenticatedUser | null = null;

    try {
      const { data: dbUser } = await supabase
        .from('User')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (dbUser) {
        userProfile = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          walletAddress: dbUser.walletAddress || null,
          googleId: dbUser.googleId || null,
          avatarUrl: dbUser.avatarUrl || null,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        };
      }
    } catch {
      // Ignore if table query fails
    }

    if (!userProfile) {
      const meta = authUser.user_metadata || {};
      userProfile = {
        id: authUser.id,
        email: authUser.email || '',
        name: meta.name || authUser.email?.split('@')[0] || 'Collector',
        role: meta.role || 'COLLECTOR',
        walletAddress: meta.walletAddress || null,
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at,
      };
    }

    // Log login activity
    try {
      await supabase.from('Activity').insert({
        userId: userProfile.id,
        userEmail: userProfile.email,
        type: 'LOGIN',
        title: 'User Signed In',
        detail: `${userProfile.name} logged in (${userProfile.role})`,
        badge: 'SESSION',
      });
    } catch (actErr) {
      console.warn('Failed to log login activity:', actErr);
    }

    return {
      token,
      user: userProfile,
    };
  }

  /**
   * Verify a Google ID token and sync user profile in Supabase
   */
  static async loginWithGoogle(idToken: string, defaultRole: string = 'COLLECTOR'): Promise<LoginResponse> {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const payload = await verifyGoogleToken(idToken);

    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Google ID token audience mismatch');
    }

    if (!payload.email) {
      throw new Error('Google account does not expose a verified email');
    }

    const normalizedEmail = payload.email.toLowerCase();
    const userName = payload.name || payload.email.split('@')[0];

    // Check if user exists in Supabase "User" table
    const { data: existingUser } = await supabase
      .from('User')
      .select('*')
      .or(`googleId.eq.${payload.sub},email.eq.${normalizedEmail}`)
      .single();

    let userProfile: AuthenticatedUser;

    if (existingUser) {
      const { data: updated } = await supabase
        .from('User')
        .update({
          googleId: payload.sub,
          avatarUrl: payload.picture || existingUser.avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      userProfile = updated || existingUser;
    } else {
      const { data: created, error } = await supabase
        .from('User')
        .insert({
          email: normalizedEmail,
          name: userName,
          role: defaultRole,
          password: '',
          googleId: payload.sub,
          avatarUrl: payload.picture || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !created) {
        throw new Error(`Failed to create Google user: ${error?.message || 'Database insert failed'}`);
      }
      userProfile = created;
    }

    // Generate or obtain session token
    let token = '';
    try {
      const { data: sessionData } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      token = sessionData?.session?.access_token || '';
    } catch {
      // Fallback to signed JWT
    }

    if (!token) {
      const { sign } = await import('jsonwebtoken');
      token = sign(
        { userId: userProfile.id, email: userProfile.email, role: userProfile.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    }

    // Log activity
    try {
      await supabase.from('Activity').insert({
        userId: userProfile.id,
        userEmail: userProfile.email,
        type: 'LOGIN',
        title: 'Google Sign-In',
        detail: `${userProfile.name} signed in with Google (${userProfile.role})`,
        badge: 'GOOGLE-AUTH',
      });
    } catch (actErr) {
      console.warn('Failed to log Google login activity:', actErr);
    }

    return { token, user: userProfile };
  }

  /**
   * Asynchronous Supabase token verification.
   * Validates token directly against Supabase Auth.
   */
  static async verifyTokenAsync(token: string): Promise<AuthenticatedUser | null> {
    try {
      // 1. Validate against Supabase Auth
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        const authUser = data.user;

        // Fetch user from DB
        const { data: dbUser } = await supabase
          .from('User')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (dbUser) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            walletAddress: dbUser.walletAddress || null,
            googleId: dbUser.googleId || null,
            avatarUrl: dbUser.avatarUrl || null,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
          };
        }

        const meta = authUser.user_metadata || {};
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: meta.name || authUser.email?.split('@')[0] || 'Collector',
          role: meta.role || 'COLLECTOR',
          walletAddress: meta.walletAddress || null,
        };
      }
    } catch {
      // Continue to JWT fallback
    }

    // 2. Fallback to JWT verify for local/dev tokens
    try {
      const decoded = verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.userId || decoded.sub)) {
        const id = decoded.userId || decoded.sub;
        return {
          id,
          email: decoded.email || '',
          name: decoded.name || 'User',
          role: decoded.role || 'COLLECTOR',
        };
      }
    } catch {
      // Invalid
    }

    return null;
  }

  /**
   * Synchronous token verification method (preserves backwards compatibility).
   * Decodes JWT claims (works with both Supabase JWTs and local JWTs).
   */
  static verifyToken(token: string): { userId: string; email: string; role: string } | null {
    try {
      // First try standard local JWT verification
      const decodedLocal = verify(token, JWT_SECRET) as any;
      if (decodedLocal?.userId) {
        return {
          userId: decodedLocal.userId,
          email: decodedLocal.email,
          role: decodedLocal.role,
        };
      }
    } catch {
      // Not a local secret JWT, check if it's a Supabase JWT
    }

    try {
      // Decode Supabase JWT payload without requiring local secret
      const decoded = decode(token) as any;
      if (decoded && (decoded.sub || decoded.userId)) {
        const userId = decoded.sub || decoded.userId;
        const email = decoded.email || '';
        const role = decoded.user_metadata?.role || decoded.app_metadata?.role || decoded.role || 'COLLECTOR';
        return { userId, email, role };
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Request password reset email via Supabase
   */
  static async resetPassword(email: string, redirectTo?: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectTo || undefined,
    });

    if (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }

    return {
      success: true,
      message: `Password reset link has been sent to "${normalizedEmail}".`,
    };
  }
}
