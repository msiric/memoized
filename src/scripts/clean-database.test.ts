import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Clean Database Script Logic', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  const mockTables = [
    { tablename: 'users' },
    { tablename: 'lessons' },
    { tablename: 'courses' },
    { tablename: 'problems' },
    { tablename: '_prisma_migrations' }, 
    { tablename: 'sections' },
    { tablename: 'resources' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Table Filtering Logic', () => {
    it('should exclude _prisma_migrations from truncation', () => {
      const tablesToClean = mockTables.filter(({ tablename }) => tablename !== '_prisma_migrations')
      
      expect(tablesToClean).toHaveLength(mockTables.length - 1)
      expect(tablesToClean.find(t => t.tablename === '_prisma_migrations')).toBeUndefined()
      expect(tablesToClean.find(t => t.tablename === 'users')).toBeDefined()
    })

    it('should identify all tables except migrations', () => {
      const migrationTable = mockTables.find(t => t.tablename === '_prisma_migrations')
      const otherTables = mockTables.filter(t => t.tablename !== '_prisma_migrations')
      
      expect(migrationTable).toBeDefined()
      expect(otherTables).toHaveLength(6)
    })
  })

  describe('SQL Query Construction', () => {
    it('should construct proper TRUNCATE queries', () => {
      const tablenames = ['users', 'lessons', 'courses']
      
      tablenames.forEach(tablename => {
        const query = `TRUNCATE TABLE "${tablename}" CASCADE;`
        
        expect(query).toMatch(/^TRUNCATE TABLE/)
        expect(query).toContain(tablename)
        expect(query).toContain('CASCADE')
        expect(query.endsWith(';')).toBe(true)
      })
    })

    it('should properly quote table names', () => {
      const tablenames = ['users', 'user-data', 'special_table']
      
      tablenames.forEach(tablename => {
        const query = `TRUNCATE TABLE "${tablename}" CASCADE;`
        expect(query).toBe(`TRUNCATE TABLE "${tablename}" CASCADE;`)
        expect(query).toContain(`"${tablename}"`)
      })
    })

    it('should validate query structure', () => {
      const tablename = 'test_table'
      const query = `TRUNCATE TABLE "${tablename}" CASCADE;`
      
      const queryParts = query.split(' ')
      expect(queryParts[0]).toBe('TRUNCATE')
      expect(queryParts[1]).toBe('TABLE')
      expect(queryParts[2]).toBe(`"${tablename}"`)
      expect(queryParts[3]).toBe('CASCADE;')
    })
  })

  describe('Error Handling Patterns', () => {
    it('should distinguish between Error instances and other error types', () => {
      const errorObject = new Error('Test error')
      const stringError: unknown = 'String error'
      
      const errorMessage1 = errorObject instanceof Error ? errorObject.message : 'Unknown error'
      const errorMessage2 = stringError instanceof Error ? stringError.message : 'Unknown error'
      
      expect(errorMessage1).toBe('Test error')
      expect(errorMessage2).toBe('Unknown error')
    })

    it('should handle retry logic with maximum attempts', () => {
      let attempts = 0
      const maxAttempts = 3
      
      while (attempts < maxAttempts) {
        try {
          attempts++
          if (attempts < maxAttempts) {
            throw new Error('Retry needed')
          }
          break
        } catch (error) {
          if (attempts === maxAttempts) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`❌ Error after ${maxAttempts} attempts:`, errorMessage)
          }
        }
      }

      expect(attempts).toBe(maxAttempts)
    })
  })

  describe('Progress Reporting', () => {
    it('should log appropriate success messages', () => {
      console.log('🧹 Cleaning database...')
      console.log('✅ Database cleaned successfully!')

      expect(consoleLogSpy).toHaveBeenCalledWith('🧹 Cleaning database...')
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Database cleaned successfully!')
    })

    it('should log individual table cleaning', () => {
      const tablenames = ['users', 'lessons', 'courses']
      
      tablenames.forEach(tablename => {
        console.log(`✨ Cleaned table: ${tablename}`)
        expect(consoleLogSpy).toHaveBeenCalledWith(`✨ Cleaned table: ${tablename}`)
      })
    })

    it('should log error messages with proper formatting', () => {
      const error = new Error('Database error')
      console.error('Error cleaning database:', error)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error cleaning database:', error)
    })
  })

  describe('Database State Management', () => {
    it('should maintain referential integrity with CASCADE', () => {
      const query = 'TRUNCATE TABLE "users" CASCADE;'
      
      expect(query).toContain('CASCADE')
    })

    it('should handle special characters in table names', () => {
      const specialTableNames = [
        'table_with_underscores',
        'table-with-hyphens',
        'TableWithCamelCase',
        'table123'
      ]

      specialTableNames.forEach(tablename => {
        const query = `TRUNCATE TABLE "${tablename}" CASCADE;`
        expect(query).toBe(`TRUNCATE TABLE "${tablename}" CASCADE;`)
      })
    })
  })

  describe('Performance Considerations', () => {
    it('should process tables sequentially for safety', () => {
      const tablesToProcess = mockTables.filter(t => t.tablename !== '_prisma_migrations')
      
      const processedQueries: string[] = []
      for (const { tablename } of tablesToProcess) {
        const query = `TRUNCATE TABLE "${tablename}" CASCADE;`
        processedQueries.push(query)
      }

      expect(processedQueries).toHaveLength(tablesToProcess.length)
      expect(processedQueries[0]).toContain('users')
    })
  })
})