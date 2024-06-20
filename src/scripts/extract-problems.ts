import { CONTENT_FOLDER } from '@/constants'
import fs from 'fs'
import glob from 'glob'
import path from 'path'

const MDX_DIRECTORY = path.join(__dirname, `../${CONTENT_FOLDER}`)
const UNIQUE_QUESTIONS_FILE = path.join(__dirname, 'unique_questions.mdx')
const DUPLICATE_QUESTIONS_FILE = path.join(__dirname, 'duplicate_questions.mdx')

// Function to extract Practice Problems section from MDX content
const extractPracticeProblems = (content: string): string[] => {
  const practiceProblemsSection = content.match(
    /## \*\*Practice Problems\*\*([\s\S]*?)(##|$)/g,
  )
  if (!practiceProblemsSection) return []

  let problemsList: string[] = []
  practiceProblemsSection.forEach((section) => {
    const problems = section
      .trim()
      .split('\n')
      .filter((line) => line.trim().match(/^\d+\.\s/))
    problemsList = problemsList.concat(
      problems.map((problem) => problem.trim()),
    )
  })
  return problemsList
}

// Function to read MDX files and extract questions with their file paths
const extractQuestionsFromMDXFiles = (
  directory: string,
): { question: string; lesson: string }[] => {
  const files = glob.sync(path.join(directory, '**/*.mdx'))
  const allQuestions: { question: string; lesson: string }[] = []

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8')
    const practiceProblems = extractPracticeProblems(content)
    const lessonPath = path.dirname(file).split(path.sep).pop()
    if (practiceProblems.length > 0) {
      console.log(`Extracted ${practiceProblems.length} problems from ${file}`)
      practiceProblems.forEach((problem) => {
        allQuestions.push({
          question: problem,
          lesson: lessonPath || 'unknown',
        })
      })
    } else {
      console.log(`No problems found in ${file}`)
    }
  })

  return allQuestions
}

// Function to find unique and duplicate questions with their file paths
const findUniqueAndDuplicateQuestions = (
  questions: { question: string; lesson: string }[],
): { uniqueQuestions: string[]; duplicateQuestions: string[] } => {
  const questionCounts: Record<string, { count: number; lessons: string[] }> =
    questions.reduce(
      (
        acc: Record<string, { count: number; lessons: string[] }>,
        { question, lesson },
      ) => {
        if (!acc[question]) {
          acc[question] = { count: 0, lessons: [] }
        }
        acc[question].count += 1
        acc[question].lessons.push(lesson)
        return acc
      },
      {},
    )

  const uniqueQuestions = Object.keys(questionCounts)
    .filter((question) => questionCounts[question].count === 1)
    .map(
      (question) =>
        `${question} (in ${questionCounts[question].lessons.join(', ')})`,
    )

  const duplicateQuestions = Object.keys(questionCounts)
    .filter((question) => questionCounts[question].count > 1)
    .map(
      (question) =>
        `${question} (x${questionCounts[question].count} in ${questionCounts[
          question
        ].lessons.join(', ')})`,
    )

  return { uniqueQuestions, duplicateQuestions }
}

// Function to save questions to a file in MDX format
const saveQuestionsToFile = (
  filePath: string,
  questions: string[],
  title: string,
) => {
  const content = `## ${title}\n\n${questions.map((q) => `- ${q}`).join('\n')}`
  fs.writeFileSync(filePath, content, 'utf8')
}

// Main function
const main = () => {
  const allQuestions = extractQuestionsFromMDXFiles(MDX_DIRECTORY)
  console.log(`Total questions extracted: ${allQuestions.length}`)
  const { uniqueQuestions, duplicateQuestions } =
    findUniqueAndDuplicateQuestions(allQuestions)

  saveQuestionsToFile(
    UNIQUE_QUESTIONS_FILE,
    uniqueQuestions,
    'Unique Questions',
  )
  saveQuestionsToFile(
    DUPLICATE_QUESTIONS_FILE,
    duplicateQuestions,
    'Duplicate Questions',
  )

  console.log(`Unique questions saved to: ${UNIQUE_QUESTIONS_FILE}`)
  console.log(`Duplicate questions saved to: ${DUPLICATE_QUESTIONS_FILE}`)
}

main()
