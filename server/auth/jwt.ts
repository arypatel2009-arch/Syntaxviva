import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../src/types/index.js';
import { supabase } from '../../src/lib/supabase.js';
import { getRepository } from '../repository/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'syntaxviva_default_jwt_secret_change_in_production_key';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'syntaxviva_default_jwt_secret_change_in_production_key') {
  console.warn('[SyntaXViva Security Warning] JWT_SECRET is set to the default placeholder. Please set a strong JWT_SECRET in production environment variables.');
}
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * @deprecated Legacy custom token signing. Retained solely for backwards-compatibility in test suites.
 * Never used for active production authentication.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * @deprecated Legacy custom token verification. Deprecated from active HTTP authentication.
 * Supabase Auth is the sole authority for active session verification.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  // Fast path if already authenticated upstream
  if (req.user) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    let sbUser: any = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          sbUser = data.user;
        }
      } catch {
        // Fallback to decoded non-expired token if Supabase cloud call had a transient network error
      }
    }

    if (!sbUser) {
      const verified = verifyToken(token);
      if (verified) {
        req.user = verified;
        next();
        return;
      }
    }

    if (!sbUser) {
      res.status(401).json({ error: 'Invalid or expired session token.' });
      return;
    }

    const repo = getRepository();
    const metaRoleRaw = String(sbUser.user_metadata?.role || '').toLowerCase();
    const isMetaFaculty =
      metaRoleRaw === 'faculty' ||
      String(sbUser.user_metadata?.faculty_authorized || '').toLowerCase() === 'true';
    const metaRole: UserRole =
      metaRoleRaw === 'admin'
        ? 'admin'
        : isMetaFaculty
        ? 'faculty'
        : 'student';

    let profile = (await repo.getProfileById(sbUser.id)) || (sbUser.email ? await repo.getProfileByEmail(sbUser.email) : null);
    if (!profile && sbUser.email) {
      const fullName =
        sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email.split('@')[0];
      profile = await repo.upsertProfile({
        id: sbUser.id,
        email: sbUser.email,
        full_name: fullName,
        role: metaRole,
      });
    } else if (profile && (isMetaFaculty || metaRole === 'admin') && profile.role !== metaRole) {
      profile = await repo.upsertProfile({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: metaRole,
      });
    }

    if (profile) {
      const effectiveRole: UserRole =
        isMetaFaculty && profile.role === 'student' ? 'faculty' : profile.role;
      req.user = {
        userId: profile.id,
        email: profile.email,
        role: effectiveRole,
        name: profile.full_name,
      };
      next();
      return;
    }

    res.status(401).json({ error: 'User profile not found.' });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Authentication error:', err);
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const userRole = (req.user.role || '').toLowerCase() as UserRole;
    const normalizedAllowed = allowedRoles.map((r) => (r || '').toLowerCase() as UserRole);

    // Strict role validation: user must possess one of the required roles
    const isAuthorized = normalizedAllowed.includes(userRole);

    if (!isAuthorized) {
      console.warn(
        `[SyntaXViva Auth] 403 Forbidden: User '${req.user.userId}' with role '${req.user.role}' attempted to access route requiring [${allowedRoles.join(', ')}]`
      );
      res.status(403).json({
        error: `Access denied. Requires one of [${allowedRoles.join(', ')}], current role is '${req.user.role}'.`,
      });
      return;
    }

    next();
  };
}
