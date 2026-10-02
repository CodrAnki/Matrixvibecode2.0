import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { User } from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'

const SALT_ROUNDS = 12 // same cost factor as authController
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const
type AdminRole = (typeof ADMIN_ROLES)[number]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/

/** SUPER_ADMIN accounts may only be created/promoted when explicitly enabled via env. */
const superAdminCreationEnabled = () => process.env.ALLOW_SUPER_ADMIN_CREATION === 'true'

function serializeAccount(u: { _id: unknown; name: string; email: string; phone?: string | null; role: string; active: boolean; createdAt?: Date }) {
  // passwordHash is select:false and is never copied here — passwords never leave the server.
  return { id: u._id, name: u.name, email: u.email, phone: u.phone ?? '', role: u.role, active: u.active, createdAt: u.createdAt }
}

function requireText(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(422, `${field} is required.`, 'VALIDATION_ERROR')
  if (value.trim().length > max) throw new ApiError(422, `${field} must be ${max} characters or fewer.`, 'VALIDATION_ERROR')
  return value.trim()
}

function validatePassword(password: unknown, confirm: unknown): string {
  if (typeof password !== 'string' || password.length < 8) throw new ApiError(422, 'Password must be at least 8 characters.', 'VALIDATION_ERROR')
  if (password.length > 72) throw new ApiError(422, 'Password must be 72 characters or fewer.', 'VALIDATION_ERROR') // bcrypt truncates beyond 72 bytes
  if (confirm !== undefined && confirm !== password) throw new ApiError(422, 'Password and confirmation do not match.', 'VALIDATION_ERROR')
  return password
}

function validateRole(role: unknown): AdminRole {
  if (typeof role !== 'string' || !(ADMIN_ROLES as readonly string[]).includes(role)) throw new ApiError(422, 'Role must be ADMIN or SUPER_ADMIN.', 'VALIDATION_ERROR')
  if (role === 'SUPER_ADMIN' && !superAdminCreationEnabled()) {
    throw new ApiError(403, 'Creating Super Admin accounts is disabled. Set ALLOW_SUPER_ADMIN_CREATION=true on the server to enable it.', 'SUPER_ADMIN_CREATION_DISABLED')
  }
  return role as AdminRole
}

/** Never let the system end up with zero active SUPER_ADMINs (would lock everyone out of this screen). */
async function assertNotLastSuperAdmin(target: { _id: unknown; role: string; active: boolean }) {
  if (target.role !== 'SUPER_ADMIN' || !target.active) return
  const others = await User.countDocuments({ role: 'SUPER_ADMIN', active: true, _id: { $ne: target._id } })
  if (others === 0) throw new ApiError(409, 'This is the only active Super Admin. Create another Super Admin first.', 'LAST_SUPER_ADMIN')
}

/** Loads an ADMIN/SUPER_ADMIN target only — team leaders can never be touched through this API. */
async function loadAdminTarget(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(404, 'Admin account not found.')
  const target = await User.findOne({ _id: id, role: { $in: ADMIN_ROLES } })
  if (!target) throw new ApiError(404, 'Admin account not found.')
  return target
}

/** GET /api/admin/accounts */
export const listAccounts = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({ role: { $in: ADMIN_ROLES } }).sort({ createdAt: -1 }).limit(200)
  res.json({ success: true, accounts: users.map(serializeAccount), superAdminCreationEnabled: superAdminCreationEnabled() })
})

/** POST /api/admin/accounts */
export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const name = requireText(body.name, 'Full name')
  const email = requireText(body.email, 'Email', 254).toLowerCase()
  if (!EMAIL_RE.test(email)) throw new ApiError(422, 'Enter a valid email address.', 'VALIDATION_ERROR')
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(422, 'Enter a valid phone number.', 'VALIDATION_ERROR')
  const password = validatePassword(body.password, body.confirmPassword)
  const role = validateRole(body.role ?? 'ADMIN')

  // One email = one account across ALL roles (User.email is globally unique). If a team leader
  // already owns it we refuse — we never silently convert or reuse someone else's account.
  const existing = await User.findOne({ email }).select('_id')
  if (existing) throw new ApiError(409, 'This email is already registered.', 'DUPLICATE')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await User.create({ name, email, phone: phone || undefined, passwordHash, role, active: true, emailVerified: true, createdBy: req.auth?.id })

  res.status(201).json({ success: true, message: 'Admin account created successfully', account: serializeAccount(user) })
})

/** PATCH /api/admin/accounts/:id — edit name/phone, (de)activate, change role, or reset the password. */
export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const target = await loadAdminTarget(req.params.id)
  const isSelf = String(target._id) === String(req.auth?.id)
  const body = (req.body ?? {}) as Record<string, unknown>
  const changed: string[] = []

  if (body.name !== undefined) { target.name = requireText(body.name, 'Full name'); changed.push('name') }
  if (body.phone !== undefined) {
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (phone && !PHONE_RE.test(phone)) throw new ApiError(422, 'Enter a valid phone number.', 'VALIDATION_ERROR')
    target.phone = phone || undefined
    changed.push('phone')
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') throw new ApiError(422, 'active must be true or false.', 'VALIDATION_ERROR')
    if (!body.active) {
      if (isSelf) throw new ApiError(409, 'You cannot deactivate your own account.', 'SELF_PROTECTED')
      await assertNotLastSuperAdmin(target)
    }
    target.active = body.active
    changed.push(body.active ? 'activated' : 'deactivated')
  }
  if (body.role !== undefined && body.role !== target.role) {
    if (isSelf) throw new ApiError(409, 'You cannot change your own role.', 'SELF_PROTECTED')
    const role = validateRole(body.role)
    if (target.role === 'SUPER_ADMIN') await assertNotLastSuperAdmin(target)
    target.role = role
    changed.push('role')
  }
  if (body.password !== undefined && body.password !== '') {
    const password = validatePassword(body.password, body.confirmPassword)
    target.passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    changed.push('password')
  }
  if (!changed.length) throw new ApiError(422, 'Nothing to update.', 'VALIDATION_ERROR')

  await target.save()
  res.json({ success: true, message: 'Admin account updated successfully', account: serializeAccount(target) })
})

/** DELETE /api/admin/accounts/:id */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const target = await loadAdminTarget(req.params.id)
  if (String(target._id) === String(req.auth?.id)) throw new ApiError(409, 'You cannot delete your own account.', 'SELF_PROTECTED')
  await assertNotLastSuperAdmin(target)

  await User.deleteOne({ _id: target._id })
  res.json({ success: true, message: 'Admin account deleted successfully' })
})
