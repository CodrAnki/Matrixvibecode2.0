import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'

/**
 * ONE-TIME, EXPLICIT database cleanup for the removed modules:
 *   Participants, Submissions, Judges, Evaluations, Results, Audit Logs.
 *
 * SAFE BY DEFAULT: running it with no flags is a DRY RUN — it only prints what it would do.
 * Nothing is changed until you pass --execute:
 *
 *   cd server
 *   npm run migrate:remove-legacy                 # dry run (read-only report)
 *   npm run migrate:remove-legacy -- --execute    # apply
 *
 * What it touches (and ONLY this):
 *   1. DROPS these collections if present: submissions, evaluations, judges, auditlogs
 *      (+ audit_logs / participants / results if an older build created them).
 *   2. DELETES User documents with role "JUDGE" (and their OTP rows). The JUDGE role no longer exists.
 *   3. Team.eventStatus values SUBMITTED / UNDER_REVIEW / EVALUATED / RESULT_PUBLISHED no longer exist →
 *      remapped to PROBLEM_SELECTED (team has a problem) / VERIFIED (team is verified) / TEAM_FORMED.
 *   4. $unsets result-publishing fields from the event settings doc
 *      (resultsPublished, resultStatus, resultTitle, resultMessage).
 *   5. Announcements of type "RESULT" → "GENERAL" (the RESULT type was removed).
 *   6. Drops the redundant `isDeleted_1` index on teams (covered by { isDeleted, deletedAt }).
 *
 * It NEVER touches: teams (other than the eventStatus remap), team leader/member users,
 * ADMIN/SUPER_ADMIN users, registrations, OTPs of remaining users, QR tokens, check-ins,
 * problem statements, announcements (other than the type remap) or event settings (other than step 4).
 * Idempotent: running it again finds nothing to do.
 *
 * Take a backup first (mongodump) — dropping a collection cannot be undone.
 */

const EXECUTE = process.argv.includes('--execute')
const REMOVED_COLLECTIONS = ['submissions', 'evaluations', 'judges', 'auditlogs', 'audit_logs', 'participants', 'results']
const REMOVED_EVENT_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'EVALUATED', 'RESULT_PUBLISHED']

async function main() {
  await connectDB()
  const db = mongoose.connection.db
  if (!db) throw new Error('No database handle')
  console.log(EXECUTE ? '\n*** EXECUTE MODE — changes WILL be applied ***\n' : '\n--- DRY RUN (no changes). Re-run with --execute to apply ---\n')

  const existing = new Map((await db.listCollections().toArray()).map((c) => [c.name.toLowerCase(), c.name]))
  const has = (name: string) => existing.get(name.toLowerCase())

  // 1. Collections ------------------------------------------------------------
  let bytesFreed = 0
  for (const name of REMOVED_COLLECTIONS) {
    const real = has(name)
    if (!real) continue
    const stats = await db.command({ collStats: real }).catch(() => null)
    const docs = await db.collection(real).countDocuments()
    const size = (stats?.size ?? 0) + (stats?.totalIndexSize ?? 0)
    bytesFreed += size
    console.log(`[collection] ${real}: ${docs} doc(s), ~${(size / 1024).toFixed(1)} KB incl. indexes -> ${EXECUTE ? 'DROPPING' : 'would drop'}`)
    if (EXECUTE) await db.collection(real).drop()
  }
  if (!bytesFreed) console.log('[collection] none of the removed collections exist')

  // 2. Judge users --------------------------------------------------------------
  const users = db.collection('users')
  const judges = await users.find({ role: 'JUDGE' }, { projection: { _id: 1 } }).toArray()
  if (judges.length) {
    const ids = judges.map((j) => j._id)
    const otps = has('otps') ? await db.collection(has('otps')!).countDocuments({ userId: { $in: ids } }) : 0
    console.log(`[users] ${judges.length} JUDGE account(s) + ${otps} OTP row(s) -> ${EXECUTE ? 'DELETING' : 'would delete'}`)
    if (EXECUTE) {
      if (otps) await db.collection(has('otps')!).deleteMany({ userId: { $in: ids } })
      await users.deleteMany({ _id: { $in: ids }, role: 'JUDGE' })
    }
  } else console.log('[users] no JUDGE accounts')

  // 3. Team event statuses --------------------------------------------------------
  const teams = db.collection('teams')
  const staleTeams = await teams.countDocuments({ eventStatus: { $in: REMOVED_EVENT_STATUSES } })
  console.log(`[teams] ${staleTeams} team(s) with a removed eventStatus -> ${EXECUTE ? 'remapping' : 'would remap'}`)
  if (EXECUTE && staleTeams) {
    await teams.updateMany({ eventStatus: { $in: REMOVED_EVENT_STATUSES } }, [
      {
        $set: {
          eventStatus: {
            $switch: {
              branches: [
                { case: { $ne: [{ $ifNull: ['$problemStatement', null] }, null] }, then: 'PROBLEM_SELECTED' },
                { case: { $eq: ['$verificationStatus', 'VERIFIED'] }, then: 'VERIFIED' },
              ],
              default: 'TEAM_FORMED',
            },
          },
        },
      },
    ])
  }

  // 4. Event settings -------------------------------------------------------------
  if (has('events')) {
    const ev = db.collection(has('events')!)
    const n = await ev.countDocuments({ $or: [{ resultsPublished: { $exists: true } }, { resultStatus: { $exists: true } }, { resultTitle: { $exists: true } }, { resultMessage: { $exists: true } }] })
    console.log(`[events] ${n} settings doc(s) with result fields -> ${EXECUTE ? 'unsetting' : 'would unset'}`)
    if (EXECUTE && n) await ev.updateMany({}, { $unset: { resultsPublished: '', resultStatus: '', resultTitle: '', resultMessage: '' } })
  }

  // 5. Announcements --------------------------------------------------------------
  if (has('announcements')) {
    const an = db.collection(has('announcements')!)
    const n = await an.countDocuments({ type: 'RESULT' })
    console.log(`[announcements] ${n} announcement(s) of removed type RESULT -> ${EXECUTE ? 'set to GENERAL' : 'would set to GENERAL'}`)
    if (EXECUTE && n) await an.updateMany({ type: 'RESULT' }, { $set: { type: 'GENERAL' } })
  }

  // 6. Redundant index ------------------------------------------------------------
  if (has('teams')) {
    const idx = await teams.indexes()
    if (idx.some((i) => i.name === 'isDeleted_1')) {
      console.log(`[indexes] teams.isDeleted_1 is redundant -> ${EXECUTE ? 'dropping' : 'would drop'}`)
      if (EXECUTE) await teams.dropIndex('isDeleted_1')
    } else console.log('[indexes] no redundant index on teams')
  }

  console.log(`\nEstimated space released by dropped collections: ~${(bytesFreed / 1024).toFixed(1)} KB (data + indexes)`)
  console.log(EXECUTE ? 'Done.' : 'Dry run complete — nothing was changed.')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[migrate:remove-legacy] failed', err)
  process.exit(1)
})
