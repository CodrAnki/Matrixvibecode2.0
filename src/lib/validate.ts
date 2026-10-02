export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
export const isPhone = (v: string) => /^[+]?[\d\s-]{10,15}$/.test(v.trim())
export function isUrl(v: string): boolean {
  try {
    const u = new URL(v.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
export const isGithub = (v: string) => isUrl(v) && /(^|\.)github\.com$/i.test(new URL(v.trim()).hostname)
