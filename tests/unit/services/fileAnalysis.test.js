import { FileAnalysisService } from '../../../src/services/fileAnalysis.js'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('FileAnalysisService', () => {
  let fileAnalysis

  beforeEach(() => {
    fileAnalysis = new FileAnalysisService()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(fileAnalysis.options.maxFiles).toBe(100)
      expect(fileAnalysis.options.maxFileSize).toBe(100 * 1024)
      expect(fileAnalysis.options.includeConfig).toBe(true)
      expect(fileAnalysis.options.includeDocs).toBe(false)
      expect(fileAnalysis.options.customExtensions).toEqual([])
      expect(fileAnalysis.options.customExclusions).toEqual([])
    })

    it('should allow custom options', () => {
      const customFileAnalysis = new FileAnalysisService({
        maxFiles: 50,
        maxFileSize: 50 * 1024,
        includeConfig: false,
        includeDocs: true,
        customExtensions: ['.custom'],
        customExclusions: ['test']
      })

      expect(customFileAnalysis.options.maxFiles).toBe(50)
      expect(customFileAnalysis.options.maxFileSize).toBe(50 * 1024)
      expect(customFileAnalysis.options.includeConfig).toBe(false)
      expect(customFileAnalysis.options.includeDocs).toBe(true)
      expect(customFileAnalysis.options.customExtensions).toEqual(['.custom'])
      expect(customFileAnalysis.options.customExclusions).toEqual(['test'])
    })

    it('should merge custom options with defaults', () => {
      const customFileAnalysis = new FileAnalysisService({
        maxFiles: 150
      })

      expect(customFileAnalysis.options.maxFiles).toBe(150)
      expect(customFileAnalysis.options.includeConfig).toBe(true)
      expect(customFileAnalysis.options.includeDocs).toBe(false)
    })
  })

  describe('filterFiles', () => {
    it('should filter out directories', () => {
      const tree = [
        { type: 'tree', path: 'src/components' },
        { type: 'blob', path: 'src/index.js' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/index.js')
    })

    it('should include code files with valid extensions', () => {
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: 'src/component.tsx' },
        { type: 'blob', path: 'src/utils.py' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(3)
    })

    it('should exclude files in excluded paths', () => {
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: 'node_modules/package/index.js' },
        { type: 'blob', path: 'dist/bundle.js' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/app.js')
    })

    it('should exclude files with excluded extensions', () => {
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: 'images/logo.png' },
        { type: 'blob', path: 'docs/guide.pdf' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/app.js')
    })

    it('should exclude files larger than maxFileSize', () => {
      const tree = [
        { type: 'blob', path: 'src/small.js', size: 50 * 1024 },
        { type: 'blob', path: 'src/large.js', size: 150 * 1024 }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/small.js')
    })

    it('should include config files when includeConfig is true', () => {
      const tree = [
        { type: 'blob', path: 'package.json' },
        { type: 'blob', path: 'config.yml' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(2)
    })

    it('should exclude config files when includeConfig is false', () => {
      const customFileAnalysis = new FileAnalysisService({ includeConfig: false })
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: '.env' }
      ]

      const result = customFileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/app.js')
    })

    it('should include docs when includeDocs is true', () => {
      const customFileAnalysis = new FileAnalysisService({ includeDocs: true })
      const tree = [
        { type: 'blob', path: 'README.md' },
        { type: 'blob', path: 'docs/guide.txt' }
      ]

      const result = customFileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(2)
    })

    it('should exclude docs when includeDocs is false', () => {
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: 'README.md' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/app.js')
    })

    it('should include files with custom extensions', () => {
      const customFileAnalysis = new FileAnalysisService({
        customExtensions: ['.custom']
      })
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: 'data/config.custom' }
      ]

      const result = customFileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(2)
    })

    it('should exclude files matching custom exclusions', () => {
      const customFileAnalysis = new FileAnalysisService({
        customExclusions: ['test']
      })
      const tree = [
        { type: 'blob', path: 'src/app.js' },
        { type: 'blob', path: 'src/test/app.test.js' }
      ]

      const result = customFileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('src/app.js')
    })

    it('should handle empty tree', () => {
      const result = fileAnalysis.filterFiles([])

      expect(result).toHaveLength(0)
    })

    it('should handle files without size property', () => {
      const tree = [
        { type: 'blob', path: 'src/app.js' }
      ]

      const result = fileAnalysis.filterFiles(tree)

      expect(result).toHaveLength(1)
    })
  })

  describe('prioritizeFiles', () => {
    it('should add priority, extension, and fileName to files', () => {
      const files = [
        { path: 'src/app.js' }
      ]
      const languages = { JavaScript: 60 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0]).toHaveProperty('priority')
      expect(result[0]).toHaveProperty('extension', '.js')
      expect(result[0]).toHaveProperty('fileName', 'app.js')
    })

    it('should assign language-based priority', () => {
      const files = [
        { path: 'src/app.js' },
        { path: 'src/utils.ts' }
      ]
      const languages = {
        JavaScript: 60,
        TypeScript: 40
      }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign name-based priority for index files', () => {
      const files = [
        { path: 'src/index.js' },
        { path: 'src/app.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].fileName).toBe('index.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign name-based priority for main files', () => {
      const files = [
        { path: 'src/main.js' },
        { path: 'src/helper.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].fileName).toBe('main.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign high priority for auth files', () => {
      const files = [
        { path: 'src/auth.js' },
        { path: 'src/helper.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].fileName).toBe('auth.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign high priority for security files', () => {
      const files = [
        { path: 'src/security.js' },
        { path: 'src/utils.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].fileName).toBe('security.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign path-based priority for api routes', () => {
      const files = [
        { path: 'src/api/users.js' },
        { path: 'src/helper.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].path).toBe('src/api/users.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign path-based priority for controllers', () => {
      const files = [
        { path: 'src/controllers/user.js' },
        { path: 'src/helper.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].path).toBe('src/controllers/user.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should assign path-based priority for middleware', () => {
      const files = [
        { path: 'src/middleware/auth.js' },
        { path: 'src/utils.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].path).toBe('src/middleware/auth.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should combine multiple priority factors', () => {
      const files = [
        { path: 'src/api/auth.js' },
        { path: 'src/utils.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].path).toBe('src/api/auth.js')
      expect(result[0].priority).toBeGreaterThan(result[1].priority)
    })

    it('should sort files by priority in descending order', () => {
      const files = [
        { path: 'src/helper.js' },
        { path: 'src/index.js' },
        { path: 'src/utils.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].fileName).toBe('index.js')
      expect(result[0].priority).toBeGreaterThanOrEqual(result[1].priority)
      expect(result[1].priority).toBeGreaterThanOrEqual(result[2].priority)
    })

    it('should handle files with no language match', () => {
      const files = [
        { path: 'src/app.js' }
      ]
      const languages = { Python: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result).toHaveLength(1)
      expect(result[0].priority).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty languages object', () => {
      const files = [
        { path: 'src/app.js' }
      ]
      const languages = {}

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result).toHaveLength(1)
      expect(result[0].priority).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty files array', () => {
      const result = fileAnalysis.prioritizeFiles([], { JavaScript: 100 })

      expect(result).toHaveLength(0)
    })

    it('should handle case-insensitive name patterns', () => {
      const files = [
        { path: 'src/INDEX.js' },
        { path: 'src/Main.js' },
        { path: 'src/AUTH.js' }
      ]
      const languages = { JavaScript: 100 }

      const result = fileAnalysis.prioritizeFiles(files, languages)

      expect(result[0].priority).toBeGreaterThan(0)
      expect(result[1].priority).toBeGreaterThan(0)
      expect(result[2].priority).toBeGreaterThan(0)
    })
  })

  describe('selectFiles', () => {
    it('should limit files to maxFiles option', () => {
      const customFileAnalysis = new FileAnalysisService({ maxFiles: 2 })
      const prioritizedFiles = [
        { path: 'src/file1.js', priority: 100 },
        { path: 'src/file2.js', priority: 90 },
        { path: 'src/file3.js', priority: 80 }
      ]

      const result = customFileAnalysis.selectFiles(prioritizedFiles)

      expect(result).toHaveLength(2)
      expect(result[0].path).toBe('src/file1.js')
      expect(result[1].path).toBe('src/file2.js')
    })

    it('should return all files if count is less than maxFiles', () => {
      const customFileAnalysis = new FileAnalysisService({ maxFiles: 10 })
      const prioritizedFiles = [
        { path: 'src/file1.js', priority: 100 },
        { path: 'src/file2.js', priority: 90 }
      ]

      const result = customFileAnalysis.selectFiles(prioritizedFiles)

      expect(result).toHaveLength(2)
    })

    it('should return empty array for empty input', () => {
      const result = fileAnalysis.selectFiles([])

      expect(result).toHaveLength(0)
    })

    it('should preserve file order from prioritized input', () => {
      const customFileAnalysis = new FileAnalysisService({ maxFiles: 3 })
      const prioritizedFiles = [
        { path: 'src/high.js', priority: 100 },
        { path: 'src/medium.js', priority: 50 },
        { path: 'src/low.js', priority: 10 }
      ]

      const result = customFileAnalysis.selectFiles(prioritizedFiles)

      expect(result[0].priority).toBe(100)
      expect(result[1].priority).toBe(50)
      expect(result[2].priority).toBe(10)
    })
  })

  describe('getLanguageExtensions', () => {
    it('should map language names to extensions with percentages', () => {
      const languages = {
        JavaScript: 60,
        TypeScript: 40
      }

      const result = fileAnalysis.getLanguageExtensions(languages)

      expect(result.get('.js')).toBe(60)
      expect(result.get('.jsx')).toBe(60)
      expect(result.get('.ts')).toBe(40)
      expect(result.get('.tsx')).toBe(40)
    })

    it('should handle languages with multiple extensions', () => {
      const languages = {
        'C++': 100
      }

      const result = fileAnalysis.getLanguageExtensions(languages)

      expect(result.get('.cpp')).toBe(100)
      expect(result.get('.cc')).toBe(100)
      expect(result.get('.cxx')).toBe(100)
    })

    it('should handle unknown languages', () => {
      const languages = {
        UnknownLang: 50
      }

      const result = fileAnalysis.getLanguageExtensions(languages)

      expect(result.size).toBe(0)
    })

    it('should handle empty languages object', () => {
      const result = fileAnalysis.getLanguageExtensions({})

      expect(result.size).toBe(0)
    })

    it('should handle mixed known and unknown languages', () => {
      const languages = {
        JavaScript: 60,
        UnknownLang: 40
      }

      const result = fileAnalysis.getLanguageExtensions(languages)

      expect(result.get('.js')).toBe(60)
      expect(result.get('.jsx')).toBe(60)
    })
  })

  describe('getFileExtension', () => {
    it('should extract extension from simple filename', () => {
      expect(fileAnalysis.getFileExtension('app.js')).toBe('.js')
    })

    it('should extract extension from path', () => {
      expect(fileAnalysis.getFileExtension('src/components/App.tsx')).toBe('.tsx')
    })

    it('should handle files with multiple dots', () => {
      expect(fileAnalysis.getFileExtension('app.test.js')).toBe('.js')
    })

    it('should return empty string for files without extension', () => {
      expect(fileAnalysis.getFileExtension('Makefile')).toBe('')
    })

    it('should return empty string for hidden files without extension', () => {
      expect(fileAnalysis.getFileExtension('.gitignore')).toBe('')
    })

    it('should handle paths with dots in directory names', () => {
      expect(fileAnalysis.getFileExtension('src/v1.0/app.js')).toBe('.js')
    })

    it('should return empty string for directories', () => {
      expect(fileAnalysis.getFileExtension('src/components/')).toBe('')
    })
  })

  describe('getFileName', () => {
    it('should extract filename from simple path', () => {
      expect(fileAnalysis.getFileName('app.js')).toBe('app.js')
    })

    it('should extract filename from nested path', () => {
      expect(fileAnalysis.getFileName('src/components/App.tsx')).toBe('App.tsx')
    })

    it('should extract filename from deep path', () => {
      expect(fileAnalysis.getFileName('a/b/c/d/file.js')).toBe('file.js')
    })

    it('should handle paths with trailing slash', () => {
      expect(fileAnalysis.getFileName('src/components/')).toBe('')
    })

    it('should handle root level files', () => {
      expect(fileAnalysis.getFileName('README.md')).toBe('README.md')
    })
  })

  describe('getDirectoryPath', () => {
    it('should extract directory from nested path', () => {
      expect(fileAnalysis.getDirectoryPath('src/components/App.tsx')).toBe('src/components')
    })

    it('should extract directory from deep path', () => {
      expect(fileAnalysis.getDirectoryPath('a/b/c/d/file.js')).toBe('a/b/c/d')
    })

    it('should return dot for root level files', () => {
      expect(fileAnalysis.getDirectoryPath('README.md')).toBe('.')
    })

    it('should handle single level path', () => {
      expect(fileAnalysis.getDirectoryPath('src/app.js')).toBe('src')
    })
  })

  describe('isPathExcluded', () => {
    it('should exclude paths with node_modules', () => {
      expect(fileAnalysis.isPathExcluded('node_modules/package/index.js')).toBe(true)
    })

    it('should exclude paths with dist', () => {
      expect(fileAnalysis.isPathExcluded('dist/bundle.js')).toBe(true)
    })

    it('should exclude paths with .git', () => {
      expect(fileAnalysis.isPathExcluded('.git/config')).toBe(true)
    })

    it('should exclude paths with vendor', () => {
      expect(fileAnalysis.isPathExcluded('vendor/package/file.php')).toBe(true)
    })

    it('should exclude paths with coverage', () => {
      expect(fileAnalysis.isPathExcluded('coverage/report.html')).toBe(true)
    })

    it('should not exclude valid paths', () => {
      expect(fileAnalysis.isPathExcluded('src/app.js')).toBe(false)
    })

    it('should handle nested excluded paths', () => {
      expect(fileAnalysis.isPathExcluded('src/node_modules/package/index.js')).toBe(true)
    })

    it('should check custom exclusions', () => {
      const customFileAnalysis = new FileAnalysisService({
        customExclusions: ['test']
      })

      expect(customFileAnalysis.isPathExcluded('src/test/app.test.js')).toBe(true)
    })

    it('should not exclude paths without custom exclusions', () => {
      const customFileAnalysis = new FileAnalysisService({
        customExclusions: ['test']
      })

      expect(customFileAnalysis.isPathExcluded('src/app.js')).toBe(false)
    })

    it('should handle multiple custom exclusions', () => {
      const customFileAnalysis = new FileAnalysisService({
        customExclusions: ['test', 'tmp']
      })

      expect(customFileAnalysis.isPathExcluded('src/test/app.js')).toBe(true)
      expect(customFileAnalysis.isPathExcluded('tmp/cache.js')).toBe(true)
    })
  })

  describe('analyzeFileStructure', () => {
    it('should group files by extension', () => {
      const files = [
        { path: 'src/app.js', extension: '.js', size: 1024 },
        { path: 'src/utils.js', extension: '.js', size: 512 },
        { path: 'src/types.ts', extension: '.ts', size: 256 }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.filesByExtension['.js'].count).toBe(2)
      expect(result.filesByExtension['.js'].totalSize).toBe(1536)
      expect(result.filesByExtension['.ts'].count).toBe(1)
      expect(result.filesByExtension['.ts'].totalSize).toBe(256)
    })

    it('should group files by directory', () => {
      const files = [
        { path: 'src/app.js', extension: '.js', fileName: 'app.js' },
        { path: 'src/utils.js', extension: '.js', fileName: 'utils.js' },
        { path: 'lib/helper.js', extension: '.js', fileName: 'helper.js' }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.filesByDirectory['src'].count).toBe(2)
      expect(result.filesByDirectory['src'].files).toContain('app.js')
      expect(result.filesByDirectory['src'].files).toContain('utils.js')
      expect(result.filesByDirectory['lib'].count).toBe(1)
      expect(result.filesByDirectory['lib'].files).toContain('helper.js')
    })

    it('should calculate complexity indicators', () => {
      const files = [
        { path: 'src/app.js', extension: '.js', size: 1024, content: 'line1\nline2\nline3' },
        { path: 'src/deep/nested/file.js', extension: '.js', size: 512, content: 'line1\nline2' }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.complexityIndicators.totalLines).toBe(5)
      expect(result.complexityIndicators.averageFileSize).toBe(768)
      expect(result.complexityIndicators.deepestNesting).toBe(4)
    })

    it('should identify largest files', () => {
      const files = [
        { path: 'src/small.js', size: 100 },
        { path: 'src/large.js', size: 5000 },
        { path: 'src/medium.js', size: 1000 }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.largestFiles).toHaveLength(3)
      expect(result.largestFiles[0].path).toBe('src/large.js')
      expect(result.largestFiles[0].size).toBe(5000)
      expect(result.largestFiles[1].path).toBe('src/medium.js')
      expect(result.largestFiles[2].path).toBe('src/small.js')
    })

    it('should limit largest files to top 5', () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `src/file${i}.js`,
        size: (10 - i) * 1000
      }))

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.largestFiles).toHaveLength(5)
      expect(result.largestFiles[0].size).toBe(10000)
      expect(result.largestFiles[4].size).toBe(6000)
    })

    it('should handle files without content', () => {
      const files = [
        { path: 'src/app.js', extension: '.js', size: 1024 }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.complexityIndicators.totalLines).toBe(0)
    })

    it('should handle files without size', () => {
      const files = [
        { path: 'src/app.js', extension: '.js', content: 'line1\nline2' }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.complexityIndicators.averageFileSize).toBe(0)
      expect(result.complexityIndicators.totalLines).toBe(2)
    })

    it('should handle empty files array', () => {
      const result = fileAnalysis.analyzeFileStructure([])

      expect(result.filesByExtension).toEqual({})
      expect(result.filesByDirectory).toEqual({})
      expect(result.largestFiles).toHaveLength(0)
      expect(result.complexityIndicators.totalLines).toBe(0)
      expect(result.complexityIndicators.averageFileSize).toBe(0)
      expect(result.complexityIndicators.deepestNesting).toBe(0)
    })

    it('should handle files without extension property', () => {
      const files = [
        { path: 'src/app.js', size: 1024 }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.filesByExtension['.js'].count).toBe(1)
    })

    it('should handle files without fileName property', () => {
      const files = [
        { path: 'src/app.js', extension: '.js' }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.filesByDirectory['src'].files).toContain('app.js')
    })

    it('should calculate correct line counts for multiline content', () => {
      const files = [
        { path: 'src/app.js', content: 'line1\nline2\nline3\nline4\nline5' }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.complexityIndicators.totalLines).toBe(5)
    })

    it('should calculate nesting depth correctly', () => {
      const files = [
        { path: 'file.js' },
        { path: 'src/file.js' },
        { path: 'src/deep/nested/path/file.js' }
      ]

      const result = fileAnalysis.analyzeFileStructure(files)

      expect(result.complexityIndicators.deepestNesting).toBe(5)
    })
  })
})
