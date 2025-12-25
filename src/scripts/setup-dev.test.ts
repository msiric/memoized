/**
 * Simplified Test Suite for setup-dev.ts
 * 
 * Tests for the streamlined development environment setup script.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Mock external dependencies
vi.mock('fs')
vi.mock('child_process')
vi.mock('@/lib/prisma', () => ({
  default: {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
    course: {
      count: vi.fn()
    }
  }
}))

vi.mock('@/constants', () => ({
  CONTENT_FOLDER: 'content',
  SAMPLES_FOLDER: 'samples'
}))

global.fetch = vi.fn()

describe('setup-dev.ts (Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('commandExists', () => {
    const commandExists = async (command: string): Promise<boolean> => {
      try {
        await execAsync(`which ${command}`)
        return true
      } catch {
        return false
      }
    }

    it('should return true for existing commands', async () => {
      vi.mocked(execAsync).mockResolvedValue({ stdout: '/usr/bin/node', stderr: '' } as any)
      
      const result = await commandExists('node')
      expect(result).toBe(true)
    })

    it('should return false for non-existing commands', async () => {
      vi.mocked(execAsync).mockRejectedValue(new Error('Command not found'))
      
      const result = await commandExists('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('validatePrerequisites', () => {
    const validatePrerequisites = async (): Promise<void> => {
      // Check Node.js version
      const nodeVersion = process.version
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
      if (majorVersion < 18) {
        throw new Error(`Node.js 18+ required, found ${nodeVersion}`)
      }

      // Check required commands (mocked)
      const commands = ['yarn', 'docker', 'docker-compose']
      for (const cmd of commands) {
        try {
          await execAsync(`which ${cmd}`)
        } catch {
          throw new Error(`${cmd} is required but not found`)
        }
      }
    }

    it('should pass with valid Node.js and required commands', async () => {
      vi.mocked(execAsync).mockResolvedValue({ stdout: '/usr/bin/cmd', stderr: '' } as any)
      
      await expect(validatePrerequisites()).resolves.toBeUndefined()
    })

    it('should throw error for missing commands', async () => {
      vi.mocked(execAsync).mockImplementation((cmd: string) => {
        if (cmd === 'which yarn') {
          return Promise.reject(new Error('Command not found')) as any
        }
        return Promise.resolve({ stdout: '/usr/bin/cmd', stderr: '' }) as any
      })
      
      await expect(validatePrerequisites()).rejects.toThrow('yarn is required but not found')
    })
  })

  describe('checkPostgres', () => {
    const checkPostgres = async (): Promise<boolean> => {
      try {
        const { default: prisma } = await import('@/lib/prisma')
        await prisma.$queryRaw`SELECT 1`
        await prisma.$disconnect()
        return true
      } catch {
        return false
      }
    }

    it('should return true when PostgreSQL is accessible', async () => {
      const mockPrisma = await import('@/lib/prisma')
      vi.mocked(mockPrisma.default.$queryRaw).mockResolvedValue([{ '?column?': 1 }])
      vi.mocked(mockPrisma.default.$disconnect).mockResolvedValue()
      
      const result = await checkPostgres()
      expect(result).toBe(true)
    })

    it('should return false when PostgreSQL is not accessible', async () => {
      const mockPrisma = await import('@/lib/prisma')
      vi.mocked(mockPrisma.default.$queryRaw).mockRejectedValue(new Error('Connection failed'))
      
      const result = await checkPostgres()
      expect(result).toBe(false)
    })
  })

  describe('checkMeiliSearch', () => {
    const checkMeiliSearch = async (): Promise<boolean> => {
      try {
        const response = await fetch('http://localhost:7700/health')
        return response.ok
      } catch {
        return false
      }
    }

    it('should return true when MeiliSearch is accessible', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
      
      const result = await checkMeiliSearch()
      expect(result).toBe(true)
    })

    it('should return false when MeiliSearch is not accessible', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'))
      
      const result = await checkMeiliSearch()
      expect(result).toBe(false)
    })
  })

  describe('waitForService', () => {
    const waitForService = async (
      checkFn: () => Promise<boolean>,
      serviceName: string,
      timeoutMs: number = 30000
    ): Promise<void> => {
      const startTime = Date.now()
      const intervalMs = 1000
      
      while (Date.now() - startTime < timeoutMs) {
        if (await checkFn()) {
          return
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
      
      throw new Error(`${serviceName} failed to start within ${timeoutMs}ms`)
    }

    it('should resolve immediately if service is ready', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue(true)
      
      await expect(waitForService(mockCheckFn, 'TestService')).resolves.toBeUndefined()
      expect(mockCheckFn).toHaveBeenCalledTimes(1)
    })

    it('should timeout if service never becomes ready', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue(false)
      
      await expect(waitForService(mockCheckFn, 'TestService', 100))
        .rejects.toThrow('TestService failed to start within 100ms')
    })
  })

  describe('setupDatabase', () => {
    const setupDatabase = async (): Promise<void> => {
      try {
        await execAsync('yarn migrate:dev')
      } catch (error) {
        throw new Error(`Database setup failed: ${error}`)
      }
    }

    it('should run Prisma migrations successfully', async () => {
      vi.mocked(execAsync).mockResolvedValue({ stdout: 'Migration completed', stderr: '' } as any)
      
      await expect(setupDatabase()).resolves.toBeUndefined()
      expect(execAsync).toHaveBeenCalledWith('yarn migrate:dev')
    })

    it('should throw error if migrations fail', async () => {
      vi.mocked(execAsync).mockRejectedValue(new Error('Migration failed'))
      
      await expect(setupDatabase()).rejects.toThrow('Database setup failed: Error: Migration failed')
    })
  })

  describe('setupContent', () => {
    const setupContent = async (): Promise<void> => {
      const contentDir = path.join(process.cwd(), 'src', 'content')
      const samplesDir = path.join(process.cwd(), 'src', 'samples')
      
      // Content detection logic
      const hasSubmodule = fs.existsSync(path.join(contentDir, '.git'))
      const hasExistingContent = 
        fs.existsSync(path.join(contentDir, 'js-track')) ||
        fs.existsSync(path.join(contentDir, 'dsa-track'))
      const hasSampleContent = fs.existsSync(samplesDir)
      
      if (hasSubmodule) {
        try {
          await execAsync('git submodule update --init --recursive')
        } catch (_error) {
          if (hasSampleContent) {
            await execAsync('yarn setup:content')
          } else {
            throw new Error('No fallback content available')
          }
        }
      } else if (hasExistingContent) {
        // Keep existing content
      } else if (hasSampleContent) {
        await execAsync('yarn setup:content')
      } else {
        throw new Error('No content source available')
      }
      
      await execAsync('yarn sync:all:dev')
    }

    it('should use submodule if available', async () => {
      const contentDir = path.join(process.cwd(), 'src', 'content')
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return filePath === path.join(contentDir, '.git')
      })
      vi.mocked(execAsync).mockResolvedValue({ stdout: '', stderr: '' } as any)
      
      await setupContent()
      
      expect(execAsync).toHaveBeenCalledWith('git submodule update --init --recursive')
      expect(execAsync).toHaveBeenCalledWith('yarn sync:all:dev')
    })

    it('should setup sample content if available', async () => {
      const samplesDir = path.join(process.cwd(), 'src', 'samples')
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return filePath === samplesDir
      })
      vi.mocked(execAsync).mockResolvedValue({ stdout: '', stderr: '' } as any)
      
      await setupContent()
      
      expect(execAsync).toHaveBeenCalledWith('yarn setup:content')
      expect(execAsync).toHaveBeenCalledWith('yarn sync:all:dev')
    })

    it('should throw error if no content source is available', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      
      await expect(setupContent()).rejects.toThrow('No content source available')
    })
  })

  describe('runHealthChecks', () => {
    const runHealthChecks = async (): Promise<void> => {
      // Database check
      const { default: prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      
      // Search service check  
      const response = await fetch('http://localhost:7700/health')
      if (!response.ok) {
        throw new Error('Search service health check failed')
      }
      
      // Content check
      const courseCount = await prisma.course.count()
      if (courseCount === 0) {
        throw new Error('No courses found in database')
      }
      
      await prisma.$disconnect()
    }

    it('should pass all health checks', async () => {
      const mockPrisma = await import('@/lib/prisma')
      vi.mocked(mockPrisma.default.$queryRaw).mockResolvedValue([{ '?column?': 1 }])
      vi.mocked(mockPrisma.default.course.count).mockResolvedValue(5)
      vi.mocked(mockPrisma.default.$disconnect).mockResolvedValue()
      vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
      
      await expect(runHealthChecks()).resolves.toBeUndefined()
    })

    it('should fail if no content is found', async () => {
      const mockPrisma = await import('@/lib/prisma')
      vi.mocked(mockPrisma.default.$queryRaw).mockResolvedValue([{ '?column?': 1 }])
      vi.mocked(mockPrisma.default.course.count).mockResolvedValue(0)
      vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
      
      await expect(runHealthChecks()).rejects.toThrow('No courses found in database')
    })
  })

  describe('CLI options', () => {
    it('should parse --skip-docker option', () => {
      const args = ['--skip-docker']
      const options = {
        skipDocker: args.includes('--skip-docker'),
        skipContent: args.includes('--skip-content')
      }
      
      expect(options.skipDocker).toBe(true)
      expect(options.skipContent).toBe(false)
    })

    it('should parse --skip-content option', () => {
      const args = ['--skip-content']
      const options = {
        skipDocker: args.includes('--skip-docker'),
        skipContent: args.includes('--skip-content')
      }
      
      expect(options.skipDocker).toBe(false)
      expect(options.skipContent).toBe(true)
    })
  })
})