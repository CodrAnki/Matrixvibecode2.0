import { describe, it, expect } from 'vitest'
import { parseMembersPayload, parseMember, MAX_TEAM_SIZE, assertNoDuplicate } from './memberValidation.js'

const leader = { maxTeamSize: MAX_TEAM_SIZE, leaderEmail: 'lead@x.com', leaderPhone: '9876543210' }
const m = (name: string, email?: string) => ({ name, ...(email ? { email } : {}) })

describe('MAX_TEAM_SIZE', () => {
  it('is solo or duo, and not configurable', () => {
    expect(MAX_TEAM_SIZE).toBe(2)
  })
})

describe('parseMembersPayload — team size (leader + members <= maxTeamSize)', () => {
  it('allows one teammate besides the leader (a duo)', () => {
    expect(parseMembersPayload([m('Ann')], leader)).toHaveLength(1)
  })
  it('allows no members at all (a solo team)', () => {
    expect(parseMembersPayload([], leader)).toHaveLength(0)
  })
  it('rejects a second teammate (total 3)', () => {
    expect(() => parseMembersPayload([m('Ann'), m('Bob')], leader)).toThrow()
  })
  it('treats missing/null as no members', () => {
    expect(parseMembersPayload(undefined, leader)).toEqual([])
    expect(parseMembersPayload(null, leader)).toEqual([])
  })
})

describe('parseMembersPayload — malformed payloads', () => {
  it('rejects non-arrays and non-object entries', () => {
    for (const bad of ['x', 5, {}, [null], ['str'], [[]], [{ name: 5 }], [{ name: 'A' }], [{ name: 'Ann', email: 12 }], [{ name: 'Ann', email: 'nope' }], [{ name: 'Ann', phone: 'abc' }]]) {
      expect(() => parseMembersPayload(bad, leader)).toThrow()
    }
  })
  it('accepts an empty-string email (optional at registration) and drops it', () => {
    expect(parseMembersPayload([{ name: 'Ann', email: '' }], leader)).toEqual([{ name: 'Ann' }])
  })
  it('lowercases and trims', () => {
    expect(parseMembersPayload([{ name: ' Ann ', email: ' ANN@X.com ' }], leader)).toEqual([{ name: 'Ann', email: 'ann@x.com' }])
  })
})

describe('parseMembersPayload — duplicates', () => {
  // The size limit is checked before duplicates, so a 2-member payload under the real solo/duo cap
  // would throw for the wrong reason and pass this suite vacuously. These cases lift the cap so
  // what's actually under test is the duplicate detection.
  const roomy = { ...leader, maxTeamSize: 4 }

  it('rejects the leader added again as a member (by email or phone)', () => {
    expect(() => parseMembersPayload([m('Lead', 'LEAD@x.com')], leader)).toThrow()
    expect(() => parseMembersPayload([{ name: 'Lead', phone: '+91 98765 43210' }], leader)).toThrow()
  })
  it('rejects duplicate member emails / phones within the payload', () => {
    expect(() => parseMembersPayload([m('A1', 'a@x.com'), m('A2', 'A@x.com')], roomy)).toThrow()
    expect(() => parseMembersPayload([{ name: 'A1', phone: '9111111111' }, { name: 'A2', phone: '91111-11111' }], roomy)).toThrow()
  })
  it('accepts two distinct members when the cap allows it', () => {
    expect(parseMembersPayload([m('A1', 'a1@x.com'), m('A2', 'a2@x.com')], roomy)).toHaveLength(2)
  })
})

describe('add-member validation', () => {
  it('requires an email', () => {
    expect(() => parseMember({ name: 'Ann' }, 0, { requireEmail: true })).toThrow()
    expect(parseMember({ name: 'Ann', email: 'a@x.com' }, 0, { requireEmail: true }).email).toBe('a@x.com')
  })
  it('uses the requested status for duplicates', () => {
    try { assertNoDuplicate({ name: 'A', email: 'lead@x.com' }, { email: 'lead@x.com' }, [], 409); throw new Error('no throw') }
    catch (e) { expect((e as { status: number }).status).toBe(409) }
  })
})
