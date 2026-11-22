// Vercel serverless entrypoint: Express is a native Node (req, res) handler.
// Static store/admin pages are served from maxseller-app/dist by Vercel itself.
import { app } from '../maxseller-app/server/index.js'

export const config = {
  maxDuration: 60,
}

export default function handler(req, res) {
  return app(req, res)
}
