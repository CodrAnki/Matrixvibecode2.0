import { apiFetch } from '../lib/api'
import type { Announcement } from '../lib/types'

export const listAnnouncements = () => apiFetch<{ announcements: Announcement[] }>('/announcements').then((r) => r.announcements)
