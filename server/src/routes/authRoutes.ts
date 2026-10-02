import { Router } from 'express'
import { registerTeam, loginTeam, getMe, logout } from '../controllers/authController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.post('/register', registerTeam)
router.post('/login', loginTeam)
router.get('/me', requireAuth, requireRole('TEAM_LEADER', 'TEAM_MEMBER'), getMe)
router.post('/logout', logout)

export default router
