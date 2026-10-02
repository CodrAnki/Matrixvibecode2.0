import { apiFetch } from '../lib/api'

export interface QrResponse { teamId: string; checkedIn: boolean; qr: { url: string; expiresAt: string } }

export const getMyQr = () => apiFetch<QrResponse>('/teams/me/qr')
// Regeneration is a SUPER_ADMIN-only admin-panel action — teams cannot reissue their own QR.
