import fs from 'fs'
import path from 'path'
import { CONTENT_FOLDER, SAMPLES_FOLDER } from '@/constants'

const CONTENT_DIR = path.join(process.cwd(), 'src', CONTENT_FOLDER)
const SAMPLE_DIR = path.join(process.cwd(), 'src', SAMPLES_FOLDER)

function cleanContentDirectory(): void {
  console.log('🧹 Cleaning content directory to prevent mixing...')
  
  const itemsToRemove = ['js-track', 'dsa-track']
  
  for (const item of itemsToRemove) {
    const itemPath = path.join(CONTENT_DIR, item)
    if (fs.existsSync(itemPath)) {
      console.log(`   ⚠️  Removing existing ${item}...`)
      fs.rmSync(itemPath, { recursive: true, force: true })
    }
  }
}

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export function setupSampleContent(): void {
  console.log('🚀 Setting up sample content for development...\n')

  // Check if content directory exists
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('❌ Content directory not found. Make sure you\'re in the project root.')
    process.exit(1)
  }

  // Check if we already have real content (submodule)
  const hasRealContent = fs.existsSync(path.join(CONTENT_DIR, 'js-track')) || 
                        fs.existsSync(path.join(CONTENT_DIR, 'dsa-track'))

  if (hasRealContent) {
    console.log('✅ Real content detected. No need to set up sample content.')
    console.log('You have access to the full content submodule.')
    return
  }

  // Check if sample content exists
  if (!fs.existsSync(SAMPLE_DIR)) {
    console.error(`❌ Sample content not found in src/${SAMPLES_FOLDER}/. This might be a repository issue.`)
    process.exit(1)
  }

  try {
    // Clean existing content to prevent mixing
    cleanContentDirectory()
    
    // Copy sample courses to main content directory
    const sampleCourses = fs.readdirSync(SAMPLE_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name !== 'README.md')
      .map(entry => entry.name)

    console.log('📚 Available sample courses:')
    sampleCourses.forEach(course => console.log(`   - ${course}`))
    console.log()

    // Copy each sample course
    for (const course of sampleCourses) {
      const sourcePath = path.join(SAMPLE_DIR, course)
      const destPath = path.join(CONTENT_DIR, course)

      console.log(`📝 Setting up ${course}...`)
      copyDirectory(sourcePath, destPath)
    }

    console.log('\n✅ Sample content setup complete!')
    console.log('\n🎯 Next steps:')
    console.log('   1. Clean database: yarn clean:dev (if switching content sources)')
    console.log('   2. Sync content: yarn sync:all:dev')
    console.log('   3. Start development: yarn dev')
    console.log('   4. Visit http://localhost:3000 to see your content')
    console.log(`   5. Check src/${SAMPLES_FOLDER}/README.md for more information`)

  } catch (error) {
    console.error('❌ Error setting up sample content:', (error as Error).message)
    process.exit(1)
  }
}

// Run the setup when called directly
if (require.main === module) {
  setupSampleContent()
}