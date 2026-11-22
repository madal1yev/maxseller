// Vercel serverless entrypoint: the whole Express API runs as one Node function.
// Static store/admin pages are served from maxseller-app/dist by Vercel itself.
import serverless from 'serverless-http'
import { app } from '../maxseller-app/server/index.js'

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
