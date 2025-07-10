#!/usr/bin/env node

/**
 * Script to generate multiple test branches in a GitLab repository
 * for testing the branch dropdown performance
 */

import gitlabAPI from '../src/api/gitlab.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env') })

const BRANCH_PATTERNS = [
  'feature/',
  'bugfix/',
  'hotfix/',
  'release/',
  'chore/',
  'test/',
  'experiment/',
  'poc/',
  'dev/',
  'user/'
]

const BRANCH_SUFFIXES = [
  'update-dependencies',
  'fix-navigation',
  'add-authentication',
  'improve-performance',
  'refactor-components',
  'update-documentation',
  'fix-security-issue',
  'add-new-feature',
  'optimize-queries',
  'update-styles'
]

async function generateTestBranches(projectId, baseBranch = 'main', count = 100) {
  console.log(`\n🌿 Generating ${count} test branches for project ${projectId}...\n`)
  
  const createdBranches = []
  const failedBranches = []
  
  for (let i = 1; i <= count; i++) {
    // Generate branch name
    const pattern = BRANCH_PATTERNS[Math.floor(Math.random() * BRANCH_PATTERNS.length)]
    const suffix = BRANCH_SUFFIXES[Math.floor(Math.random() * BRANCH_SUFFIXES.length)]
    const timestamp = Date.now()
    const branchName = `${pattern}${suffix}-${timestamp}-${i}`
    
    try {
      await gitlabAPI.createBranch(projectId, branchName, baseBranch)
      createdBranches.push(branchName)
      console.log(`✅ Created branch ${i}/${count}: ${branchName}`)
      
      // Add small delay to avoid rate limiting
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`❌ Failed to create branch ${branchName}:`, error.message)
      failedBranches.push({ name: branchName, error: error.message })
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully created: ${createdBranches.length} branches`)
  console.log(`   ❌ Failed: ${failedBranches.length} branches`)
  
  if (failedBranches.length > 0) {
    console.log(`\n❌ Failed branches:`)
    failedBranches.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`)
    })
  }
  
  return { createdBranches, failedBranches }
}

async function listBranches(projectId) {
  try {
    const branches = await gitlabAPI.getBranches(projectId)
    console.log(`\n📋 Repository has ${branches.length} branches total`)
    
    // Group branches by pattern
    const branchGroups = {}
    branches.forEach(branch => {
      const pattern = BRANCH_PATTERNS.find(p => branch.name.startsWith(p)) || 'other'
      if (!branchGroups[pattern]) {
        branchGroups[pattern] = []
      }
      branchGroups[pattern].push(branch.name)
    })
    
    console.log('\n📊 Branches by pattern:')
    Object.entries(branchGroups).forEach(([pattern, branchList]) => {
      console.log(`   ${pattern}: ${branchList.length} branches`)
    })
    
    return branches
  } catch (error) {
    console.error('❌ Failed to list branches:', error.message)
    return []
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const projectId = args[1]
  
  if (!command || !projectId) {
    console.log('Usage:')
    console.log('  node generate-test-branches.js create <project-id> [branch-count] [base-branch]')
    console.log('  node generate-test-branches.js list <project-id>')
    console.log('')
    console.log('Examples:')
    console.log('  node generate-test-branches.js create 123 50 main')
    console.log('  node generate-test-branches.js list 123')
    process.exit(1)
  }
  
  // Initialize GitLab API with token
  const token = process.env.GITLAB_TOKEN
  if (!token) {
    console.error('❌ GITLAB_TOKEN environment variable is required')
    process.exit(1)
  }
  
  try {
    if (command === 'create') {
      const count = parseInt(args[2]) || 100
      const baseBranch = args[3] || 'main'
      await generateTestBranches(projectId, baseBranch, count)
    } else if (command === 'list') {
      await listBranches(projectId)
    } else {
      console.error(`❌ Unknown command: ${command}`)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

main()