/**
 * Optional, MANUAL housekeeping for abandoned registrations: a leader who submitted the form but
 * never entered the emailed OTP leaves a PENDING team + unverified leader account behind forever
 * (they also show up in the admin team list). Nothing runs this automatically.
 *
 *   npm run cleanup:pending                 # dry run: lists what WOULD be removed
 *   npm run cleanup:pending -- --days=14    # change the age threshold (default 7)
 *   npm run cleanup:pending -- --apply      # actually delete
 *
 * Only removes: a Team with registrationStatus 'PENDING' (never OTP-verified), older than N days,
 * with no check-in, together with its own unverified TEAM_LEADER user and OTP rows. Everything
 * else (verified teams, admins, soft-deleted teams) is never touched.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Team } from '../models/Team.js'
import { User } from '../models/User.js'
import { Otp } from '../models/Otp.js'
import { QRToken } from '../models/QRToken.js'
import { CheckIn } from '../models/CheckIn.js'

async function main() {
  const apply = process.argv.includes('--apply')
  const daysArg = process.argv.find((a) => a.startsWith('--days='))
  const days = daysArg ? Number(daysArg.split('=')[1]) : 7
  if (!Number.isFinite(days) || days < 1) throw new Error('--days must be a number >= 1')
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  await connectDB()
  const teams = await Team.find({ registrationStatus: 'PENDING', isDeleted: { $ne: true }, checkedIn: { $ne: true }, createdAt: { $lt: cutoff } }).select('teamId teamName leader createdAt')
  const leaderIds = teams.map((t) => t.leader)
  const leaders = await User.find({ _id: { $in: leaderIds }, role: 'TEAM_LEADER', emailVerified: false }).select('_id email')
  const safeLeaderIds = new Set(leaders.map((u) => String(u._id)))
  const targets = teams.filter((t) => safeLeaderIds.has(String(t.leader)))

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} — ${targets.length} abandoned registration(s) older than ${days} day(s):`)
  for (const t of targets) console.log(`  - ${t.teamId}  ${t.teamName}  (created ${t.createdAt.toISOString()})`)

  if (apply && targets.length) {
    const teamIds = targets.map((t) => t._id)
    const userIds = targets.map((t) => t.leader)
    await QRToken.deleteMany({ team: { $in: teamIds } })
    await CheckIn.deleteMany({ team: { $in: teamIds } })
    await Otp.deleteMany({ userId: { $in: userIds } })
    await User.deleteMany({ _id: { $in: userIds }, role: 'TEAM_LEADER', emailVerified: false })
    await Team.deleteMany({ _id: { $in: teamIds }, registrationStatus: 'PENDING' })
    console.log('Done. (Team IDs are never reused — the counter only moves forward.)')
  } else if (!apply) {
    console.log('Nothing was changed. Re-run with --apply to delete.')
  }
  await mongoose.disconnect()
}

main().catch((err) => { console.error('[cleanup:pending] failed', err); process.exit(1) })
