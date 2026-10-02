/** True for a MongoDB duplicate-key error (E11000); optionally only when it is for the named field/index. */
export function isDuplicateKeyError(err: unknown, field?: string): boolean {
  const e = err as { code?: number | string; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown>; message?: string } | null
  if (!e || e.code !== 11000) return false
  if (!field) return true
  if (e.keyPattern && field in e.keyPattern) return true
  if (e.keyValue && field in e.keyValue) return true
  // Some code paths (e.g. inside transactions) only expose the index name, e.g. "index: teamId_1 dup key".
  return typeof e.message === 'string' && e.message.includes(`index: ${field}_`)
}
