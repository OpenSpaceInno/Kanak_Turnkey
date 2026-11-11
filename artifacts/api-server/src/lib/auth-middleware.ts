import type { Request, Response, NextFunction } from "express";
import { getCurrentUser, type CurrentUser } from "./session";
import { verifyToken } from "./jwt";

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

/**
 * Global authentication middleware.
 * Resolves current user from:
 * 1. Authorization: Bearer <jwt>
 * 2. Cookie kanak_token
 * 3. x-user-id header / query parameter (for dev/testing compatibility)
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let userId: string | number | null = null;

    // Check Bearer Token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.sub;
      }
    }

    // Check Cookie if not resolved
    if (!userId && req.cookies?.kanak_token) {
      const payload = verifyToken(req.cookies.kanak_token);
      if (payload) {
        userId = payload.sub;
      }
    }

    // Fallback to x-user-id header or query param
    if (!userId) {
      const headerId = req.headers["x-user-id"] as string;
      const queryId = req.query?.userId as string;
      if (headerId || queryId) {
        userId = headerId || queryId;
      }
    }

    // Resolve user details
    const user = await getCurrentUser(userId);
    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * RBAC route authorization middleware.
 * Verifies that the authenticated user possesses at least one of the allowed roles.
 * Admins always have access across all endpoints.
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user || (await getCurrentUser(req.headers["x-user-id"] as string));
      const activeRole = user.activeRole || "viewer";
      const userRoles = user.roles || [];

      // Admin role always grants access
      if (activeRole === "admin" || userRoles.includes("admin")) {
        return next();
      }

      // Check if active role or assigned roles match permitted roles
      const hasPermission =
        allowedRoles.includes(activeRole) ||
        userRoles.some((r) => allowedRoles.includes(r));

      if (!hasPermission) {
        res.status(403).json({
          error: `Access denied. Active role "${activeRole}" does not have required permissions. Required role(s): ${allowedRoles.join(", ")}`,
          requiredRoles: allowedRoles,
          activeRole,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Security gate for demo/seed routes in production environments.
 * Disables or restricts demo data resets unless the requester is an admin.
 */
export async function gateInProduction(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    const user = req.user || (await getCurrentUser(req.headers["x-user-id"] as string));
    if (user.activeRole !== "admin" && !user.roles.includes("admin")) {
      res.status(403).json({
        error: "Database reset and seeding endpoints are restricted to administrators in production.",
      });
      return;
    }
  }
  next();
}

/**
 * In-memory sliding window rate limiter for login attempts.
 * Max 15 attempts per 15-minute window per IP.
 */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 15;

  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      retryAfterSeconds: retryAfter,
    });
    return;
  }

  record.count++;
  next();
}
