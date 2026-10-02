import { describe, it, expect } from 'vitest'
import { collectEnvProblems, parseTrustProxy, parseClientOrigins } from './env.js'

const good = { MONGODB_URI: 'mongodb://localhost:27017/x', JWT_SECRET: 'a'.repeat(40) }
const prod = {
  ...good, NODE_ENV: 'production', CLIENT_URL: 'https://app.example.org', PUBLIC_APP_URL: 'https://app.example.org',
  SMTP_HOST: 'smtp.example.org', SMTP_USER: 'u', SMTP_PASSWORD: 'p', TRUST_PROXY: '1',
}

describe('collectEnvProblems', () => {
  it('accepts a minimal dev config', () => expect(collectEnvProblems(good).problems).toEqual([]))
  it('reports missing required variables by name only', () => {
    const { problems } = collectEnvProblems({})
    expect(problems.join()).toContain('MONGODB_URI')
    expect(problems.join()).toContain('JWT_SECRET')
  })
  it('accepts a complete production config', () => expect(collectEnvProblems(prod).problems).toEqual([]))
  it('rejects placeholder/short secrets and localhost URLs in production', () => {
    const { problems } = collectEnvProblems({ ...prod, JWT_SECRET: 'change-this-to-a-long-random-string', CLIENT_URL: 'http://localhost:5173' })
    expect(problems.length).toBeGreaterThanOrEqual(2)
    expect(collectEnvProblems({ ...prod, JWT_SECRET: 'short' }).problems.join()).toContain('32')
  })
  it('requires SMTP in production', () => {
    expect(collectEnvProblems({ ...prod, SMTP_PASSWORD: '' }).problems.join()).toContain('SMTP_PASSWORD')
  })
  it('never echoes secret values', () => {
    const { problems } = collectEnvProblems({ ...prod, JWT_SECRET: 'tooShortSecretValue' })
    expect(problems.join()).not.toContain('tooShortSecretValue')
  })
})

describe('parsers', () => {
  it('parseTrustProxy', () => {
    expect(parseTrustProxy(undefined)).toBe(false)
    expect(parseTrustProxy('1')).toBe(1)
    expect(parseTrustProxy('true')).toBe(true)
  })
  it('parseClientOrigins', () => {
    expect(parseClientOrigins('https://a.com/, https://b.com')).toEqual(['https://a.com', 'https://b.com'])
    expect(parseClientOrigins(undefined)).toEqual(['http://localhost:5173'])
  })
})
