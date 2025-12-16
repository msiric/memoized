import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { Highlighter, getSingletonHighlighter } from 'shiki'

const mockHighlighter = {
  codeToHtml: vi.fn(),
  getLoadedLanguages: vi.fn(),
  getLoadedThemes: vi.fn(),
}

vi.mock('shiki', () => ({
  getSingletonHighlighter: vi.fn(),
  Highlighter: vi.fn(),
}))

describe('Shiki Highlighter Library', () => {
  let getSharedHighlighter: any
  let highlightCode: any

  beforeEach(async () => {
    vi.clearAllMocks()

    vi.resetModules()

    const mockedGetSingletonHighlighter = vi.mocked(getSingletonHighlighter)
    mockedGetSingletonHighlighter.mockResolvedValue(mockHighlighter as any)

    mockHighlighter.codeToHtml.mockResolvedValue(
      '<pre><code>highlighted code</code></pre>',
    )
    mockHighlighter.getLoadedLanguages.mockReturnValue([
      'javascript',
      'typescript',
      'python',
    ])
    mockHighlighter.getLoadedThemes.mockReturnValue(['github-dark', 'nord'])

    const shikiModule = await import('@/lib/shiki')
    getSharedHighlighter = shikiModule.getSharedHighlighter
    highlightCode = shikiModule.highlightCode
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSharedHighlighter', () => {
    it('should create and return a highlighter instance', async () => {
      const highlighter = await getSharedHighlighter()

      expect(getSingletonHighlighter).toHaveBeenCalledTimes(1)
      expect(highlighter).toBe(mockHighlighter)
    })

    it('should be configured with correct themes and languages', async () => {
      await getSharedHighlighter()

      expect(getSingletonHighlighter).toHaveBeenCalledWith({
        themes: ['github-dark', 'nord'],
        langs: expect.arrayContaining([
          expect.objectContaining({ name: 'dotenv', displayName: 'dotEnv' }),
          expect.objectContaining({ name: 'groovy', displayName: 'Groovy' }),
          'python',
          'dockerfile',
          'json',
          'yaml',
          'http',
          'html',
          'css',
          'javascript',
          'typescript',
          'jsx',
          'tsx',
        ]),
      })
    })

    it('should return the same instance on multiple calls (singleton)', async () => {
      const highlighter1 = await getSharedHighlighter()
      const highlighter2 = await getSharedHighlighter()

      expect(highlighter1).toBe(highlighter2)
      expect(getSingletonHighlighter).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent calls correctly', async () => {
      const promises = [
        getSharedHighlighter(),
        getSharedHighlighter(),
        getSharedHighlighter(),
      ]

      const results = await Promise.all(promises)

      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
      expect(getSingletonHighlighter).toHaveBeenCalledTimes(1)
    })
  })

  describe('highlightCode', () => {
    it('should highlight code with default parameters', async () => {
      const code = 'console.log("Hello World")'

      const result = await highlightCode(code)

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'js',
        theme: 'nord',
      })
      expect(result).toBe('<pre><code>highlighted code</code></pre>')
    })

    it('should highlight code with custom language and theme', async () => {
      const code = 'print("Hello World")'

      const result = await highlightCode(code, 'python', 'github-dark')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'python',
        theme: 'github-dark',
      })
      expect(result).toBe('<pre><code>highlighted code</code></pre>')
    })

    it('should highlight code with only language specified', async () => {
      const code = 'const x = 42'

      const result = await highlightCode(code, 'typescript')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'typescript',
        theme: 'nord',
      })
    })

    it('should handle empty code', async () => {
      const result = await highlightCode('')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith('', {
        lang: 'js',
        theme: 'nord',
      })
    })

    it('should handle multiline code', async () => {
      const code = `function hello() {
  console.log("Hello World")
  return true
}`

      const result = await highlightCode(code, 'javascript')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'javascript',
        theme: 'nord',
      })
    })
  })

  describe('Custom Language Support', () => {
    it('should support dotenv language', async () => {
      const envCode = `DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=secret123
# This is a comment
DEBUG=true`

      await highlightCode(envCode, 'dotenv')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(envCode, {
        lang: 'dotenv',
        theme: 'nord',
      })
    })

    it('should support groovy language', async () => {
      const groovyCode = `class HelloWorld {
    static void main(String[] args) {
        println 'Hello, World!'
    }
}`

      await highlightCode(groovyCode, 'groovy')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(groovyCode, {
        lang: 'groovy',
        theme: 'nord',
      })
    })

    it('should verify dotenv language definition structure', async () => {
      await getSharedHighlighter()

      const config = vi.mocked(getSingletonHighlighter).mock.calls[0][0]!
      const dotenvLang = config.langs!.find(
        (lang: any) => typeof lang === 'object' && lang.name === 'dotenv',
      )

      expect(dotenvLang).toBeDefined()
      expect(dotenvLang).toMatchObject({
        displayName: 'dotEnv',
        name: 'dotenv',
        scopeName: 'source.dotenv',
        patterns: expect.any(Array),
        repository: expect.any(Object),
      })
    })

    it('should verify groovy language definition structure', async () => {
      await getSharedHighlighter()

      const config = vi.mocked(getSingletonHighlighter).mock.calls[0][0]!
      const groovyLang = config.langs!.find(
        (lang: any) => typeof lang === 'object' && lang.name === 'groovy',
      )

      expect(groovyLang).toBeDefined()
      expect(groovyLang).toMatchObject({
        displayName: 'Groovy',
        name: 'groovy',
        scopeName: 'source.groovy',
        patterns: expect.any(Array),
        repository: expect.any(Object),
      })
    })
  })

  describe('Supported Languages', () => {
    const expectedLanguages = [
      'python',
      'dockerfile',
      'json',
      'yaml',
      'http',
      'html',
      'css',
      'javascript',
      'typescript',
      'jsx',
      'tsx',
    ]

    expectedLanguages.forEach((lang) => {
      it(`should support ${lang} language`, async () => {
        const code = 'sample code'

        await highlightCode(code, lang)

        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
          lang,
          theme: 'nord',
        })
      })
    })
  })

  describe('Supported Themes', () => {
    const expectedThemes = ['github-dark', 'nord']

    expectedThemes.forEach((theme) => {
      it(`should support ${theme} theme`, async () => {
        const code = 'console.log("test")'

        await highlightCode(code, 'javascript', theme)

        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
          lang: 'javascript',
          theme,
        })
      })
    })

    it('should configure highlighter with all supported themes', async () => {
      await getSharedHighlighter()

      const config = vi.mocked(getSingletonHighlighter).mock.calls[0][0]!
      expect(config.themes).toEqual(expectedThemes)
    })
  })

  describe('Error Handling', () => {
    it('should handle highlighter creation errors', async () => {
      const mockedGetSingletonHighlighter = vi.mocked(getSingletonHighlighter)
      mockedGetSingletonHighlighter.mockRejectedValue(
        new Error('Failed to load highlighter'),
      )

      await expect(getSharedHighlighter()).rejects.toThrow(
        'Failed to load highlighter',
      )
    })

    it('should handle code highlighting errors', async () => {
      mockHighlighter.codeToHtml.mockRejectedValue(
        new Error('Highlighting failed'),
      )

      await expect(highlightCode('test code')).rejects.toThrow(
        'Highlighting failed',
      )
    })

    it('should handle invalid language gracefully', async () => {
      const code = 'some code'

      await highlightCode(code, 'invalid-language')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'invalid-language',
        theme: 'nord',
      })
    })

    it('should handle invalid theme gracefully', async () => {
      const code = 'some code'

      await highlightCode(code, 'javascript', 'invalid-theme')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'javascript',
        theme: 'invalid-theme',
      })
    })
  })

  describe('Configuration Validation', () => {
    it('should configure highlighter with correct number of languages', async () => {
      await getSharedHighlighter()

      const config = vi.mocked(getSingletonHighlighter).mock.calls[0][0]!

      expect(config.langs).toHaveLength(13)
    })

    it('should configure highlighter with correct number of themes', async () => {
      await getSharedHighlighter()

      const config = vi.mocked(getSingletonHighlighter).mock.calls[0][0]!
      expect(config.themes).toHaveLength(2)
    })

    it('should include both custom and built-in languages', async () => {
      await getSharedHighlighter()

      const config = vi.mocked(getSingletonHighlighter).mock.calls[0][0]!
      const langNames = config.langs!.map((lang: any) =>
        typeof lang === 'string' ? lang : lang.name,
      )

      expect(langNames).toContain('dotenv')
      expect(langNames).toContain('groovy')
      expect(langNames).toContain('javascript')
      expect(langNames).toContain('typescript')
      expect(langNames).toContain('python')
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should highlight JavaScript code correctly', async () => {
      const jsCode = `import React from 'react'

export const Component = () => {
  const [count, setCount] = useState(0)
  return <div>{count}</div>
}`

      await highlightCode(jsCode, 'javascript', 'github-dark')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(jsCode, {
        lang: 'javascript',
        theme: 'github-dark',
      })
    })

    it('should highlight TypeScript code correctly', async () => {
      const tsCode = `interface User {
  id: number
  name: string
}

const getUser = async (id: number): Promise<User> => {
  return fetch(\`/api/users/\${id}\`).then(res => res.json())
}`

      await highlightCode(tsCode, 'typescript')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(tsCode, {
        lang: 'typescript',
        theme: 'nord',
      })
    })

    it('should highlight environment files correctly', async () => {
      const envCode = `# Database Configuration
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
DATABASE_SSL=true

# API Keys
STRIPE_SECRET_KEY=sk_test_123456789
STRIPE_WEBHOOK_SECRET=whsec_123456789

# Feature Flags
export FEATURE_NEW_UI=enabled`

      await highlightCode(envCode, 'dotenv', 'github-dark')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(envCode, {
        lang: 'dotenv',
        theme: 'github-dark',
      })
    })

    it('should highlight Dockerfile correctly', async () => {
      const dockerCode = `FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000
CMD ["npm", "start"]`

      await highlightCode(dockerCode, 'dockerfile')

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(dockerCode, {
        lang: 'dockerfile',
        theme: 'nord',
      })
    })
  })

  describe('Performance and Memory', () => {
    it('should not create multiple highlighter instances', async () => {
      await getSharedHighlighter()
      await getSharedHighlighter()
      await getSharedHighlighter()

      expect(getSingletonHighlighter).toHaveBeenCalledTimes(1)
    })

    it('should handle rapid sequential highlighting calls', async () => {
      const codes = ['console.log("test1")', 'print("test2")', 'echo "test3"']

      const results = await Promise.all([
        highlightCode(codes[0], 'javascript'),
        highlightCode(codes[1], 'python'),
        highlightCode(codes[2], 'bash'),
      ])

      expect(results).toHaveLength(3)
      expect(mockHighlighter.codeToHtml).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle code with special characters', async () => {
      const code = 'const message = "Hello 🌍 with émojis & spéciål chars!"'

      await highlightCode(code)

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(code, {
        lang: 'js',
        theme: 'nord',
      })
    })

    it('should handle very long code strings', async () => {
      const longCode = 'console.log("test");'.repeat(1000)

      await highlightCode(longCode)

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(longCode, {
        lang: 'js',
        theme: 'nord',
      })
    })

    it('should handle code with only whitespace', async () => {
      const whitespaceCode = '   \n\t   \n   '

      await highlightCode(whitespaceCode)

      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(whitespaceCode, {
        lang: 'js',
        theme: 'nord',
      })
    })
  })
})
