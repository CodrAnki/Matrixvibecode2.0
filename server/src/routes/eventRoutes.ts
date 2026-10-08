import { Router } from 'express'
import { getEventState } from '../controllers/eventController.js'

const router = Router()
router.get('/state', getEventState)

export default router
