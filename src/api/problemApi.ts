import { apiFetch } from '../lib/api'
import type { ProblemStatement } from '../lib/types'

export const listProblems = () => apiFetch<{ problems: ProblemStatement[] }>('/problems').then((r) => r.problems)
