import { Router } from 'express'
import { getMyTeam, updateMyTeam, getTeamByTeamId, addMember, removeMember } from '../controllers/teamController.js'
import { getMyQr } from '../controllers/qrController.js'
import { selectProblem } from '../controllers/problemController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
const teamOnly = [requireAuth, requireRole('TEAM_LEADER', 'TEAM_MEMBER')]

router.get('/me', ...teamOnly, getMyTeam)
router.put('/me', ...teamOnly, updateMyTeam)
router.get('/me/qr', ...teamOnly, getMyQr)
// No self-service regenerate route: only a SUPER_ADMIN may reissue a team's QR (see adminRoutes.ts).
router.post('/me/problem', ...teamOnly, selectProblem)
router.post('/:teamId/members', ...teamOnly, addMember)
router.delete('/:teamId/members/:memberId', ...teamOnly, removeMember)
router.get('/:teamId', ...teamOnly, getTeamByTeamId) // still requires auth — teams cannot browse each other freely

export default router
