import { ApiError } from '../middleware/errorHandler.js'

export const DEFAULT_PAGE_LIMIT = 25
export const MAX_PAGE_LIMIT = 100
const MAX_PAGE = 1_000_000

export interface Pagination { page: number; limit: number; skip: number }

function firstString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

/** undefined when the param is absent/blank; throws 400 when present but not a positive whole number. */
function positiveInt(raw: unknown, name: string): number | undefined {
  const s = firstString(raw)?.trim()
  if (s === undefined || s === '') return undefined
  if (!/^\d{1,9}$/.test(s) || Number(s) < 1) throw new ApiError(400, `${name} must be a positive whole number`, 'VALIDATION_ERROR')
  return Number(s)
}

/**
 * Safe pagination for every list endpoint: default 25/page, hard cap 100/page. A client asking
 * for `limit=999999` is clamped to 100 (never unlimited); garbage like `page=-1` or `limit=abc`
 * is a 400 rather than reaching MongoDB as a negative skip/limit.
 */
export function parsePagination(query: Record<string, unknown>, defaults: { limit?: number; maxLimit?: number } = {}): Pagination {
  const maxLimit = defaults.maxLimit ?? MAX_PAGE_LIMIT
  const page = Math.min(positiveInt(query.page, 'page') ?? 1, MAX_PAGE)
  const limit = Math.min(positiveInt(query.limit, 'limit') ?? defaults.limit ?? DEFAULT_PAGE_LIMIT, maxLimit)
  return { page, limit, skip: (page - 1) * limit }
}

/** Reads an optional search string from a query param: first value only, trimmed, length-capped; objects/arrays of objects are ignored. */
export function queryText(raw: unknown, maxLen = 60): string | undefined {
  const s = firstString(raw)?.trim()
  return s ? s.slice(0, maxLen) : undefined
}
