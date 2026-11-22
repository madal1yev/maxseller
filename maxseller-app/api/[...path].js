// Vercel serverless entrypoint (project root = maxseller-app).
import serverless from 'serverless-http'
import { app } from '../server/index.js'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 60,
}

export default serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/zip'],
})
