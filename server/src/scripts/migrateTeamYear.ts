/**
 * One-off, idempotent: copies the legacy Team.year ("First Year" ...) into the new optional
 * Team.teamYear. "First Year" -> "1st Year"; any other legacy value -> null (not specified).
 * Run: npm run migrate:team-year   (safe to re-run; only touches docs that still have `year`)
 */
import 'dotenv/config'
import mongoose from 'mongoose'

async function main() {
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/matrix_vibe_coding_2')
  const teams = mongoose.connection.collection('teams')
  const a = await teams.updateMany({ year: 'First Year' }, { $set: { teamYear: '1st Year' }, $unset: { year: '' } })
  const b = await teams.updateMany({ year: { $exists: true } }, { $set: { teamYear: null }, $unset: { year: '' } })
  console.log(`migrated: ${a.modifiedCount} -> "1st Year", ${b.modifiedCount} -> null`)
  await mongoose.disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
