import { describe, it, expect } from 'vitest'
import { nextSequence, type SequenceStore } from './sequence.js'

/** In-memory store with an async gap between steps so concurrent callers genuinely interleave. */
function fakeStore() {
  const counters = new Map<string, number>()
  const tick = () => new Promise<void>((r) => setTimeout(r, Math.random() * 3))
  const store: SequenceStore = {
    async increment(name) {
      await tick()
      if (!counters.has(name)) return null
      const v = counters.get(name)! + 1 // single synchronous step == atomic $inc
      counters.set(name, v)
      return v
    },
    async seedIfMissing(name, base) {
      await tick()
      if (!counters.has(name)) counters.set(name, base) // $setOnInsert semantics: never overwrite
    },
  }
  return { store, counters }
}

describe('nextSequence', () => {
  it('starts above the highest existing id', async () => {
    const { store } = fakeStore()
    expect(await nextSequence(store, 'teamId', async () => 10000)).toBe(10001)
    expect(await nextSequence(store, 'teamId', async () => 10000)).toBe(10002)
  })
  it('continues after legacy data (e.g. highest existing MTX-10057)', async () => {
    const { store } = fakeStore()
    expect(await nextSequence(store, 'teamId', async () => 10057)).toBe(10058)
  })
  for (const n of [10, 50, 100]) {
    it(`gives ${n} simultaneous callers ${n} distinct ids (including the first-use seeding race)`, async () => {
      const { store } = fakeStore()
      const ids = await Promise.all(Array.from({ length: n }, () => nextSequence(store, 'teamId', async () => 10000)))
      expect(new Set(ids).size).toBe(n)
      expect(Math.min(...ids)).toBe(10001)
      expect(Math.max(...ids)).toBe(10000 + n)
    })
  }
})
