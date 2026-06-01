#!/usr/bin/env node

// Production build script with environment variable handling
import { execSync } from 'child_process'
import fs from 'fs'

console.log('🚀 Starting production build...\n')

// Check if .env file exists, if not create a minimal one
if (!fs.existsSync('.env')) {
  console.log('📝 Creating minimal .env file for build...')
  fs.writeFileSync('.env', `
# Minimal environment variables for build
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_KEY=placeholder_key
NUXT_SITE_URL=https://ukpubs.co.uk
BASE_URL=https://ukpubs.co.uk
NUXT_PUBLIC_APP_URL=https://ukpubs.co.uk
NUXT_PUBLIC_API_URL=https://ukpubs.co.uk
EVENT_IMG_FOLDER=https://placeholder.supabase.co/storage/v1/object/public/event_images/
VENUE_IMG_FOLDER=https://placeholder.supabase.co/storage/v1/object/public/venue_images/
ADMIN_EMAIL=john.mbiddulph@gmail.com
USER_NAME=John Biddulph
`)
  console.log('✅ .env file created\n')
}

try {
  console.log('🔧 Generating Prisma client...')
  execSync('npx prisma generate', { stdio: 'inherit' })
  
  console.log('\n📦 Building Nuxt application...')
  execSync('npx nuxt build', { stdio: 'inherit' })
  
  console.log('\n✅ Build completed successfully!')
  console.log('📊 Build artifacts are in .output/ directory')
  
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}
