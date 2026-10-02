/**
 * Collision-safe sequence allocation. The ONLY mutation of a counter is a single atomic `$inc`,
 * so any number of concurrent callers each receive a distinct value — there is no
 * read-then-write window like the old "find the newest team and add one" approach had.
 *
 * Kept free of any mongoose import so the race-handling logic can be unit-tested with a fake store.
 */
export interface SequenceStore {
  /** Atomically increments and returns the NEW value, or null if the counter does not exist yet. */
  increment(name: string): Promise<number | null>
  /** Creates the counter at `base` ONLY if it does not exist; must never overwrite, and must swallow a duplicate-key race. */
  seedIfMissing(name: string, base: number): Promise<void>
}

/**
 * @param computeBase  only called the first time a counter is used; must return the highest value
 *                     already issued by the legacy mechanism so existing IDs can never be re-issued.
 */
export async function nextSequence(store: SequenceStore, name: string, computeBase: () => Promise<number>): Promise<number> {
  let value = await store.increment(name)
  if (value === null) {
    // First use. Several requests may land here together: seeding is $setOnInsert-only, so the
    // first one wins, the rest are no-ops, and every one of them then takes its own $inc.
    await store.seedIfMissing(name, await computeBase())
    value = await store.increment(name)
  }
  if (value === null) throw new Error(`Sequence "${name}" could not be initialised`)
  return value
}
