import type { NextFunction, Request, Response } from 'express'
import { ApiError } from './errorHandler.js'
import { verifyToken, type JwtPayload } from '../utils/generateToken.js'
import { User } from '../models/User.js'
import { Team } from '../models/Team.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token
  return cookieToken ?? null
}

async function resolveAuth(req: Request): Promise<JwtPayload> {
  const token = extractToken(req)
  if (!token) throw new ApiError(401, 'Not authenticated — no token provided')
  const payload = verifyToken(token)
  const user = await User.findById(payload.id).select('active role team')
  if (!user || !user.active) throw new ApiError(401, 'Account not found or disabled')
  // A soft-deleted team's leader/members must lose access immediately, even with a still-valid token.
  if ((user.role === 'TEAM_LEADER' || user.role === 'TEAM_MEMBER') && user.team) {
    const deleted = await Team.exists({ _id: user.team, isDeleted: true })
    if (deleted) throw new ApiError(403, 'This team has been removed. Please contact the organizers.', 'TEAM_DELETED')
  }
  // Trust the role stored in MongoDB, not the (possibly stale) role baked into the JWT — so a
  // demoted/changed admin loses privileges on their very next request.
  return { ...payload, role: user.role }
}

/** Requires a valid JWT for ANY authenticated role. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    req.auth = await resolveAuth(req)
    next()
  } catch (err) {
    if (err instanceof ApiError) return next(err)
    next(new ApiError(401, 'Invalid or expired token'))
  }
}

/** Attaches `req.auth` when a valid session is present and never rejects — for public endpoints
 *  that show a signed-in admin a little more (e.g. a pre-reveal problem preview). */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    if (extractToken(req)) req.auth = await resolveAuth(req)
  } catch {
    req.auth = undefined
  }
  next()
}

/** Restricts to one or more roles. Chain AFTER requireAuth. */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return next(new ApiError(401, 'Not authenticated'))
    if (!roles.includes(req.auth.role)) return next(new ApiError(403, 'Forbidden: insufficient role'))
    next()
  }
}
