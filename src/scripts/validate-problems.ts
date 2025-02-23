import { ProblemDifficulty, ProblemType } from '@prisma/client'
import chalk from 'chalk'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import {
  ADVANCED_CONCEPTS,
  ADVANCED_TOPICS_PROBLEMS,
  ALL_PROBLEMS,
  BUILT_IN_DATA_STRUCTURES_PROBLEMS,
  COMMON_TECHNIQUES_PROBLEMS,
  CORE_FUNDAMENTALS,
  FRONTEND_DEVELOPMENT,
  TYPESCRIPT_INTRODUCTION,
  USER_DEFINED_DATA_STRUCTURES_PROBLEMS,
} from '../problems'

interface Problem {
  href: string
  title: string
  type: ProblemType
  difficulty: ProblemDifficulty
  question: string
  answer: string
}

interface ValidationResult {
  problem: string
  href: string
  type: ProblemType
  feedback: string
}

type ProblemCollection = {
  [key: string]: Problem[]
}

class ProblemValidator {
  private readonly model: string
  private readonly batchSize: number
  private readonly delayBetweenRequests: number

  constructor(
    options: {
      model?: string
      batchSize?: number
      delayBetweenRequests?: number
    } = {},
  ) {
    // Use llama2 by default as it's well optimized for M1
    this.model = options.model || 'llama2:7b-chat'
    this.batchSize = options.batchSize || 3
    this.delayBetweenRequests = options.delayBetweenRequests || 2000
  }

  private findProblemByHref(href: string): Problem | null {
    const allCollections: ProblemCollection[] = [
      BUILT_IN_DATA_STRUCTURES_PROBLEMS,
      USER_DEFINED_DATA_STRUCTURES_PROBLEMS,
      COMMON_TECHNIQUES_PROBLEMS,
      ADVANCED_TOPICS_PROBLEMS,
      CORE_FUNDAMENTALS,
      TYPESCRIPT_INTRODUCTION,
      ADVANCED_CONCEPTS,
      FRONTEND_DEVELOPMENT,
    ]

    for (const collection of allCollections) {
      for (const problemSet of Object.values(collection)) {
        const problem = problemSet.find((p) => p.href === href)
        if (problem) return problem
      }
    }

    return null
  }

