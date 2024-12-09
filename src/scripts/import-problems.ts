import { PrismaClient, ProblemDifficulty, ProblemType } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

interface QAPair {
  question: string
  answer: string
  sourcePath: string
}

interface OutputData {
  totalQuestions: number
  filesProcessed: Array<{
    path: string
    questionsFound: number
  }>
  qaPairs: QAPair[]
}

async function extractSlugFromPath(sourcePath: string): Promise<string> {
  // Split the path and get the last directory name before page.mdx
  const parts = sourcePath.split('/')
  const pageIndex = parts.findIndex((part) => part === 'page.mdx')
  if (pageIndex > 0) {
    return parts[pageIndex - 1]
  }
  throw new Error(`Could not extract slug from path: ${sourcePath}`)
}

async function migrateQAPairsToProblemTable() {
  try {
    // Read the JSON file containing Q&A pairs
    const jsonPath = path.join(
      process.cwd(),
      'src/content/js-track/interview-questions/all-questions.json',
    )
    const jsonContent = await fs.readFile(jsonPath, 'utf-8')
    const data: OutputData = JSON.parse(jsonContent)

    console.log(`Processing ${data.qaPairs.length} Q&A pairs...`)

    // Process each Q&A pair
    for (const pair of data.qaPairs) {
      try {
        // Extract slug from source path
        const slug = await extractSlugFromPath(pair.sourcePath)

        // Find the lesson using the slug
        const lesson = await prisma.lesson.findUnique({
          where: { slug },
        })

        if (!lesson) {
          console.error(`Could not find lesson for slug: ${slug}`)
          continue
        }

        // Create a URL-friendly href from the question
        const href = `${slug}-${pair.question
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')}`.substring(0, 255) // Ensure it's not too long

        // Create the problem record
        await prisma.problem.create({
          data: {
            title: pair.question,
            question: pair.question,
            answer: pair.answer,
            type: ProblemType.THEORY,
            difficulty: ProblemDifficulty.MEDIUM, // Default difficulty
            href,
            lessonId: lesson.id,
          },
        })

        console.log(
          `Created problem for question: ${pair.question.substring(0, 50)}...`,
        )
      } catch (error) {
        console.error(`Error processing Q&A pair:`, error)
        console.error(`Question: ${pair.question.substring(0, 50)}...`)
        continue
      }
    }

    console.log('\nMigration completed successfully!')
  } catch (error) {
    console.error('Error during migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateQAPairsToProblemTable()
