import { completeCurriculum } from '@/constants'
import { AccessOptions, PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const prisma = new PrismaClient()

async function syncContent() {
  const contentDir = path.join(process.cwd(), 'src/app')

  for (let course of completeCurriculum) {
    const {
      title: courseTitle,
      description: courseDescription,
      curriculum: courseCurriculum,
    } = course
    const courseSlug = slugify(courseTitle, { lower: true })

    const courseRecord = await prisma.course.upsert({
      where: { slug: courseSlug },
      update: {
        title: courseTitle,
        description: courseDescription,
      },
      create: {
        title: courseTitle,
        description: courseDescription,
        slug: courseSlug,
      },
    })

    for (let item of courseCurriculum) {
      const {
        title: contentTitle,
        description: contentDescription,
        href: contentHref,
      } = item
      const slug = slugify(contentTitle, { lower: true })

      const filePath = path.join(contentDir, contentHref, 'page.mdx')
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        continue
      }

      const fileContents = fs.readFileSync(filePath, 'utf-8')

      await prisma.content.upsert({
        where: { slug },
        update: {
          title: contentTitle,
          description: contentDescription,
          body: fileContents,
          access: AccessOptions.FREE,
          courseId: courseRecord.id,
        },
        create: {
          title: contentTitle,
          description: contentDescription,
          slug,
          body: fileContents,
          access: AccessOptions.FREE,
          courseId: courseRecord.id,
        },
      })

      console.log(`Synced: ${contentTitle}`)
    }
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
