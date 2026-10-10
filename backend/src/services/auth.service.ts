import { User } from '@prisma/client';
import { prisma } from '../index';
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'aureum-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password'>;
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
    const { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt } = user;
    return {
      token,
      user: { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt }
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
    const { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt } = user;
    return {
      token,
      user: { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt }
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