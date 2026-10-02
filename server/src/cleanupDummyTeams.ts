import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { Team } from './models/Team.js'
import { User } from './models/User.js'
import { CheckIn } from './models/CheckIn.js'
import { QRToken } from './models/QRToken.js'

/**
 * ONE-TIME, EXPLICIT cleanup of the known dummy/demo teams that pre-date the production-readiness
 * pass. This script is deliberately narrow and safe:
 *   - It matches teams by EXACT teamId only (never by name pattern, never Team.deleteMany({})).
 *   - It never touches ADMIN or SUPER_ADMIN accounts.
 *   - It never touches any team/user that isn't one of the exact ids below.
 *   - It is idempotent: running it again finds zero matches and exits cleanly.
 *
 * It is NOT wired into npm install / dev / start / deploy / seed — it must be run explicitly:
 *   cd server && npm run cleanup:dummy
 */

const DUMMY_TEAM_IDS = ['MTX-10001', 'MTX-10002', 'MTX-10003', 'MTX-10004']

async function cleanup() {
  // These IDs (MTX-10001..10004) are ALSO what the first real registrations receive on a fresh
  // database. Deleting by ID is only safe if you have looked at the list below, so require --yes.
  const confirmed = process.argv.includes('--yes')
  await connectDB()
  console.log('Dummy cleanup started...')

  const teams = await Team.find({ teamId: { $in: DUMMY_TEAM_IDS } })
  console.log(`Teams found: ${teams.length}`)

  if (teams.length === 0) {
    console.log('No dummy teams found — nothing to do.')
    console.log('Cleanup completed successfully.')
    await mongoose.disconnect()
    return
  }

  // Print exactly what will be deleted before touching anything.
  for (const t of teams) {
    console.log(`  - ${t.teamId} (${t.teamName})  _id=${t._id}  leader=${t.leader}`)
  }

  if (!confirmed) {
    console.log('\nDRY RUN — nothing deleted. These may be REAL registrations if this database was started fresh.')
    console.log('Re-run with:  npm run cleanup:dummy -- --yes   only if every team listed above is genuinely dummy data.')
    await mongoose.disconnect()
    return
  }

  const teamIds = teams.map((t) => t._id)
  const leaderIds = teams.map((t) => t.leader).filter(Boolean)

  const runDeletes = async (session?: mongoose.ClientSession) => {
    const opts = session ? { session } : {}

    const qrTokensRemoved = (await QRToken.deleteMany({ team: { $in: teamIds } }, opts)).deletedCount ?? 0
    const checkInsRemoved = (await CheckIn.deleteMany({ team: { $in: teamIds } }, opts)).deletedCount ?? 0

    // Only remove users that (a) belong to one of these exact teams AND (b) are a team
    // account — never ADMIN/SUPER_ADMIN, and never a user tied to any other team.
    const leaderRemoved = (await User.deleteMany(
      { _id: { $in: leaderIds }, team: { $in: teamIds }, role: { $in: ['TEAM_LEADER', 'TEAM_MEMBER'] } },
      opts,
    )).deletedCount ?? 0
    // Also catch any TEAM_MEMBER users whose `team` points at one of these dummy teams but
    // who weren't the team's `leader` field (e.g. separate member-login accounts).
    const extraMemberRemoved = (await User.deleteMany(
      { team: { $in: teamIds }, role: 'TEAM_MEMBER', _id: { $nin: leaderIds } },
      opts,
    )).deletedCount ?? 0
    const teamsRemoved = (await Team.deleteMany({ _id: { $in: teamIds } }, opts)).deletedCount ?? 0

    return {
      qrTokensRemoved, checkInsRemoved,
      teamUsersRemoved: leaderRemoved + extraMemberRemoved, teamsRemoved,
    }
  }

  let result: Awaited<ReturnType<typeof runDeletes>> | null = null
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      result = await runDeletes(session)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const noTransactionSupport = /Transaction numbers are only allowed on a replica set|IllegalOperation|Transactions are not supported/i.test(message)
    if (!noTransactionSupport) throw err
    console.warn('[cleanup:dummy] this MongoDB deployment does not support transactions (standalone server) — falling back to sequential deletes without a transaction.')
    result = await runDeletes()
  } finally {
    await session.endSession()
  }
  if (!result) throw new Error('Cleanup produced no result — this should be unreachable')

  console.log(`QR tokens removed: ${result.qrTokensRemoved}`)
  console.log(`Check-ins removed: ${result.checkInsRemoved}`)
  console.log(`Team users removed: ${result.teamUsersRemoved}`)
  console.log(`Teams removed: ${result.teamsRemoved}`)
  console.log('Cleanup completed successfully.')
  await mongoose.disconnect()
}

cleanup().catch((err) => {
  console.error('[cleanup:dummy] failed', err)
  process.exit(1)
})
