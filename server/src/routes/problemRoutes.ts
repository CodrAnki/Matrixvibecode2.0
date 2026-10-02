import { Router } from 'express'
import { listProblems } from '../controllers/problemController.js'

const router = Router()
// PUBLIC (homepage): only published, non-deleted problem statements are returned here — the controller
// only includes drafts for an authenticated admin, and admins use /api/admin/problems for that anyway.
router.get('/', listProblems)

export default router
