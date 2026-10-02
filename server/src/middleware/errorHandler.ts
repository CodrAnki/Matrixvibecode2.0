import type { NextFunction, Request, Response } from 'express'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function notFound(req: Request, res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

const DB_DOWN_NAMES = new Set([
  'MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError', 'MongooseServerSelectionError',
  'MongoNotConnectedError', 'MongoPoolClearedError', 'MongoTopologyClosedError',
])
function isDbUnavailable(e: { name?: string; message?: string } | null | undefined): boolean {
  return !!e && ((e.name !== undefined && DB_DOWN_NAMES.has(e.name)) || /buffering timed out/i.test(e.message ?? ''))
}

/**
 * Maps any thrown error onto a safe, user-friendly JSON envelope. Never leaks stack traces or
 * internal messages: only deliberate ApiError messages (and a few well-understood library errors)
 * reach the client; everything else becomes a generic 500.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  let status = 500
  let message = 'Something went wrong on our side. Please try again.'
  let code: string | undefined

  const e = err as { name?: string; message?: string; code?: number | string; type?: string; status?: number; keyPattern?: Record<string, unknown>; errors?: Record<string, { message: string }> }

  if (err instanceof ApiError) {
    status = err.status
    message = err.message
    code = err.code
  } else if (e?.code === 11000) {
    // MongoDB duplicate-key — e.g. two concurrent creates racing past an existence check.
    status = 409
    message = e.keyPattern && 'email' in e.keyPattern ? 'This email is already registered.'
      : e.keyPattern && 'teamName' in e.keyPattern ? 'This team name is already taken'
      : 'A record with these details already exists.'
    code = 'DUPLICATE'
  } else if (isDbUnavailable(e)) {
    // Database unreachable / timed out: say so (503) rather than a vague 500, and never claim success.
    status = 503
    message = 'The service is temporarily unavailable. Please try again in a moment.'
    code = 'DB_UNAVAILABLE'
  } else if (e?.name === 'ValidationError' && e.errors) {
    status = 422
    message = Object.values(e.errors).map((x) => x.message).join('; ') || 'Validation failed'
    code = 'VALIDATION_ERROR'
  } else if (e?.name === 'CastError') {
    status = 422
    message = 'One of the supplied values is invalid.'
    code = 'VALIDATION_ERROR'
  } else if (e?.type === 'entity.parse.failed') {
    status = 400
    message = 'Request body is not valid JSON.'
  } else if (e?.type === 'entity.too.large') {
    status = 413
    message = 'Request body is too large.'
  }

  if (status === 500) console.error('[error]', err)
  else if (status === 503) console.error('[error] database unavailable:', e?.name, e?.message)
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) })
}
