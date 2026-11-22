import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
try {
  const result = await prisma.$queryRaw`select 1 as ok`
  console.log('PRISMA OK', result)
} catch (error) {
  console.error('PRISMA FAIL', error)
} finally {
  await prisma.$disconnect()
}