  private async validateCodingSolution(problem: Problem): Promise<string> {
    return new Promise((resolve, reject) => {
      const ollama = spawn('ollama', ['run', this.model], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let output = ''
      let errorOutput = ''

      ollama.stdout.on('data', (data) => {
        output += data.toString()
      })

      ollama.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ollama.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Ollama process exited with code ${code}\n${errorOutput}`,
            ),
          )
          return
        }
        resolve(output.trim())
      })

      // Extract code from markdown code block
      const codeMatch = problem.answer.match(/```typescript\n([\s\S]*?)\n```/)
      const code = codeMatch ? codeMatch[1] : problem.answer

      const prompt = `
                You are a coding problem validator. Review this TypeScript solution for correctness and provide feedback.
                If the solution is correct and optimal, respond with "SOLUTION_ACCURATE".
                If you find issues or potential improvements, explain them.

                Problem: ${problem.question}
                
                Solution:
                ${code}
                
                Please validate if this solution:
                1. Correctly solves the stated problem
                2. Uses optimal time and space complexity
                3. Follows TypeScript best practices
                4. Is well-documented and readable
                5. Handles edge cases appropriately

                Remember, please only review the solutions for misinformation or incorrect code snippets and don't offer suggestions to enhance the solutions!
                We're only interested in the veracity of the solutions. If all the information is correct, please respond with "SOLUTION_ACCURATE" and nothing else. 
                Otherwise, provide feedback on what needs to be corrected.
            
            `

      ollama.stdin.write(prompt)
      ollama.stdin.end()
    })
  }

  private async validateTheorySolution(problem: Problem): Promise<string> {
    return new Promise((resolve, reject) => {
      const ollama = spawn('ollama', ['run', this.model], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let output = ''
      let errorOutput = ''

      ollama.stdout.on('data', (data) => {
        output += data.toString()
      })

      ollama.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ollama.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Ollama process exited with code ${code}\n${errorOutput}`,
            ),
          )
          return
        }
        resolve(output.trim())
      })

      const prompt = `
                You are a technical content validator. Review this theoretical answer for correctness and provide feedback.
                If the answer is correct, comprehensive, and well-explained, respond with "SOLUTION_ACCURATE".
                If you find issues or potential improvements, explain them.

                Question: ${problem.question}
                
                Answer: ${problem.answer}
                
                Please validate if this answer:
                1. Correctly addresses all aspects of the question
                2. Provides accurate technical information
                3. Is comprehensive and detailed enough
                4. Is well-structured and clear
                5. Uses appropriate technical terminology
            `

      ollama.stdin.write(prompt)
      ollama.stdin.end()
    })
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async processBatch(hrefs: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const href of hrefs) {
      const problem = this.findProblemByHref(href)
      if (!problem) {
        console.log(chalk.red(`⚠️  Could not find problem with href: ${href}`))
        continue
      }

      try {
        console.log(
          chalk.cyan(`Validating ${problem.type} problem: ${problem.title}`),
        )

        const feedback =
          problem.type === ProblemType.CODING
            ? await this.validateCodingSolution(problem)
            : await this.validateTheorySolution(problem)

        if (feedback !== 'SOLUTION_ACCURATE') {
          results.push({
            problem: problem.title,
            href: problem.href,
            type: problem.type,
            feedback,
          })
          console.log(chalk.yellow('⚠️  Feedback received for this solution'))
        } else {
          console.log(chalk.green('✓ Solution accurate'))
        }

        // Add delay between requests to prevent overwhelming the M1
        await this.delay(this.delayBetweenRequests)
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error(chalk.red(`Error validating ${problem.title}:`), error)
        results.push({
          problem: problem.title,
          href: problem.href,
          type: problem.type,
          feedback: `ERROR: ${errorMessage}`,
        })
      }
    }

    return results
  }

  private async saveValidationResults(
    results: ValidationResult[],
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(
      process.cwd(),
      'validation-results',
      `problem-validation-${timestamp}.json`,
    )

    await fs.mkdir(path.join(process.cwd(), 'validation-results'), {
      recursive: true,
    })

    // Group results by type for better readability
    const groupedResults = {
      coding: results.filter((r) => r.type === ProblemType.CODING),
      theory: results.filter((r) => r.type === ProblemType.THEORY),
    }

    await fs.writeFile(outputFile, JSON.stringify(groupedResults, null, 2))

    return outputFile
  }

  public async validateProblems(problemHrefs: string[]): Promise<void> {
    try {
      console.log(chalk.blue('Starting problem validation...'))
      console.log(chalk.blue(`Using model: ${this.model}`))

      console.log(
        chalk.yellow(`Found ${problemHrefs.length} problems to validate`),
      )

      const results: ValidationResult[] = []

      // Process problems in batches
      for (let i = 0; i < problemHrefs.length; i += this.batchSize) {
        const batch = problemHrefs.slice(i, i + this.batchSize)
        const batchResults = await this.processBatch(batch)
        results.push(...batchResults)

        console.log(
          chalk.blue(
            `Completed batch ${Math.floor(i / this.batchSize) + 1} of ${Math.ceil(problemHrefs.length / this.batchSize)}`,
          ),
        )
      }

      if (results.length > 0) {
        const outputFile = await this.saveValidationResults(results)
        console.log(
          chalk.green(`\nValidation complete! Results saved to: ${outputFile}`),
        )

        const codingIssues = results.filter(
          (r) => r.type === ProblemType.CODING,
        ).length
        const theoryIssues = results.filter(
          (r) => r.type === ProblemType.THEORY,
        ).length

        console.log(
          chalk.yellow(
            `Found ${codingIssues} coding solutions and ${theoryIssues} theory answers that need review`,
          ),
        )
      } else {
        console.log(
          chalk.green('\nValidation complete! All solutions are accurate.'),
        )
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(chalk.red('Error during validation:'), errorMessage)
      process.exit(1)
    }
  }
}

const validator = new ProblemValidator({
  model: process.env.OLLAMA_MODEL || 'llama2:7b-chat',
  batchSize: 3,
  delayBetweenRequests: 2000,
})

validator.validateProblems(ALL_PROBLEMS)
