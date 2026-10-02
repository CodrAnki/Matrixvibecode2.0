import 'dotenv/config'
import { createApp } from './app.js'
import { connectDB, ensureIndexes, verifyTtlIndexes, disconnectDB } from './config/db.js'
import { validateEnv } from './config/env.js'
import { verifyEmailTransport } from './services/emailService.js'
import { migrateLegacyAnnouncements } from './models/Announcement.js'

const PORT = Number(process.env.PORT ?? 5000)

async function main() {
  validateEnv() // clear startup error for any missing/invalid configuration — before anything connects
  await verifyEmailTransport() // reports SMTP reachability/credentials once at boot; never throws, never logs secrets
  await connectDB() // throws (and we exit) if MongoDB is unreachable: no silent half-working server
  await ensureIndexes() // unique + TTL indexes exist BEFORE the first request is served
  await verifyTtlIndexes()
  const migrated = await migrateLegacyAnnouncements()
  if (migrated) console.log(`[server] migrated ${migrated} legacy announcement(s) to the status/message schema`)

  const app = createApp()
  const server = app.listen(PORT, () => console.log(`[server] MATRIX Vibe Coding 2.0 API listening on :${PORT}`))
  // Longer than typical proxy/load-balancer idle timeouts, so keep-alive connections aren't cut mid-request.
  server.keepAliveTimeout = 65_000
  server.headersTimeout = 66_000
  server.on('error', (err) => { console.error('[server] listen failed:', err.message); process.exit(1) })

  let closing = false
  const shutdown = (reason: string, exitCode = 0) => {
    if (closing) return
    closing = true
    console.log(`[server] shutting down (${reason})`)
    setTimeout(() => process.exit(exitCode || 1), 10_000).unref() // hard stop if connections won't drain
    server.close(() => { disconnectDB().catch(() => undefined).finally(() => process.exit(exitCode)) })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  // State after an uncaught exception is undefined: stop cleanly and let the process manager restart us.
  process.on('uncaughtException', (err) => { console.error('[process] uncaughtException:', err); shutdown('uncaughtException', 1) })
}

// A stray rejected promise must not take the whole API down; it is logged loudly instead.
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandledRejection:', reason instanceof Error ? (reason.stack ?? reason.message) : reason)
})

main().catch((err) => {
  console.error('[server] failed to start:', err instanceof Error ? err.message : err)
  process.exit(1)
})
