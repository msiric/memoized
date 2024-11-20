import fs from 'fs/promises'
import path from 'path'

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

async function extractQuestionsAndAnswers(filePath: string): Promise<QAPair[]> {
  const content = await fs.readFile(filePath, 'utf-8')

  const sectionRegex =
    /## \*\*Common Interview Questions\*\*\n([\s\S]*?)(?=\n---)/
  const sectionMatch = content.match(sectionRegex)

  if (!sectionMatch) return []

  const section = sectionMatch[1].trim()
  const qaPairs: QAPair[] = []

  // Split into question blocks, being more careful with special characters
  const questionBlocks = section
    .split(/(?=\n\s*\d+\.\s*\*\*)/g)
    .filter((block) => block.trim() && block.includes('**Answer'))

  for (const block of questionBlocks) {
    // Match question between first set of ** after the number
    const questionMatch = block.match(/\d+\.\s*\*\*([^]*?)\*\*/)
    if (!questionMatch) continue

    // Find answer start
    const answerStartMatch = block.match(/\n\s*\*\*Answer:?\*\*:?\s*\n/)
    if (!answerStartMatch) continue

    const question = questionMatch[1].trim()
    let answer = block.slice(
      answerStartMatch.index! + answerStartMatch[0].length,
    )

    // Find end of answer, being careful with code blocks
    let inCodeBlock = false
    const answerLines = answer.split('\n')
    let endIndex = answerLines.length

    for (let i = 0; i < answerLines.length; i++) {
      const line = answerLines[i]
      if (line.includes('```')) {
        inCodeBlock = !inCodeBlock
        continue
      }
      if (!inCodeBlock && /^\s*\d+\.\s*\*\*/.test(line)) {
        endIndex = i
        break
      }
    }

    answer = answerLines.slice(0, endIndex).join('\n').trim()

    if (question && answer) {
      qaPairs.push({
        question,
        answer,
        sourcePath: filePath,
      })
    }
  }

  // Validate count (allowing 10 for the special case)
  const expectedCount = filePath.includes('execution-context-and-call-stack')
    ? 10
    : 5
  if (qaPairs.length !== expectedCount) {
    console.log(
      `Warning: Found ${qaPairs.length} Q&A pairs in ${path.basename(filePath)} (expected ${expectedCount})`,
    )
    console.log('Questions found:', qaPairs.map((qa) => qa.question).join('\n'))
  }

  return qaPairs
}

// Rest of the code remains the same...

async function getAllMdxFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function traverse(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await traverse(fullPath)
      } else if (entry.name === 'page.mdx') {
        files.push(fullPath)
      }
    }
  }

  await traverse(dir)
  return files
}

async function processFiles() {
  try {
    const baseDir = path.join(process.cwd(), 'src', 'content', 'js-track')
    console.log(`Searching for MDX files in: ${baseDir}\n`)

    const files = await getAllMdxFiles(baseDir)
    console.log(`Found ${files.length} MDX files\n`)

    const outputData: OutputData = {
      totalQuestions: 0,
      filesProcessed: [],
      qaPairs: [],
    }

    // Keep track of problematic files
    const problematicFiles: string[] = []

    for (const file of files) {
      const relativePath = path.relative(baseDir, file)

      const qaPairs = await extractQuestionsAndAnswers(file)

      if (qaPairs.length > 0) {
        outputData.qaPairs.push(...qaPairs)
        outputData.filesProcessed.push({
          path: relativePath,
          questionsFound: qaPairs.length,
        })
        console.log(
          `Processed ${relativePath}: Found ${qaPairs.length} Q&A pairs`,
        )

        if (qaPairs.length !== 5) {
          problematicFiles.push(relativePath)
        }
      }
    }

    outputData.totalQuestions = outputData.qaPairs.length
    outputData.filesProcessed.sort((a, b) => a.path.localeCompare(b.path))

    const outputDir = path.join(baseDir, 'interview-questions')
    await fs.mkdir(outputDir, { recursive: true })

    const outputPath = path.join(outputDir, 'all-questions.json')
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')

    console.log('\nFinal Summary:')
    console.log(`Total Q&A pairs extracted: ${outputData.totalQuestions}`)
    console.log(`Files with Q&A pairs: ${outputData.filesProcessed.length}`)
    console.log(`Results saved to: ${path.relative(process.cwd(), outputPath)}`)

    if (problematicFiles.length > 0) {
      console.log('\nFiles with incorrect number of Q&A pairs:')
      problematicFiles.forEach((file) => console.log(`- ${file}`))
    }
  } catch (error) {
    console.error('Error processing files:', error)
    process.exit(1)
  }
}

processFiles()
