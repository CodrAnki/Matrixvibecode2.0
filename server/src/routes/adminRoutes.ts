import { Router } from 'express'
import {
  listTeams, getTeamDetail, verifyTeam, rejectTeam, requestChanges, disableTeam,
  deleteTeam, listDeletedTeams, restoreTeam, permanentDeleteTeam, deleteTestTeams,
  getDashboardStats, getSettings, updateSettings,
} from '../controllers/adminController.js'
import { loginAdmin, getAdminMe } from '../controllers/authController.js'
import { regenerateQr, verifyQr, confirmCheckIn, listCheckIns, getCheckInForTeam, getTeamQrAdmin } from '../controllers/qrController.js'
import { createProblem, updateProblem, deleteProblem, listProblems, getProblemDetail, publishProblem, unpublishProblem } from '../controllers/problemController.js'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, listAnnouncementsAdmin, publishAnnouncement, unpublishAnnouncement } from '../controllers/announcementController.js'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/accountController.js'
import { getAdminEventState, setProblemsRevealed } from '../controllers/eventController.js'
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Public (no auth) — admin's own login surface
router.post('/login', loginAdmin)
router.get('/me', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), getAdminMe)

// Everything below requires ADMIN or SUPER_ADMIN — TEAM_LEADER/TEAM_MEMBER are forbidden (403)
router.get('/dashboard', ...requireAdmin, getDashboardStats)

router.get('/teams', ...requireAdmin, listTeams)
// Literal paths ('/teams/deleted', '/teams/test') must be registered before the '/teams/:teamId'
// param route below, or Express would match them as teamId='deleted'/'test' instead.
router.get('/teams/deleted', ...requireAdmin, listDeletedTeams)
router.delete('/teams/test', requireAuth, requireSuperAdmin, deleteTestTeams)
router.get('/teams/:teamId', ...requireAdmin, getTeamDetail)
router.patch('/teams/:teamId/verify', ...requireAdmin, verifyTeam)
router.patch('/teams/:teamId/reject', ...requireAdmin, rejectTeam)
router.patch('/teams/:teamId/request-changes', ...requireAdmin, requestChanges)
router.patch('/teams/:teamId/disable', requireAuth, requireSuperAdmin, disableTeam)
router.patch('/teams/:teamId/restore', ...requireAdmin, restoreTeam)
router.delete('/teams/:teamId/permanent', requireAuth, requireSuperAdmin, permanentDeleteTeam)
router.delete('/teams/:teamId', ...requireAdmin, deleteTeam)

router.get('/problems', ...requireAdmin, listProblems)
router.get('/problems/:id', ...requireAdmin, getProblemDetail)
router.post('/problems', ...requireAdmin, createProblem)
router.put('/problems/:id', ...requireAdmin, updateProblem)
router.patch('/problems/:id/publish', ...requireAdmin, publishProblem)
router.patch('/problems/:id/unpublish', ...requireAdmin, unpublishProblem)
router.delete('/problems/:id', ...requireAdmin, deleteProblem)

router.get('/announcements', ...requireAdmin, listAnnouncementsAdmin)
router.post('/announcements', ...requireAdmin, createAnnouncement)
router.put('/announcements/:id', ...requireAdmin, updateAnnouncement)
router.patch('/announcements/:id/publish', ...requireAdmin, publishAnnouncement)
router.patch('/announcements/:id/unpublish', ...requireAdmin, unpublishAnnouncement)
router.delete('/announcements/:id', ...requireAdmin, deleteAnnouncement)

// Admin Accounts — SUPER_ADMIN only, enforced here on the server (the hidden nav link is cosmetic).
router.get('/accounts', requireAuth, requireSuperAdmin, listAccounts)
router.post('/accounts', requireAuth, requireSuperAdmin, createAccount)
router.patch('/accounts/:id', requireAuth, requireSuperAdmin, updateAccount)
router.delete('/accounts/:id', requireAuth, requireSuperAdmin, deleteAccount)

// Problem-statement reveal: same permission level as publishing a problem (ADMIN or SUPER_ADMIN),
// since whoever runs the event floor on the day needs to be able to flip it.
router.get('/event', ...requireAdmin, getAdminEventState)
router.patch('/event/reveal', ...requireAdmin, setProblemsRevealed)

router.get('/settings', ...requireAdmin, getSettings)
router.patch('/settings', requireAuth, requireSuperAdmin, updateSettings)

router.get('/teams/:teamId/qr', ...requireAdmin, getTeamQrAdmin)
router.post('/teams/:teamId/qr/regenerate', requireAuth, requireSuperAdmin, regenerateQr)
router.post('/qr/verify', ...requireAdmin, verifyQr)
router.post('/teams/:teamId/checkin', ...requireAdmin, confirmCheckIn)
router.get('/checkins', ...requireAdmin, listCheckIns)
router.get('/checkins/:teamId', ...requireAdmin, getCheckInForTeam)

export default router
