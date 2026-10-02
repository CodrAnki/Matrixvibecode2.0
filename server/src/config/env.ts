/**
 * Startup environment validation. Called once from server.ts BEFORE anything connects, so a
 * misconfigured deployment dies immediately with ONE clear message instead of failing later on
 * the first user request. Messages name the variable but never echo its value (secrets stay
 * out of logs).
 */
export class EnvError extends Error {
  constructor(problems: string[]) {
    super(`Invalid server configuration:\n  - ${problems.join('\n  - ')}`)
    this.name = 'EnvError'
  }
}

const PLACEHOLDER_SECRETS = new Set(['change-this-to-a-long-random-string', 'changeme', 'change-me', 'secret'])
const LOCALHOST_RE = /localhost|127\.0\.0\.1|0\.0\.0\.0/i

function isPositiveInt(v: string): boolean {
  return /^\d+$/.test(v) && Number(v) > 0
}

/** Returns the list of problems (empty = valid). Pure, so it is unit-testable without touching process.env. */
export function collectEnvProblems(env: Record<string, string | undefined>): { problems: string[]; warnings: string[] } {
  const problems: string[] = []
  const warnings: string[] = []
  const isProd = env.NODE_ENV === 'production'
  const need = (name: string) => { if (!env[name]?.trim()) problems.push(`${name} is required`) }

  need('MONGODB_URI')
  need('JWT_SECRET')

  const uri = env.MONGODB_URI?.trim()
  if (uri && !/^mongodb(\+srv)?:\/\//.test(uri)) problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://')
  if (uri && isProd && /@?(localhost|127\.0\.0\.1)[:/]/i.test(uri)) warnings.push('MONGODB_URI points at localhost while NODE_ENV=production')

  const secret = env.JWT_SECRET ?? ''
  if (secret) {
    if (PLACEHOLDER_SECRETS.has(secret)) {
      if (isProd) problems.push('JWT_SECRET is still the placeholder value from .env.example')
      else warnings.push('JWT_SECRET is a placeholder value — fine for local development only')
    }
    if (isProd && secret.length < 32) problems.push('JWT_SECRET must be at least 32 characters in production')
  }

  if (env.PORT && !(isPositiveInt(env.PORT) && Number(env.PORT) < 65536)) problems.push('PORT must be a valid port number')

  for (const name of ['MONGO_MAX_POOL_SIZE', 'MONGO_MIN_POOL_SIZE']) {
    const v = env[name]
    if (v !== undefined && v !== '' && !(name === 'MONGO_MIN_POOL_SIZE' ? /^\d+$/.test(v) : isPositiveInt(v))) {
      problems.push(`${name} must be a positive integer when set`)
    }
  }

  if (isProd) {
    need('CLIENT_URL')
    need('PUBLIC_APP_URL')
    if (env.CLIENT_URL && LOCALHOST_RE.test(env.CLIENT_URL)) problems.push('CLIENT_URL points at localhost while NODE_ENV=production')
    if (env.PUBLIC_APP_URL && LOCALHOST_RE.test(env.PUBLIC_APP_URL)) problems.push('PUBLIC_APP_URL points at localhost while NODE_ENV=production')
    if (!env.TRUST_PROXY) warnings.push('TRUST_PROXY is not set — behind a reverse proxy every visitor will share ONE rate-limit bucket (set it to the number of proxy hops, e.g. 1)')
  }
  if (!isProd && !env.NODE_ENV) {
    warnings.push('NODE_ENV is not set — set NODE_ENV=production on deployed servers (secure cookies depend on it)')
  }

  return { problems, warnings }
}

export function validateEnv(env: Record<string, string | undefined> = process.env): void {
  const { problems, warnings } = collectEnvProblems(env)
  for (const w of warnings) console.warn(`[env] warning: ${w}`)
  if (problems.length) throw new EnvError(problems)
}

/** Express `trust proxy` setting from TRUST_PROXY: "1" (hops), "true", or a subnet/keyword string. Default: off. */
export function parseTrustProxy(raw: string | undefined): boolean | number | string {
  const v = raw?.trim()
  if (!v || v === 'false') return false
  if (v === 'true') return true
  if (/^\d+$/.test(v)) return Number(v)
  return v
}

/** CLIENT_URL may hold one origin or a comma-separated list. */
export function parseClientOrigins(raw: string | undefined): string[] {
  const list = (raw ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
  return list.length ? list : ['http://localhost:5173']
}
