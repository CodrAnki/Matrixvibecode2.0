import { describe, it, expect } from 'vitest'
import { parsePagination, queryText } from './pagination.js'

describe('parsePagination', () => {
  it('defaults to page 1, 25 per page', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 25, skip: 0 })
  })
  it('clamps an absurd limit to 100 instead of allowing unlimited', () => {
    expect(parsePagination({ limit: '999999' }).limit).toBe(100)
  })
  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50, skip: 100 })
  })
  it('rejects malformed values with a 400', () => {
    for (const bad of [{ page: '-1' }, { page: '0' }, { limit: 'abc' }, { limit: '1.5' }, { page: '1e9' }]) {
      expect(() => parsePagination(bad)).toThrow()
    }
  })
  it('ignores non-string query junk safely', () => {
    expect(parsePagination({ page: { $gt: 1 } as unknown as string })).toEqual({ page: 1, limit: 25, skip: 0 })
  })
})

describe('queryText', () => {
  it('trims, caps length, and ignores objects', () => {
    expect(queryText('  abc ')).toBe('abc')
    expect(queryText('x'.repeat(200))?.length).toBe(60)
    expect(queryText({ a: 1 })).toBeUndefined()
  })
})
