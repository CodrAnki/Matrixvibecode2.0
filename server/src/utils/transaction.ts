import mongoose from 'mongoose'

/** Error text MongoDB gives when a multi-document transaction is attempted on a standalone server. */
const NO_TRANSACTION_SUPPORT = /Transaction numbers are only allowed on a replica set|IllegalOperation|Transactions are not supported/i

let transactionsSupported: boolean | undefined

/**
 * Runs `fn` inside a MongoDB transaction when the deployment supports it (replica set / Atlas),
 * so several writes either all commit or none do. On a standalone server (typical local dev)
 * transactions are impossible; `fn` is then called with `undefined` and MUST do its own
 * compensation (undo) if a later write fails. The first failed attempt is remembered so
 * standalone deployments don't pay for a failed round-trip on every call.
 *
 * Do NOT allocate IDs/counters inside `fn`: a counter bump inside a transaction would make every
 * concurrent caller conflict on the same document.
 */
export async function runInTransaction<T>(fn: (session: mongoose.ClientSession | undefined) => Promise<T>): Promise<T> {
  if (transactionsSupported === false) return fn(undefined)

  const session = await mongoose.startSession()
  try {
    let result!: T
    await session.withTransaction(async () => { result = await fn(session) })
    transactionsSupported = true
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (transactionsSupported === undefined && NO_TRANSACTION_SUPPORT.test(message)) {
      // Nothing was written (the very first write is what throws on a standalone server).
      transactionsSupported = false
      console.warn('[db] transactions are not supported by this MongoDB deployment — using compensating cleanup instead')
      return fn(undefined)
    }
    throw err
  } finally {
    await session.endSession()
  }
}
