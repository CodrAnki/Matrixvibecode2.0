import { Router } from 'express'
import { listAnnouncements } from '../controllers/announcementController.js'

const router = Router()
// PUBLIC: only PUBLISHED, currently-live announcements are ever returned (see controller).
router.get('/', listAnnouncements)

export default router
