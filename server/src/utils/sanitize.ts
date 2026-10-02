/** Strip HTML tags/control chars and collapse whitespace so admin text can never inject markup. */
export function sanitizeText(input: unknown, { multiline = false } = {}): string {
  if (typeof input !== 'string') return ''
  let s = input
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  s = multiline ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ')
  return s.trim()
}
