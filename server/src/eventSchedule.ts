import { EventSettings } from './models/Event.js'

/**
 * Registrations close when the event starts: midnight IST on 14 October 2026, the same moment the
 * site's countdown reaches zero. `REGISTRATION_CLOSES_AT` (any ISO date) overrides it, and is read
 * on every call so tests and staging can move it without a restart.
 */
const DEFAULT_CLOSE = '2026-10-14T00:00:00+05:30'

export function registrationClosesAt(): Date {
  const raw = process.env.REGISTRATION_CLOSES_AT
  const d = raw ? new Date(raw) : null
  return d && !Number.isNaN(d.getTime()) ? d : new Date(DEFAULT_CLOSE)
}

/** Open only while the admin "Registration open" switch is on AND the event hasn't started. */
export function isRegistrationOpen(settings: { registrationOpen?: boolean } | null | undefined, now = Date.now()): boolean {
  return settings?.registrationOpen !== false && now < registrationClosesAt().getTime()
}

export async function registrationOpenNow(): Promise<boolean> {
  return isRegistrationOpen(await EventSettings.findOne().select('registrationOpen').lean())
}
