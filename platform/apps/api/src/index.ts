import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './prisma.js'

const app = createApp()

async function main() {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL ulanish muvaffaqiyatli')
  } catch (err) {
    console.error('❌ PostgreSQL ulanish xatosi:', err instanceof Error ? err.message : err)
    console.error('DATABASE_URL ni tekshiring yoki `npm run db:migrate` ni ishga tushiring.')
  }

  app.listen(config.port, () => {
    console.log(`🚀 MaxSeller API: http://localhost:${config.port}/api`)
  })
}

void main()
