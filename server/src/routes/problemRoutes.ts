import { Router } from 'express'
import { listPublicProblems } from '../controllers/problemController.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()
// PUBLIC: empty until the official reveal; optionalAuth only so a signed-in admin can preview.
router.get('/', optionalAuth, listPublicProblems)

export default router
