import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { CONTENT_FOLDER, SAMPLES_FOLDER } from '@/constants'

const execAsync = promisify(exec)

// Simple logging utilities
const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.log(`❌ ${msg}`),
  step: (msg: string) => console.log(`🚀 ${msg}`),
}

interface SetupOptions {
  skipDocker?: boolean
  skipContent?: boolean
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`)
    return true
  } catch {
    return false
  }
}

/**
 * Validate prerequisites (Node.js, Yarn, Docker)
 */
async function validatePrerequisites(): Promise<void> {
  log.step('Validating prerequisites...')
  
  // Check Node.js version
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
  if (majorVersion < 18) {
    throw new Error(`Node.js 18+ required, found ${nodeVersion}`)
  }
  log.info(`Node.js ${nodeVersion} ✓`)
  
  // Check required commands
  const requiredCommands = ['yarn', 'docker', 'docker-compose']
  for (const cmd of requiredCommands) {
    if (!await commandExists(cmd)) {
      throw new Error(`${cmd} is required but not found`)
    }
    log.info(`${cmd} ✓`)
  }
  
  log.success('Prerequisites validated')
}

/**
 * Check if PostgreSQL is accessible via Prisma
 */
async function checkPostgres(): Promise<boolean> {
  try {
    const { default: prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    return true
  } catch {
    return false
  }
}

/**
 * Check if MeiliSearch is accessible
 */
async function checkMeiliSearch(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:7700/health')
    return response.ok
  } catch {
    return false
  }
}

/**
 * Wait for service to be ready with timeout
 */
async function waitForService(
  checkFn: () => Promise<boolean>,
  serviceName: string,
  timeoutMs: number = 30000
): Promise<void> {
  const startTime = Date.now()
  const intervalMs = 1000
  
  while (Date.now() - startTime < timeoutMs) {
    if (await checkFn()) {
      log.success(`${serviceName} is ready`)
      return
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
    process.stdout.write('.')
  }
  
  throw new Error(`${serviceName} failed to start within ${timeoutMs}ms`)
}

/**
 * Start Docker services and wait for them to be ready
 */
async function startDockerServices(): Promise<void> {
  log.step('Starting Docker services...')
  
  // Check if services are already running
  const postgresRunning = await checkPostgres()
  const meiliRunning = await checkMeiliSearch()
  
  if (postgresRunning && meiliRunning) {
    log.success('Docker services already running')
    return
  }
  
  // Start services
  log.info('Starting docker-compose services...')
  await execAsync('docker-compose up -d')
  
  // Wait for services
  if (!postgresRunning) {
    log.info('Waiting for PostgreSQL...')
    await waitForService(checkPostgres, 'PostgreSQL', 45000)
  }
  
  if (!meiliRunning) {
    log.info('Waiting for MeiliSearch...')
    await waitForService(checkMeiliSearch, 'MeiliSearch', 30000)
  }
  
  log.success('Docker services started')
}

/**
 * Set up database with migrations
 */
async function setupDatabase(): Promise<void> {
  log.step('Setting up database...')
  
  try {
    await execAsync('yarn migrate:dev')
    log.success('Database setup completed')
  } catch (error) {
    throw new Error(`Database setup failed: ${error}`)
  }
}

/**
 * Set up content (detect source and sync)
 */
async function setupContent(): Promise<void> {
  log.step('Setting up content...')
  
  const contentDir = path.join(process.cwd(), 'src', CONTENT_FOLDER)
  const samplesDir = path.join(process.cwd(), 'src', SAMPLES_FOLDER)
  
  // Check content sources
  const hasSubmodule = fs.existsSync(path.join(contentDir, '.git'))
  const hasExistingContent = 
    fs.existsSync(path.join(contentDir, 'js-track')) ||
    fs.existsSync(path.join(contentDir, 'dsa-track'))
  const hasSampleContent = fs.existsSync(samplesDir)
  
  // Determine content setup strategy
  if (hasSubmodule) {
    log.info('Private content submodule detected')
    try {
      await execAsync('git submodule update --init --recursive')
      log.info('Updated submodule content')
    } catch (error) {
      log.info('Submodule update failed, falling back to samples')
      if (hasSampleContent) {
        await execAsync('yarn setup:content')
      } else {
        throw new Error('No fallback content available')
      }
    }
  } else if (hasExistingContent) {
    log.info('Existing content found')
  } else if (hasSampleContent) {
    log.info('Setting up sample content')
    await execAsync('yarn setup:content')
  } else {
    throw new Error('No content source available')
  }
  
  // Sync content to database
  log.info('Syncing content to database...')
  await execAsync('yarn sync:all:dev')
  
  log.success('Content setup completed')
}

/**
 * Run final health checks
 */
async function runHealthChecks(): Promise<void> {
  log.step('Running health checks...')
  
  // Database check
  if (!await checkPostgres()) {
    throw new Error('Database health check failed')
  }
  log.info('Database ✓')
  
  // Search service check
  if (!await checkMeiliSearch()) {
    throw new Error('Search service health check failed')
  }
  log.info('Search service ✓')
  
  // Content check
  const { default: prisma } = await import('@/lib/prisma')
  const courseCount = await prisma.course.count()
  if (courseCount === 0) {
    throw new Error('No courses found in database')
  }
  log.info(`Content: ${courseCount} courses ✓`)
  await prisma.$disconnect()
  
  log.success('All health checks passed')
}

/**
 * Main setup function
 */
export async function setupDevelopmentEnvironment(options: SetupOptions = {}): Promise<void> {
  console.log('🧠 Memoized Development Setup\n')

  try {
    await validatePrerequisites()
    
    if (!options.skipDocker) {
      await startDockerServices()
    }
    
    await setupDatabase()
    
    if (!options.skipContent) {
      await setupContent()
    }
    
    await runHealthChecks()
    
    console.log(`
✅ Setup Complete!

🚀 Your development environment is ready!

Next steps:
  yarn dev          Start the development server
  http://localhost:3000   Open in your browser

Services:
  PostgreSQL:    localhost:5432
  MeiliSearch:   localhost:7700
`)
    
  } catch (error) {
    log.error(`Setup failed: ${error}`)
    
    console.log(`
🛠️  Troubleshooting:
  • Make sure Docker Desktop is running
  • Check if ports 5432 and 7700 are available
  • Try: docker-compose down && docker-compose up -d
  • Ensure you have a valid .env.local file
`)
    
    process.exit(1)
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: yarn setup:dev [options]

Options:
  --skip-docker   Skip Docker service startup
  --skip-content  Skip content setup and sync
  --help, -h      Show this help message

Examples:
  yarn setup:dev                    Full setup
  yarn setup:dev --skip-docker      Setup without starting Docker
`)
    process.exit(0)
  }
  
  const options: SetupOptions = {
    skipDocker: args.includes('--skip-docker'),
    skipContent: args.includes('--skip-content'),
  }
  
  setupDevelopmentEnvironment(options)
}