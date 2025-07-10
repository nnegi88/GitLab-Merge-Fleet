/**
 * File analysis service - handles file filtering, prioritization, and selection
 * Extracted from RepositoryAnalyzer for better modularity
 * 
 * EXTENSION POINTS:
 * 1. Override filterFiles() to implement custom file filtering logic
 * 2. Override prioritizeFiles() to implement custom priority algorithms
 * 3. Override selectFiles() to implement custom selection strategies
 * 4. Override analyzeFileStructure() to add custom analysis metrics
 * 5. Add new utility methods for file path operations
 * 6. Implement custom file categorization logic
 * 
 * USAGE:
 * const fileAnalysis = new FileAnalysisService(options)
 * const filtered = fileAnalysis.filterFiles(tree)
 * const prioritized = fileAnalysis.prioritizeFiles(filtered, languages)
 * const selected = fileAnalysis.selectFiles(prioritized)
 */

import { 
  FILE_EXTENSIONS, 
  EXCLUDED_PATHS, 
  LANGUAGE_EXTENSIONS,
  FILE_PRIORITY_RULES 
} from '../config/analysis.js'

export class FileAnalysisService {
  constructor(options = {}) {
    this.options = {
      maxFiles: 100,
      maxFileSize: 100 * 1024, // 100KB
      includeConfig: true,
      includeDocs: false,
      customExtensions: [],
      customExclusions: [],
      ...options
    }
  }

  /**
   * Filter files based on exclusion rules and file types
   * EXTENSION POINT: Override this method to implement custom filtering logic
   * 
   * @param {Array} tree - Repository file tree from GitLab API
   * @returns {Array} Filtered files array
   */
  filterFiles(tree) {
    return tree.filter(item => {
      // Only include files (not directories)
      if (item.type !== 'blob') return false
      
      const path = item.path
      const ext = this.getFileExtension(path)
      
      // Check excluded paths
      if (this.isPathExcluded(path)) return false
      
      // Check excluded extensions
      if (FILE_EXTENSIONS.EXCLUDED.has(ext)) return false
      
      // Check file size (if available)
      if (item.size && item.size > this.options.maxFileSize) return false
      
      // Include based on file type
      const isCode = FILE_EXTENSIONS.CODE.has(ext) || this.options.customExtensions.includes(ext)
      const isConfig = this.options.includeConfig && FILE_EXTENSIONS.CONFIG.has(ext)
      const isDoc = this.options.includeDocs && FILE_EXTENSIONS.DOCS.has(ext)
      
      return isCode || isConfig || isDoc
    })
  }

  /**
   * Prioritize files based on importance and language distribution
   * EXTENSION POINT: Override this method to implement custom priority algorithms
   * 
   * @param {Array} files - Filtered files array
   * @param {Object} languages - Language distribution from GitLab API
   * @returns {Array} Prioritized files array (sorted by priority desc)
   */
  prioritizeFiles(files, languages) {
    const languageExtensions = this.getLanguageExtensions(languages)
    
    return files.map(file => {
      const ext = this.getFileExtension(file.path)
      const fileName = this.getFileName(file.path)
      
      let priority = 0
      
      // Language-based priority
      if (languageExtensions.has(ext)) {
        priority += languageExtensions.get(ext)
      }
      
      // Apply name-based priority rules
      for (const rule of FILE_PRIORITY_RULES.NAME_PATTERNS) {
        if (rule.pattern.test(fileName)) {
          priority += rule.score
        }
      }
      
      // Apply path-based priority rules
      for (const rule of FILE_PRIORITY_RULES.PATH_PATTERNS) {
        if (rule.pattern.test(file.path)) {
          priority += rule.score
        }
      }
      
      return {
        ...file,
        priority,
        extension: ext,
        fileName
      }
    }).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Select top files based on priority and limits
   * EXTENSION POINT: Override this method to implement custom selection strategies
   * 
   * @param {Array} prioritizedFiles - Prioritized files array
   * @returns {Array} Selected files array (limited by maxFiles option)
   */
  selectFiles(prioritizedFiles) {
    const maxFiles = Math.min(this.options.maxFiles, prioritizedFiles.length)
    return prioritizedFiles.slice(0, maxFiles)
  }

  /**
   * Get language priority mapping from GitLab languages data
   */
  getLanguageExtensions(languages) {
    const extensionMap = new Map()
    
    Object.entries(languages).forEach(([language, percentage]) => {
      const extensions = LANGUAGE_EXTENSIONS[language] || []
      extensions.forEach(ext => {
        extensionMap.set(ext, percentage)
      })
    })
    
    return extensionMap
  }

  /**
   * Utility: Get file extension from path
   */
  getFileExtension(path) {
    const lastDot = path.lastIndexOf('.')
    return lastDot > 0 ? path.substring(lastDot) : ''
  }

  /**
   * Utility: Get filename from path
   */
  getFileName(path) {
    return path.split('/').pop() || ''
  }

  /**
   * Utility: Get directory path from file path
   */
  getDirectoryPath(path) {
    const parts = path.split('/')
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
  }

  /**
   * Check if path should be excluded from analysis
   */
  isPathExcluded(path) {
    const pathParts = path.split('/')
    
    // Check if any part of the path is in excluded paths
    for (const part of pathParts) {
      if (EXCLUDED_PATHS.has(part)) return true
    }
    
    // Check custom exclusions
    for (const exclusion of this.options.customExclusions) {
      if (path.includes(exclusion)) return true
    }
    
    return false
  }

  /**
   * Analyze file structure and provide insights
   */
  analyzeFileStructure(files) {
    const analysis = {
      filesByExtension: {},
      filesByDirectory: {},
      largestFiles: [],
      complexityIndicators: {
        totalLines: 0,
        averageFileSize: 0,
        deepestNesting: 0
      }
    }
    
    let totalSize = 0
    let totalLines = 0
    
    files.forEach(file => {
      const ext = file.extension || this.getFileExtension(file.path)
      const dir = this.getDirectoryPath(file.path)
      const lines = file.content ? file.content.split('\n').length : 0
      
      // Group by extension
      if (!analysis.filesByExtension[ext]) {
        analysis.filesByExtension[ext] = { count: 0, totalSize: 0 }
      }
      analysis.filesByExtension[ext].count++
      analysis.filesByExtension[ext].totalSize += file.size || 0
      
      // Group by directory
      if (!analysis.filesByDirectory[dir]) {
        analysis.filesByDirectory[dir] = { count: 0, files: [] }
      }
      analysis.filesByDirectory[dir].count++
      analysis.filesByDirectory[dir].files.push(file.fileName || this.getFileName(file.path))
      
      totalSize += file.size || 0
      totalLines += lines
      
      // Track nesting depth
      const depth = file.path.split('/').length
      if (depth > analysis.complexityIndicators.deepestNesting) {
        analysis.complexityIndicators.deepestNesting = depth
      }
    })
    
    analysis.complexityIndicators.totalLines = totalLines
    analysis.complexityIndicators.averageFileSize = files.length > 0 ? totalSize / files.length : 0
    
    // Find largest files
    analysis.largestFiles = files
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 5)
      .map(f => ({ path: f.path, size: f.size || 0 }))
    
    return analysis
  }
}