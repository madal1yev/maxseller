import { Router } from 'express'
import { registerSchema, loginSchema, profileSchema } from '@maxseller/validation'
import { prisma } from '../prisma.js'
import { hashPassword, signToken, verifyPassword, requireUser } from '../auth.js'
import { serializeUser } from '../utils.js'

export const authRouter = Router()

function withCookie(res: any, token: string) {
  res.cookie('maxseller_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ma\'lumotlar noto\'g\'ri', details: parsed.error.flatten() })

  const { name, email, phone, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' })

  const user = await prisma.user.create({
    data: {
      name, email,
      phone: phone || null,
      passwordHash: hashPassword(password),
    },
  })

  const token = signToken({ sub: user.id, role: user.role, kind: 'USER' })
  withCookie(res, token)
  res.status(201).json({ user: serializeUser(user), token })
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Email va parol kiriting' })

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' })
  }
  if (!user.isActive) return res.status(403).json({ error: 'Hisob faol emas' })

  const token = signToken({ sub: user.id, role: user.role, kind: 'USER' })
  withCookie(res, token)
  res.json({ user: serializeUser(user), token })
})

authRouter.get('/me', requireUser, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' })
  res.json({ user: serializeUser(user) })
})

authRouter.patch('/me', requireUser, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ma\'lumotlar noto\'g\'ri' })

  const user = await prisma.user.update({
    where: { id: req.auth!.sub },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
    },
  })
  res.json({ user: serializeUser(user) })
})
