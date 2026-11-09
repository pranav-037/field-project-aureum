import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthenticatedUser } from '../services/auth.service';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to enforce authentication via Supabase JWT token.
 * Extracts Bearer token, verifies it against Supabase, and attaches `req.user`.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed Authorization header. Expected Bearer token.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Authorization token not provided.' });
      return;
    }

    const user = await AuthService.verifyTokenAsync(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid, revoked, or expired authentication token.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication verification failed.' });
  }
}

/**
 * Middleware to enforce role-based access control.
 * Must be used after `requireAuth`.
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required prior to role verification.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of roles: [${roles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

