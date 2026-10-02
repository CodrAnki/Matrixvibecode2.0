import type { NextFunction, Request, Response } from 'express'
import { requireAuth, requireRole } from './auth.js'

/** ADMIN routes cannot be accessed by TEAM_LEADER/TEAM_MEMBER. */
export const requireAdmin = [requireAuth, requireRole('ADMIN', 'SUPER_ADMIN')]

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole('SUPER_ADMIN')(req, res, next)
}
