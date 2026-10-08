import { apiFetch } from '../lib/api'
import type { ProblemStatement } from '../lib/types'

export interface PublicProblems {
  problems: ProblemStatement[]
  /** The official reveal has happened. */
  revealed: boolean
  /** The server honoured an admin's pre-reveal preview request. */
  preview: boolean
}

/** Empty until the official reveal. `preview` asks for the admin pre-reveal view; the server
 *  ignores it unless this browser is signed in as an admin. */
export const listProblems = (preview = false) =>
  apiFetch<PublicProblems>(preview ? '/problems?preview=1' : '/problems')
