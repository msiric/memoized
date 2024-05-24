import { completeCurriculum } from '@/constants'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const prisma = new PrismaClient()

async function syncContent() {
  const contentDir = path.join(process.cwd(), 'src/app')

  for (const item of completeCurriculum) {
    const { title, description, href } = item
    const slug = slugify(title, { lower: true })

    const filePath = path.join(contentDir, href, 'page.mdx')
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      continue
    }

    const fileContents = fs.readFileSync(filePath, 'utf-8')

    await prisma.content.upsert({
      where: { slug },
      update: {
        title,
        description,
        body: fileContents,
        isPremium: false,
      },
      create: {
        title,
        description,
        slug,
        body: fileContents,
        isPremium: false,
      },
    })

    console.log(`Synced: ${title}`)
  }

  await prisma.$disconnect()
}

syncContent()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
