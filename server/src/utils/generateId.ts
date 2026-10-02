import { Counter } from '../models/Counter.js'
import { Team } from '../models/Team.js'
import { ProblemStatement } from '../models/ProblemStatement.js'
import { nextSequence, type SequenceStore } from './sequence.js'
import { isDuplicateKeyError } from './dbErrors.js'

const counterStore: SequenceStore = {
  async increment(name) {
    const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true })
    return doc ? doc.seq : null
  },
  async seedIfMissing(name, base) {
    try {
      await Counter.updateOne({ _id: name }, { $setOnInsert: { seq: base } }, { upsert: true })
    } catch (err) {
      // Two first-ever callers raced the upsert; the other one created it. That is exactly what we wanted.
      if (!isDuplicateKeyError(err)) throw err
    }
  },
}

/** Highest numeric suffix among existing IDs like `MTX-10042` (soft-deleted teams included), or `floor` if none. */
async function highestExisting(model: typeof Team | typeof ProblemStatement, field: 'teamId' | 'problemId', prefix: string, floor: number): Promise<number> {
  const rows = await (model as typeof Team).aggregate<{ max: number }>([
    { $match: { [field]: { $regex: new RegExp(`^${prefix}-\\d+$`) } } },
    { $group: { _id: null, max: { $max: { $toDouble: { $substrBytes: [`$${field}`, prefix.length + 1, -1] } } } } },
  ])
  return Math.max(floor, rows[0]?.max ?? 0)
}

/**
 * Next team id, e.g. MTX-10001, MTX-10002 ... — same format as before. Backed by an atomic counter,
 * so 10/50/100 simultaneous registrations always get distinct IDs. IDs are never reused, even after
 * a permanent delete. (A unique index on Team.teamId remains as a last-resort safety net; the
 * registration code also retries on the astronomically unlikely duplicate.)
 */
export async function generateTeamId(): Promise<string> {
  const n = await nextSequence(counterStore, 'teamId', () => highestExisting(Team, 'teamId', 'MTX', 10000))
  return `MTX-${n}`
}

/** Next problem statement id, e.g. PRB-1001, PRB-1002 ... (same atomic mechanism). */
export async function generateProblemId(): Promise<string> {
  const n = await nextSequence(counterStore, 'problemId', () => highestExisting(ProblemStatement, 'problemId', 'PRB', 1000))
  return `PRB-${n}`
}

export function generateMemberId(): string {
  return 'MBR-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function generateCheckInId(): string {
  return 'CHK-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}
