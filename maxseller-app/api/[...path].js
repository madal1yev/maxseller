// Vercel serverless entrypoint (project root = maxseller-app).
// Express is a native Node (req, res) handler, so no adapter is needed.
import { app } from '../server/index.js'

export const config = {
  maxDuration: 60,
}

export default function handler(req, res) {
  return app(req, res)
}
