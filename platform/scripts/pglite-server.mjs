import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import path from 'node:path'

const dataDir = path.resolve(process.env.PGLITE_DATA_DIR || './.pglite')
const port = Number(process.env.PGLITE_PORT || 55433)

const db = new PGlite(dataDir)
await db.waitReady

const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
await server.start()
console.log(`PGlite (PostgreSQL WASM) tayyor: postgresql://postgres:postgres@127.0.0.1:${port}/postgres`)

async function shutdown() {
  await server.stop()
  await db.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
