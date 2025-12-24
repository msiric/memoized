import fs from 'fs'
import path from 'path'
import { CONTENT_FOLDER, SAMPLES_FOLDER } from '@/constants'

const CONTENT_DIR = path.join(process.cwd(), 'src', CONTENT_FOLDER)
const SAMPLE_DIR = path.join(process.cwd(), 'src', SAMPLES_FOLDER)
const RESOURCES_DIR = path.join(process.cwd(), 'src', 'resources')

// Sibling premium content repository (for content maintainers)
const PREMIUM_CONTENT_DIR = path.join(process.cwd(), '..', 'memoized-content')

function cleanContentDirectory(): void {
  console.log('🧹 Cleaning content directory to prevent mixing...')
  
  const itemsToRemove = ['js-track', 'dsa-track']
  
  for (const item of itemsToRemove) {
    const itemPath = path.join(CONTENT_DIR, item)
    try {
      if (fs.existsSync(itemPath) || isSymlink(itemPath)) {
        console.log(`   ⚠️  Removing existing ${item}...`)
        fs.rmSync(itemPath, { recursive: true, force: true })
      }
    } catch {
      // Item doesn't exist, nothing to clean
    }
  }
  
  // Also clean resources if it exists
  try {
    if (fs.existsSync(RESOURCES_DIR) || isSymlink(RESOURCES_DIR)) {
      console.log('   ⚠️  Removing existing resources...')
      fs.rmSync(RESOURCES_DIR, { recursive: true, force: true })
    }
  } catch {
    // Resources don't exist, nothing to clean
  }
}

function isSymlink(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isSymbolicLink()
  } catch {
    return false
  }
}

function createSymlink(target: string, linkPath: string): void {
  // Ensure parent directory exists
  const parentDir = path.dirname(linkPath)
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true })
  }
  
  fs.symlinkSync(target, linkPath, 'dir')
}

function setupPremiumContent(): boolean {
  // Check if premium content repository exists as sibling
  const premiumContentPath = path.join(PREMIUM_CONTENT_DIR, 'content')
  const premiumResourcesPath = path.join(PREMIUM_CONTENT_DIR, 'resources')
  
  if (!fs.existsSync(premiumContentPath)) {
    return false
  }
  
  console.log('🔗 Premium content repository detected!')
  console.log(`   Found: ${PREMIUM_CONTENT_DIR}\n`)
  
  // Clean existing content
  cleanContentDirectory()
  
  // Create symlinks for content tracks
  const tracks = ['js-track', 'dsa-track']
  
  for (const track of tracks) {
    const targetPath = path.join(premiumContentPath, track)
    const linkPath = path.join(CONTENT_DIR, track)
    
    if (fs.existsSync(targetPath)) {
      console.log(`📝 Linking ${track}...`)
      createSymlink(targetPath, linkPath)
    }
  }
  
  // Create symlink for resources
  if (fs.existsSync(premiumResourcesPath)) {
    console.log('📝 Linking resources...')
    createSymlink(premiumResourcesPath, RESOURCES_DIR)
  }
  
  console.log('\n✅ Premium content linked successfully!')
  console.log('\n🎯 Next steps:')
  console.log('   1. Sync content: yarn sync:all:dev')
  console.log('   2. Start development: yarn dev')
  console.log('   3. Visit http://localhost:3000 to see your content')
  console.log('\n💡 Tip: Changes in memoized-content are instantly reflected.')
  console.log('   Just run yarn sync:all:dev after modifying _lessons.json files.')
  
  return true
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
  console.log('🚀 Setting up content for development...\n')

  // Check if content directory exists
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('❌ Content directory not found. Make sure you\'re in the project root.')
    process.exit(1)
  }

  // Check if we already have real content via symlinks
  const hasSymlinkedContent = isSymlink(path.join(CONTENT_DIR, 'js-track')) || 
                              isSymlink(path.join(CONTENT_DIR, 'dsa-track'))

  if (hasSymlinkedContent) {
    console.log('✅ Symlinked content detected. Content is already set up.')
    console.log('   Run yarn sync:all:dev to sync any changes.')
    return
  }

  // Check if we already have real content (submodule or copied)
  const hasRealContent = fs.existsSync(path.join(CONTENT_DIR, 'js-track')) || 
                        fs.existsSync(path.join(CONTENT_DIR, 'dsa-track'))

  if (hasRealContent) {
    console.log('✅ Real content detected. No need to set up sample content.')
    console.log('You have access to the full content submodule.')
    return
  }

  // Try to set up premium content first (for content maintainers)
  if (setupPremiumContent()) {
    return
  }

  // Fall back to sample content (for open-source contributors)
  console.log('📦 No premium content found. Setting up sample content...\n')

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