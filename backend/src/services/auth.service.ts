import { User } from '@prisma/client';
import { prisma } from '../index';
import { sign, verify } from 'jsonwebtoken';
import https from 'https';

const JWT_SECRET = process.env.JWT_SECRET || 'aureum-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password'>;
}

/** Subset of the Google tokeninfo payload we care about */
interface GoogleTokenPayload {
  sub: string;        // Google user ID
  email: string;
  name: string;
  picture?: string;
  email_verified: string | boolean;
  aud: string;        // Client ID the token was issued for
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
  // In a real app, we would hash passwords. For this basic app, we'll store them plainly
  // but this is ONLY for demonstration - NEVER do this in production!
  static async register(
    email: string,
    password: string,
    name: string,
    role: string = 'VIEWER',
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new Error(`An account with the email "${normalizedEmail}" already exists. Please sign in instead.`);
    }

    // Create user
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          role,
          password: password || '',
          walletAddress: walletAddress?.trim() || null,
        },
      });
    } catch (dbErr: any) {
      if (dbErr?.code === 'P2002') {
        throw new Error(`An account with the email "${normalizedEmail}" already exists. Please sign in instead.`);
      }
      throw new Error(`Database error saving user account: ${dbErr?.message || 'Unknown database error'}`);
    }

    // If an institution with a wallet address registers, ensure institution record
    if (role === 'AUTHENTICATOR' && walletAddress) {
      try {
        await prisma.institution.upsert({
          where: { walletAddress: walletAddress.trim() },
          update: { name: name.trim() },
          create: {
            name: name.trim(),
            walletAddress: walletAddress.trim(),
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        });
      } catch (instErr) {
        console.warn('Failed to upsert institution record:', instErr);
      }
    }

    // Record activity in database
    try {
      await prisma.activity.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          type: 'REGISTER',
          title: 'Account Registered',
          detail: `${user.name} (${user.email}) registered as ${user.role}`,
          badge: 'ACCOUNT',
        },
      });
    } catch (actErr) {
      console.warn('Failed to log register activity:', actErr);
    }

    // Generate JWT token
    const token = sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user without password
    const { id, email: userEmail, name: userName, role: userRole, walletAddress: userWallet, googleId, avatarUrl, createdAt, updatedAt } = user;
    return {
      token,
      user: { id, email: userEmail, name: userName, role: userRole, walletAddress: userWallet || null, googleId: googleId || null, avatarUrl: avatarUrl || null, createdAt, updatedAt }
    };
  }

  static async login(email: string, password: string): Promise<LoginResponse> {
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new Error(`No account found for "${normalizedEmail}". Please check your email or click "Create one" to register.`);
    }

    // If user has no local password and registered through Google OAuth
    if (!user.password && user.googleId) {
      throw new Error('This account was registered using Google Sign-In. Please sign in using the Google button.');
    }

    if (user.password !== password) {
      throw new Error('Incorrect password entered. Please double-check your password and try again.');
    }

    // Record login activity in database
    try {
      await prisma.activity.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          type: 'LOGIN',
          title: 'User Signed In',
          detail: `${user.name} logged in (${user.role})`,
          badge: 'SESSION',
        },
      });
    } catch (actErr) {
      console.warn('Failed to log login activity:', actErr);
    }

    // Generate JWT token
    const token = sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user without password
    const { id, email: userEmail, name: userName, role: userRole, walletAddress, googleId, avatarUrl, createdAt, updatedAt } = user;
    return {
      token,
      user: { id, email: userEmail, name: userName, role: userRole, walletAddress: walletAddress || null, googleId: googleId || null, avatarUrl: avatarUrl || null, createdAt, updatedAt }
    };
  }

  /**
   * Verify a Google ID token, then upsert the user in the DB.
   */
  static async loginWithGoogle(idToken: string, defaultRole: string = 'VIEWER'): Promise<LoginResponse> {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

    const payload = await verifyGoogleToken(idToken);

    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Google ID token audience mismatch');
    }

    if (!payload.email) {
      throw new Error('Google account does not expose a verified email');
    }

    // Look up by googleId first, then by email (to link existing accounts)
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
      if (user) {
        // Link this Google identity to the existing account
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: payload.sub,
            avatarUrl: payload.picture || user.avatarUrl,
          },
        });
      } else {
        // Brand-new user via Google
        user = await prisma.user.create({
          data: {
            email: payload.email.toLowerCase(),
            name: payload.name || payload.email.split('@')[0],
            role: defaultRole,
            password: '',
            googleId: payload.sub,
            avatarUrl: payload.picture || null,
          },
        });
      }
    } else if (payload.picture && payload.picture !== user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: payload.picture },
      });
    }

    // Record login activity in database
    try {
      await prisma.activity.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          type: 'LOGIN',
          title: 'Google Sign-In',
          detail: `${user.name} signed in with Google (${user.role})`,
          badge: 'GOOGLE-AUTH',
        },
      });
    } catch (actErr) {
      console.warn('Failed to log google login activity:', actErr);
    }

    const token = sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { id, email: userEmail, name: userName, role: userRole, walletAddress, googleId, avatarUrl, createdAt, updatedAt } = user;
    return {
      token,
      user: { id, email: userEmail, name: userName, role: userRole, walletAddress: walletAddress || null, googleId: googleId || null, avatarUrl: avatarUrl || null, createdAt, updatedAt }
    };
  }

  static verifyToken(token: string): { userId: string; email: string; role: string } | null {
    try {
      const decoded = verify(token, JWT_SECRET);
      return decoded as unknown as { userId: string; email: string; role: string };
    } catch (error) {
      return null;
    }
  }
}
