import { PromptBuilderService } from '../../../src/services/promptBuilder.js'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('PromptBuilderService', () => {
  let promptBuilder

  beforeEach(() => {
    promptBuilder = new PromptBuilderService()
  })

  describe('buildMergeRequestPrompt', () => {
    it('should build a prompt with complete MR data', () => {
      const mrData = {
        title: 'Add user authentication',
        description: 'Implements JWT-based authentication',
        author: { name: 'John Doe' },
        source_branch: 'feature/auth',
        target_branch: 'main',
        labels: ['enhancement', 'security']
      }
      const diffData = '+function login() {}\n-function oldLogin() {}'

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('Add user authentication')
      expect(prompt).toContain('Implements JWT-based authentication')
      expect(prompt).toContain('John Doe')
      expect(prompt).toContain('feature/auth')
      expect(prompt).toContain('main')
      expect(prompt).toContain('enhancement, security')
      expect(prompt).toContain('+function login() {}')
    })

    it('should handle MR with no description', () => {
      const mrData = {
        title: 'Fix bug',
        author: { name: 'Jane Doe' },
        source_branch: 'fix/bug-123',
        target_branch: 'develop'
      }
      const diffData = '+const fix = true;'

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('Fix bug')
      expect(prompt).toContain('No description provided')
      expect(prompt).toContain('Jane Doe')
    })

    it('should handle MR with no author', () => {
      const mrData = {
        title: 'Update README',
        source_branch: 'docs/readme',
        target_branch: 'main'
      }
      const diffData = '+# New documentation'

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('Update README')
      expect(prompt).toContain('Unknown')
    })

    it('should handle MR with no labels', () => {
      const mrData = {
        title: 'Refactor code',
        author: { name: 'Bob Smith' },
        source_branch: 'refactor/cleanup',
        target_branch: 'main'
      }
      const diffData = '+// Refactored code'

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('Refactor code')
      expect(prompt).toContain('None')
    })

    it('should handle MR with empty labels array', () => {
      const mrData = {
        title: 'Test changes',
        author: { name: 'Test User' },
        source_branch: 'test/changes',
        target_branch: 'main',
        labels: []
      }
      const diffData = '+test code'

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('None')
    })

    it('should truncate large diffs', () => {
      const mrData = {
        title: 'Large change',
        author: { name: 'Dev User' },
        source_branch: 'feature/large',
        target_branch: 'main'
      }
      const diffData = 'a'.repeat(10000)

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('diff truncated for analysis')
    })

    it('should include all required review sections', () => {
      const mrData = {
        title: 'Test',
        author: { name: 'Test' },
        source_branch: 'test',
        target_branch: 'main'
      }
      const diffData = '+code'

      const prompt = promptBuilder.buildMergeRequestPrompt(mrData, diffData)

      expect(prompt).toContain('## 🔍 Overall Assessment')
      expect(prompt).toContain('## 🐛 Code Quality Issues')
      expect(prompt).toContain('## 🎨 Style & Best Practices')
      expect(prompt).toContain('## ⚡ Performance Considerations')
      expect(prompt).toContain('## 🔒 Security Concerns')
      expect(prompt).toContain('## 💡 Suggestions')
    })
  })

  describe('buildRepositoryPrompt', () => {
    const mockRepositoryData = {
      project: {
        name_with_namespace: 'user/test-repo',
        description: 'A test repository',
        default_branch: 'main'
      },
      languages: {
        JavaScript: 60,
        TypeScript: 40
      },
      totalFiles: 50
    }

    const mockFiles = [
      {
        path: 'src/index.js',
        extension: '.js',
        size: 1024,
        content: 'const app = require("express")();\napp.listen(3000);'
      },
      {
        path: 'README.md',
        extension: '.md',
        size: 512,
        content: '# Test Repository\n\nA simple test.'
      }
    ]

    it('should build a prompt with default options', () => {
      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles)

      expect(prompt).toContain('user/test-repo')
      expect(prompt).toContain('A test repository')
      expect(prompt).toContain('main')
      expect(prompt).toContain('JavaScript, TypeScript')
      expect(prompt).toContain('2 of 50 total files')
      expect(prompt).toContain('src/index.js')
      expect(prompt).toContain('README.md')
    })

    it('should handle repository with no description', () => {
      const repoData = {
        project: {
          name_with_namespace: 'user/no-desc',
          default_branch: 'master'
        },
        languages: { Python: 100 },
        totalFiles: 10
      }

      const prompt = promptBuilder.buildRepositoryPrompt(repoData, mockFiles)

      expect(prompt).toContain('No description')
    })

    it('should use custom branch when provided', () => {
      const options = { branch: 'develop' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('develop')
    })

    it('should handle security focus', () => {
      const options = { focus: 'security' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('security vulnerabilities')
      expect(prompt).toContain('authentication')
    })

    it('should handle performance focus', () => {
      const options = { focus: 'performance' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('performance bottlenecks')
      expect(prompt).toContain('optimization opportunities')
    })

    it('should handle quality focus', () => {
      const options = { focus: 'quality' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('code quality')
      expect(prompt).toContain('maintainability')
    })

    it('should handle architecture focus', () => {
      const options = { focus: 'architecture' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('design patterns')
      expect(prompt).toContain('separation of concerns')
    })

    it('should handle comprehensive focus', () => {
      const options = { focus: 'comprehensive' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('Analyze all aspects')
    })

    it('should handle quick depth', () => {
      const options = { depth: 'quick' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('high-level overview')
    })

    it('should handle standard depth', () => {
      const options = { depth: 'standard' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('thorough analysis')
    })

    it('should handle deep depth', () => {
      const options = { depth: 'deep' }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('comprehensive analysis')
      expect(prompt).toContain('detailed code examples')
    })

    it('should include file metadata in prompt', () => {
      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles)

      expect(prompt).toContain('1024 bytes')
      expect(prompt).toContain('512 bytes')
      expect(prompt).toContain('**Type**: .js')
      expect(prompt).toContain('**Type**: .md')
    })

    it('should calculate line counts correctly', () => {
      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles)

      expect(prompt).toContain('2 lines')
      expect(prompt).toContain('3 lines')
    })

    it('should handle files without content', () => {
      const filesNoContent = [
        {
          path: 'empty.js',
          extension: '.js',
          size: 0
        }
      ]

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, filesNoContent)

      expect(prompt).toContain('0 lines')
    })

    it('should handle files without extension', () => {
      const filesNoExt = [
        {
          path: 'Makefile',
          size: 256,
          content: 'all:\n\techo "build"'
        }
      ]

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, filesNoExt)

      expect(prompt).toContain('**Type**: unknown')
    })

    it('should include all required review sections', () => {
      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles)

      expect(prompt).toContain('## 🏗️ Repository Overview')
      expect(prompt).toContain('## 📊 Code Quality Assessment')
      expect(prompt).toContain('## 🔒 Security Analysis')
      expect(prompt).toContain('## ⚡ Performance Insights')
      expect(prompt).toContain('## 🎯 Architecture & Design')
      expect(prompt).toContain('## 📁 File-Level Insights')
      expect(prompt).toContain('## 🚀 Recommendations')
      expect(prompt).toContain('## 📋 Summary')
    })

    it('should combine multiple options correctly', () => {
      const options = {
        focus: 'security',
        depth: 'deep',
        branch: 'feature/auth'
      }

      const prompt = promptBuilder.buildRepositoryPrompt(mockRepositoryData, mockFiles, options)

      expect(prompt).toContain('feature/auth')
      expect(prompt).toContain('security vulnerabilities')
      expect(prompt).toContain('comprehensive analysis')
    })
  })

  describe('truncateDiff', () => {
    it('should not truncate short diffs', () => {
      const shortDiff = 'short diff content'
      const result = promptBuilder.truncateDiff(shortDiff)

      expect(result).toBe(shortDiff)
    })

    it('should return input if diff is at max length', () => {
      const exactDiff = 'a'.repeat(8000)
      const result = promptBuilder.truncateDiff(exactDiff)

      expect(result).toBe(exactDiff)
    })

    it('should truncate diffs longer than maxLength', () => {
      const longDiff = 'a'.repeat(10000)
      const result = promptBuilder.truncateDiff(longDiff)

      expect(result.length).toBeLessThan(longDiff.length)
      expect(result).toContain('diff truncated for analysis')
    })

    it('should truncate at newline when possible', () => {
      const diffWithNewlines = 'a'.repeat(7000) + '\n' + 'b'.repeat(5000)
      const result = promptBuilder.truncateDiff(diffWithNewlines)

      expect(result).toContain('diff truncated for analysis')
      expect(result.indexOf('\n... ')).toBeGreaterThan(0)
    })

    it('should handle diff with no newlines near boundary', () => {
      const solidDiff = 'a'.repeat(10000)
      const result = promptBuilder.truncateDiff(solidDiff)

      expect(result).toContain('diff truncated for analysis')
    })

    it('should respect custom maxLength', () => {
      const diff = 'a'.repeat(1000)
      const result = promptBuilder.truncateDiff(diff, 500)

      expect(result.length).toBeLessThan(diff.length)
      expect(result).toContain('diff truncated for analysis')
    })

    it('should handle empty diff', () => {
      const result = promptBuilder.truncateDiff('')

      expect(result).toBe('')
    })

    it('should handle null diff', () => {
      const result = promptBuilder.truncateDiff(null)

      expect(result).toBeNull()
    })

    it('should handle undefined diff', () => {
      const result = promptBuilder.truncateDiff(undefined)

      expect(result).toBeUndefined()
    })

    it('should show percentage when truncating at newline', () => {
      const lines = Array(200).fill('line of code').join('\n')
      const result = promptBuilder.truncateDiff(lines, 1000)

      expect(result).toMatch(/showing first \d+% of changes/)
    })
  })

  describe('truncateContent', () => {
    it('should not truncate content within limit', () => {
      const content = 'line1\nline2\nline3'
      const result = promptBuilder.truncateContent(content, 'standard')

      expect(result).toBe(content)
    })

    it('should truncate content exceeding quick limit', () => {
      const lines = Array(30).fill('line').join('\n')
      const result = promptBuilder.truncateContent(lines, 'quick')

      expect(result).toContain('... (10 more lines)')
    })

    it('should truncate content exceeding standard limit', () => {
      const lines = Array(60).fill('line').join('\n')
      const result = promptBuilder.truncateContent(lines, 'standard')

      expect(result).toContain('... (10 more lines)')
    })

    it('should truncate content exceeding deep limit', () => {
      const lines = Array(120).fill('line').join('\n')
      const result = promptBuilder.truncateContent(lines, 'deep')

      expect(result).toContain('... (20 more lines)')
    })

    it('should handle empty content', () => {
      const result = promptBuilder.truncateContent('', 'standard')

      expect(result).toBe('')
    })

    it('should handle null content', () => {
      const result = promptBuilder.truncateContent(null, 'standard')

      expect(result).toBe('')
    })

    it('should handle undefined content', () => {
      const result = promptBuilder.truncateContent(undefined, 'standard')

      expect(result).toBe('')
    })

    it('should use standard limit for unknown depth', () => {
      const lines = Array(60).fill('line').join('\n')
      const result = promptBuilder.truncateContent(lines, 'unknown')

      expect(result).toContain('... (10 more lines)')
    })

    it('should handle content exactly at limit', () => {
      const lines = Array(50).fill('line').join('\n')
      const result = promptBuilder.truncateContent(lines, 'standard')

      expect(result).not.toContain('more lines')
      expect(result).toBe(lines)
    })

    it('should preserve line content when truncating', () => {
      const lines = Array(60).fill('important line').join('\n')
      const result = promptBuilder.truncateContent(lines, 'standard')

      const resultLines = result.split('\n')
      expect(resultLines[0]).toBe('important line')
      expect(resultLines[resultLines.length - 1]).toContain('more lines')
    })
  })

  describe('getFocusInstructions', () => {
    it('should return comprehensive focus instructions', () => {
      const result = promptBuilder.getFocusInstructions('comprehensive')

      expect(result).toContain('Analyze all aspects')
      expect(result).toContain('security')
      expect(result).toContain('performance')
    })

    it('should return security focus instructions', () => {
      const result = promptBuilder.getFocusInstructions('security')

      expect(result).toContain('security vulnerabilities')
      expect(result).toContain('authentication')
      expect(result).toContain('authorization')
    })

    it('should return performance focus instructions', () => {
      const result = promptBuilder.getFocusInstructions('performance')

      expect(result).toContain('performance bottlenecks')
      expect(result).toContain('optimization opportunities')
    })

    it('should return quality focus instructions', () => {
      const result = promptBuilder.getFocusInstructions('quality')

      expect(result).toContain('code quality')
      expect(result).toContain('maintainability')
      expect(result).toContain('testing')
    })

    it('should return architecture focus instructions', () => {
      const result = promptBuilder.getFocusInstructions('architecture')

      expect(result).toContain('code organization')
      expect(result).toContain('design patterns')
    })

    it('should default to comprehensive for unknown focus', () => {
      const result = promptBuilder.getFocusInstructions('unknown')

      expect(result).toContain('Analyze all aspects')
    })

    it('should include focus area label', () => {
      const result = promptBuilder.getFocusInstructions('security')

      expect(result).toContain('**Focus Area**')
    })
  })

  describe('getDepthInstructions', () => {
    it('should return quick depth instructions', () => {
      const result = promptBuilder.getDepthInstructions('quick')

      expect(result).toContain('high-level overview')
      expect(result).toContain('most critical findings')
    })

    it('should return standard depth instructions', () => {
      const result = promptBuilder.getDepthInstructions('standard')

      expect(result).toContain('thorough analysis')
      expect(result).toContain('detailed insights')
    })

    it('should return deep depth instructions', () => {
      const result = promptBuilder.getDepthInstructions('deep')

      expect(result).toContain('comprehensive analysis')
      expect(result).toContain('detailed code examples')
    })

    it('should default to standard for unknown depth', () => {
      const result = promptBuilder.getDepthInstructions('unknown')

      expect(result).toContain('thorough analysis')
    })

    it('should include analysis depth label', () => {
      const result = promptBuilder.getDepthInstructions('quick')

      expect(result).toContain('**Analysis Depth**')
    })
  })

  describe('getLanguageFromExtension', () => {
    it('should return javascript for .js extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.js')

      expect(result).toBe('javascript')
    })

    it('should return typescript for .ts extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.ts')

      expect(result).toBe('typescript')
    })

    it('should return python for .py extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.py')

      expect(result).toBe('python')
    })

    it('should return markdown for .md extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.md')

      expect(result).toBe('markdown')
    })

    it('should return json for .json extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.json')

      expect(result).toBe('json')
    })

    it('should return yaml for .yml extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.yml')

      expect(result).toBe('yaml')
    })

    it('should return text for unknown extension', () => {
      const result = promptBuilder.getLanguageFromExtension('.unknown')

      expect(result).toBe('text')
    })

    it('should return text for null extension', () => {
      const result = promptBuilder.getLanguageFromExtension(null)

      expect(result).toBe('text')
    })

    it('should return text for undefined extension', () => {
      const result = promptBuilder.getLanguageFromExtension(undefined)

      expect(result).toBe('text')
    })

    it('should handle extensions without dot', () => {
      const result = promptBuilder.getLanguageFromExtension('js')

      expect(result).toBe('text')
    })
  })
})
