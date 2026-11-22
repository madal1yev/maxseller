// Vercel bridge for every /api/* path (project root = maxseller-app).
// The rewrite passes the original path in ?path= because Vercel rewrites
// replace req.url with the destination path.
import { app } from '../server/index.js'

export const config = {
  maxDuration: 60,
}

export default function handler(req, res) {
  const captured = req.query?.path
  if (typeof captured === 'string' && captured.startsWith('/')) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'path') continue
      if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)))
      else if (value !== undefined && value !== null) params.append(key, String(value))
    }
    const query = params.toString()
    req.url = captured + (query ? `?${query}` : '')
  }
  return app(req, res)
}
