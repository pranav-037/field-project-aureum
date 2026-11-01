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
  static async register(email: string, password: string, name: string, role: string = 'VIEWER'): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: password || '',
      },
    });

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

  static async login(email: string, password: string): Promise<LoginResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
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
   * On first sign-in the user is created with `defaultRole`.
   * On subsequent sign-ins the existing record is returned.
   * If an email/password account already exists with the same email it gets linked.
   */
  static async loginWithGoogle(idToken: string, defaultRole: string = 'VIEWER'): Promise<LoginResponse> {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

    const payload = await verifyGoogleToken(idToken);

    // Optionally enforce that the token was issued for our client ID
    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Google ID token audience mismatch');
    }

    if (!payload.email) {
      throw new Error('Google account does not expose a verified email');
    }

    // Look up by googleId first, then by email (to link existing accounts)
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: payload.email } });
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
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            role: defaultRole,
            password: '',
            googleId: payload.sub,
            avatarUrl: payload.picture || null,
          },
        });
      }
    } else if (payload.picture && payload.picture !== user.avatarUrl) {
      // Keep avatar in sync
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: payload.picture },
      });
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