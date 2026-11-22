import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from './config.js'

export interface AuthPayload {
  sub: string
  role: string
  kind: 'USER' | 'ADMIN'
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    if (typeof decoded === 'string') return null
    const kind = decoded.kind
    if (kind !== 'USER' && kind !== 'ADMIN') return null
    return {
      sub: String(decoded.sub),
      role: String(decoded.role || 'CUSTOMER'),
      kind,
    }
  } catch {
    return null
  }
}

function tokenFrom(req: Request): string | null {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)maxseller_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = verifyToken(tokenFrom(req) || '')
  if (!payload) return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' })
  req.auth = payload
  next()
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const payload = verifyToken(tokenFrom(req) || '')
  if (!payload || payload.kind !== 'USER') return res.status(401).json({ error: 'Mijoz hisobiga kiring' })
  req.auth = payload
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const payload = verifyToken(tokenFrom(req) || '')
  if (!payload || payload.kind !== 'ADMIN') {
    return res.status(payload ? 403 : 401).json({ error: payload ? 'Faqat administrator uchun' : 'Admin hisobiga kiring' })
  }
  req.auth = payload
  next()
}
