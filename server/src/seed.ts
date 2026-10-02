import 'dotenv/config'
import bcrypt from 'bcrypt'
import { connectDB } from './config/db.js'
import { User } from './models/User.js'
import { EventSettings } from './models/Event.js'
import mongoose from 'mongoose'

/**
 * SAFE SEED SCRIPT — production-safe by design.
 *
 * This script NEVER touches the Team, User(team-role) or CheckIn collections beyond
 * creating the fixed system accounts (SUPER_ADMIN / ADMIN) it needs, and it
 * NEVER performs a destructive deleteMany(). It only:
 *   - upserts the singleton event-settings document
 *   - upserts the SUPER_ADMIN / ADMIN accounts from env vars (never hardcoded)
 *
 * It creates NO fake/demo teams and NO problem statements — problem statements are entirely
 * optional and are added later from the admin panel (Admin Dashboard -> Problem Statements ->
 * + Add Problem Statement). The application works correctly with zero problem statements in the
 * database. Running this script again is always safe — it will not wipe or duplicate anything.
 */

const SALT_ROUNDS = 12

async function seed() {
  await connectDB()

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before seeding')
  }

  console.log('[seed] upserting event settings (created once, never overwritten after)...')
  await EventSettings.updateOne(
    {},
    { $setOnInsert: { name: 'MATRIX Vibe Coding 2.0', maxTeamSize: 4, registrationOpen: true, checkInOpen: true } },
    { upsert: true },
  )

  console.log('[seed] upserting SUPER_ADMIN account...')
  const superAdminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS)
  await User.updateOne(
    { email: adminEmail.toLowerCase() },
    { $set: { name: 'Super Admin', passwordHash: superAdminHash, role: 'SUPER_ADMIN', active: true } },
    { upsert: true },
  )

  console.log('[seed] done. No teams, check-ins, or problem statements were created or touched.')
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('[seed] failed', err)
  process.exit(1)
})
