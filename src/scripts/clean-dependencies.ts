import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

function cleanupDependencies() {
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

  // Remove directories and files
  filesToRemove.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      try {
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true })
        } else {
          fs.unlinkSync(filePath)
        }
        console.log(`✅ Removed: ${file}`)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error removing ${file}:`, errorMessage)
      }
    }
  })

  // Clear npm cache
  try {
    console.log('🧹 Clearing npm cache...')
    execSync('npm cache clean --force', { stdio: 'inherit' })
    console.log('✅ npm cache cleared')
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error clearing npm cache:', errorMessage)
  }

  // Clear yarn cache if yarn is installed
  try {
    console.log('🧹 Clearing yarn cache...')
    execSync('yarn cache clean', { stdio: 'inherit' })
    console.log('✅ yarn cache cleared')
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error clearing yarn cache:', errorMessage)
  }

  console.log(
    '✨ Cleanup complete!',
  )
}

cleanupDependencies()
