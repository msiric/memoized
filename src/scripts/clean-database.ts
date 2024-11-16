import { PrismaClient } from '@prisma/client'

async function cleanDatabase() {
  const prisma = new PrismaClient()

  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `

    console.log('🧹 Cleaning database...')

    await prisma.$executeRaw`SET session_replication_role = 'replica';`

    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        const query = `TRUNCATE TABLE "${tablename}" CASCADE;`
        await prisma.$executeRawUnsafe(query)
        console.log(`✨ Cleaned table: ${tablename}`)
      }
    }

    await prisma.$executeRaw`SET session_replication_role = 'origin';`

    console.log('✅ Database cleaned successfully!')
  } catch (error) {
    console.error('Error cleaning database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()
