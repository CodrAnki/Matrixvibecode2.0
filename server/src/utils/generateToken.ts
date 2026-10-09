import jwt, { type SignOptions } from 'jsonwebtoken'

export interface JwtPayload {
  id: string
  role: 'TEAM_LEADER' | 'TEAM_MEMBER' | 'ADMIN' | 'SUPER_ADMIN'
  teamId?: string
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' })
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload
}

/** Cookie options shared by every route that sets the auth cookie. */
export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // The deployed frontend (Vercel) and API use different origins. Lax cookies are
  // omitted from cross-origin fetches, which breaks session restore after a reload.
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

export const clearAuthCookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: authCookieOptions.sameSite,
  path: '/',
}
