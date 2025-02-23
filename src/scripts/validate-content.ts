import chalk from 'chalk'
import fs from 'fs/promises'
import { Ollama } from 'ollama'
import path from 'path'

interface ValidationResult {
  file: string
  feedback: string
}

interface OllamaMessage {
  role: 'user' | 'assistant'
  content: string
}

interface OllamaResponse {
  message: {
    content: string
  }
}

interface ValidatorConfig {
  model: string
  batchSize?: number
  delayBetweenRequests?: number
}

class ContentValidator {
  private ollama: Ollama
  private readonly contentDir: string
  private config: ValidatorConfig

  constructor(config: ValidatorConfig) {
    this.ollama = new Ollama()
    this.contentDir = path.join(process.cwd(), 'src', 'content')
    this.config = {
      batchSize: 5,
      delayBetweenRequests: 1000,
      ...config,
    }
  }

  private async getAllMdxFiles(dir: string): Promise<string[]> {
    const files: string[] = []

    async function scan(directory: string): Promise<void> {
      const entries = await fs.readdir(directory, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name)

        if (entry.isDirectory()) {
          await scan(fullPath)
        } else if (entry.name.endsWith('.mdx')) {
          files.push(fullPath)
        }
      }
    }

    await scan(dir)
    return files
  }

  private async validateContent(content: string): Promise<string> {
    try {
      const prompt = `
                You are a technical content reviewer specializing in software engineering and computer science.
                Please review the following technical content and provide feedback ONLY if you find any technical inaccuracies,
                incorrect information, or areas that need improvement. If the content is fully accurate, respond with "CONTENT_ACCURATE".
                Here's the content to review:
                
                ${content}

                Remember, please only review the content for misinformation or incorrect code snippets and don't offer suggestions to enhance the lessons!
                We're only interested in the veracity of the lessons. If all the information is correct, please respond with "CONTENT_ACCURATE" and nothing else. 
                Otherwise, provide feedback on what needs to be corrected.
            `

      const response = (await this.ollama.chat({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }] as OllamaMessage[],
      })) as OllamaResponse

      return response.message.content.trim()
    } catch (error) {
      console.error(chalk.red('Error during content validation:'), error)
      return 'ERROR_DURING_VALIDATION'
    }
  }

  private async saveValidationResults(
    results: ValidationResult[],
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(
      process.cwd(),
      'validation-results',
      `validation-${timestamp}.json`,
    )

    // Create validation-results directory if it doesn't exist
    await fs.mkdir(path.join(process.cwd(), 'validation-results'), {
      recursive: true,
    })

    // Only save results that have feedback (exclude "CONTENT_ACCURATE" responses)
    const filteredResults = results.filter(
      (result) => result.feedback !== 'CONTENT_ACCURATE',
    )

    await fs.writeFile(outputFile, JSON.stringify(filteredResults, null, 2))

    return outputFile
  }

  public async validateAll(): Promise<void> {
    try {
      console.log(chalk.blue('Starting content validation...'))

      const mdxFiles = await this.getAllMdxFiles(this.contentDir)
      console.log(
        chalk.yellow(`Found ${mdxFiles.length} MDX files to validate`),
      )

      const results: ValidationResult[] = []

      for (const [index, file] of mdxFiles.entries()) {
        console.log(
          chalk.cyan(
            `Validating file ${index + 1}/${mdxFiles.length}: ${file}`,
          ),
        )

        const content = await fs.readFile(file, 'utf-8')
        const feedback = await this.validateContent(content)

        if (feedback !== 'CONTENT_ACCURATE') {
          results.push({
            file: file.replace(process.cwd(), ''),
            feedback,
          })

          console.log(chalk.yellow('⚠️  Feedback received for this file'))
        } else {
          console.log(chalk.green('✓ Content accurate'))
        }
      }

      if (results.length > 0) {
        const outputFile = await this.saveValidationResults(results)
        console.log(
          chalk.green(`\nValidation complete! Results saved to: ${outputFile}`),
        )
        console.log(
          chalk.yellow(`Found ${results.length} files that need review`),
        )
      } else {
        console.log(
          chalk.green('\nValidation complete! All content is accurate.'),
        )
      }
    } catch (error) {
      console.error(chalk.red('Error during validation:'), error)
      process.exit(1)
    }
  }
}

// Use llama2 by default as it's well optimized for M1
const config: ValidatorConfig = {
  model: process.env.OLLAMA_MODEL || 'llama2:7b-chat',
}

const validator = new ContentValidator(config)
validator.validateAll()
