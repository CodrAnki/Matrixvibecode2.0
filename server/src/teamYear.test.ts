import { describe, it, expect } from 'vitest'
import { parseTeamYear } from './controllers/authController.js'

describe('parseTeamYear (optional field)', () => {
  it('accepts missing / null / empty as null', () => {
    expect(parseTeamYear(undefined)).toBeNull()
    expect(parseTeamYear(null)).toBeNull()
    expect(parseTeamYear('')).toBeNull()
  })
  it('accepts "1st Year"', () => expect(parseTeamYear('1st Year')).toBe('1st Year'))
  it('rejects every other value', () => {
    for (const bad of ['2nd Year', '3rd Year', '4th Year', 'First Year', 'x', 1, {}, ['1st Year']]) {
      expect(() => parseTeamYear(bad)).toThrow()
    }
  })
})
