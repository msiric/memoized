import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

async function cleanupDependencies() {
  const filesToRemove = [
    'node_modules',
    '.next',
    'yarn.lock',
    '.yarn/cache',
    '.yarn/unplugged',
    '.yarn/build-state.yml',
    '.yarn/install-state.gz',
    'package-lock.json',
    '.pnp.*',
    'dist',
    'build',
    '.turbo',
  ]

  console.log('🧹 Starting cleanup process...')

  // Remove directories and files with retries
  for (const file of filesToRemove) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        try {
          if (fs.lstatSync(filePath).isDirectory()) {
            // Use a different approach for directories on Windows
            if (process.platform === 'win32' && file === 'node_modules') {
              execSync(`rmdir /s /q "${filePath}"`, {
                stdio: 'ignore',
                shell: 'cmd.exe',
              })
            } else {
              fs.rmSync(filePath, { recursive: true, force: true })
            }
          } else {
            fs.unlinkSync(filePath)
          }
          console.log(`✅ Removed: ${file}`)
          break
        } catch (error) {
          attempts++
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'

          if (attempts === maxAttempts) {
            console.error(
              `❌ Error removing ${file} after ${maxAttempts} attempts:`,
              errorMessage,
            )
            if (process.platform === 'win32') {
              console.log(
                `💡 Tip: This file might be locked. Try:\n` +
                  `   1. Closing VS Code/IDE\n` +
                  `   2. Running terminal as administrator`,
              )
            }
          } else {
            console.log(`⚠️ Retry ${attempts}/${maxAttempts} for ${file}...`)
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      }
    }
  }

  // Clear npm cache
  try {
    console.log('🧹 Clearing npm cache...')
    execSync('npm cache clean --force', {
      stdio: 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    })
    console.log('✅ npm cache cleared')
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error clearing npm cache:', errorMessage)
  }

  // Clear yarn cache
  try {
    console.log('🧹 Clearing yarn cache...')
    execSync('yarn cache clean', {
      stdio: 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    })
    console.log('✅ yarn cache cleared')
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error clearing yarn cache:', errorMessage)
  }

  console.log('✨ Cleanup complete!')
}

// Make sure we handle the promise resolution
if (require.main === module) {
  // Using Promise.resolve().then() to ensure we're in a promise chain
  Promise.resolve()
    .then(() => {
      return cleanupDependencies()
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}
