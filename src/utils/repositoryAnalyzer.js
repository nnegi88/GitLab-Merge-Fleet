import gitlabAPI from '../api/gitlab'

// File extensions for different categories
const CODE_EXTENSIONS = new Set([
  // Web technologies
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.scss', '.sass', '.less',
  // Backend languages
  '.py', '.java', '.cs', '.rb', '.go', '.php', '.swift', '.kt', '.scala',
  // Systems languages
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.rs', '.asm',
  // Functional languages
  '.hs', '.ml', '.fs', '.clj', '.lisp', '.elm',
  // Data & markup
  '.json', '.xml', '.yaml', '.yml', '.toml', '.sql',
  // Shell & scripting
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'
])

const CONFIG_EXTENSIONS = new Set([
  '.json', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config',
  '.env', '.properties', '.plist', '.xml'
])

const DOC_EXTENSIONS = new Set([
  '.md', '.txt', '.rst', '.adoc', '.tex'
])

// Paths to exclude from analysis
const EXCLUDED_PATHS = new Set([
  'node_modules', 'vendor', 'build', 'dist', 'target', 'bin', 'obj',
  '.git', '.svn', '.hg', '.vs', '.vscode', '.idea',
  'coverage', '__pycache__', '.pytest_cache', '.mypy_cache',
  'logs', 'tmp', 'temp', '.cache', '.nuxt', '.next'
])

const EXCLUDED_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',
  // Binaries
  '.exe', '.dll', '.so', '.dylib', '.app', '.deb', '.rpm',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Media
  '.mp4', '.avi', '.mov', '.mp3', '.wav', '.ogg',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Large data
  '.db', '.sqlite', '.dump', '.backup'
])

/**
 * Repository analyzer for comprehensive code review
 */
export class RepositoryAnalyzer {
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
   * Analyze a repository and return structured file data
   */
  async analyzeRepository(projectId, ref = 'main', progressCallback = null) {
    try {
      const project = await gitlabAPI.getProject(projectId)
      const languages = await gitlabAPI.getRepositoryLanguages(projectId)
      
      if (progressCallback) {
        progressCallback({ phase: 'discovery', message: 'Discovering files...' })
      }
      
      const tree = await gitlabAPI.getRepositoryTree(projectId, ref, true)
      
      if (progressCallback) {
        progressCallback({ phase: 'filtering', message: 'Filtering files...' })
      }
      
      const filteredFiles = this.filterFiles(tree)
      const prioritizedFiles = this.prioritizeFiles(filteredFiles, languages)
      const selectedFiles = this.selectFiles(prioritizedFiles)
      
      if (progressCallback) {
        progressCallback({ 
          phase: 'fetching', 
          message: `Fetching content for ${selectedFiles.length} files...`,
          filesCount: selectedFiles.length
        })
      }
      
      const fileContents = await this.fetchFileContents(projectId, selectedFiles, ref, progressCallback)
      
      return {
        project,
        languages,
        totalFiles: tree.length,
        filteredFiles: filteredFiles.length,
        selectedFiles: selectedFiles.length,
        files: fileContents,
        analysis: this.analyzeFileStructure(fileContents)
      }
    } catch (error) {
      console.error('Repository analysis failed:', error)
      throw error
    }
  }

  /**
   * Filter files based on exclusion rules and file types
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
      if (EXCLUDED_EXTENSIONS.has(ext)) return false
      
      // Check file size (if available)
      if (item.size && item.size > this.options.maxFileSize) return false
      
      // Include based on file type
      const isCode = CODE_EXTENSIONS.has(ext) || this.options.customExtensions.includes(ext)
      const isConfig = this.options.includeConfig && CONFIG_EXTENSIONS.has(ext)
      const isDoc = this.options.includeDocs && DOC_EXTENSIONS.has(ext)
      
      return isCode || isConfig || isDoc
    })
  }

  /**
   * Prioritize files based on importance and language distribution
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
      
      // File importance
      if (fileName.toLowerCase().includes('index') || fileName.toLowerCase().includes('main')) {
        priority += 20
      }
      
      if (fileName.toLowerCase().includes('app') || fileName.toLowerCase().includes('server')) {
        priority += 15
      }
      
      if (fileName.toLowerCase().includes('config') || fileName.toLowerCase().includes('setting')) {
        priority += 10
      }
      
      // Security-related files
      if (fileName.toLowerCase().includes('auth') || fileName.toLowerCase().includes('security')) {
        priority += 25
      }
      
      // API/route files
      if (file.path.includes('/api/') || file.path.includes('/routes/') || file.path.includes('/controllers/')) {
        priority += 15
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
   */
  selectFiles(prioritizedFiles) {
    const maxFiles = Math.min(this.options.maxFiles, prioritizedFiles.length)
    return prioritizedFiles.slice(0, maxFiles)
  }

  /**
   * Fetch file contents for selected files
   */
  async fetchFileContents(projectId, files, ref, progressCallback = null) {
    const filePaths = files.map(f => f.path)
    const results = []
    
    // Process in smaller batches for better progress tracking
    const BATCH_SIZE = 10
    let processed = 0
    
    for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
      const batch = filePaths.slice(i, i + BATCH_SIZE)
      
      if (progressCallback) {
        progressCallback({
          phase: 'fetching',
          message: `Fetching files ${processed + 1}-${Math.min(processed + batch.length, filePaths.length)} of ${filePaths.length}...`,
          progress: (processed / filePaths.length) * 100
        })
      }
      
      const batchResults = await gitlabAPI.getFileContentBatch(projectId, batch, ref)
      
      // Combine file metadata with content
      batchResults.forEach(result => {
        if (result.success) {
          const fileInfo = files.find(f => f.path === result.path)
          results.push({
            ...fileInfo,
            content: result.data.content,
            encoding: result.data.encoding,
            size: result.data.size
          })
        }
      })
      
      processed += batch.length
    }
    
    return results
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

  /**
   * Get language priority mapping from GitLab languages data
   */
  getLanguageExtensions(languages) {
    const extensionMap = new Map()
    const languageExtensionMap = {
      'JavaScript': ['.js', '.jsx'],
      'TypeScript': ['.ts', '.tsx'],
      'Vue': ['.vue'],
      'Python': ['.py'],
      'Java': ['.java'],
      'C#': ['.cs'],
      'Ruby': ['.rb'],
      'Go': ['.go'],
      'PHP': ['.php'],
      'Swift': ['.swift'],
      'Kotlin': ['.kt'],
      'Scala': ['.scala'],
      'C++': ['.cpp', '.cc', '.cxx'],
      'C': ['.c'],
      'Rust': ['.rs']
    }
    
    Object.entries(languages).forEach(([language, percentage]) => {
      const extensions = languageExtensionMap[language] || []
      extensions.forEach(ext => {
        extensionMap.set(ext, percentage)
      })
    })
    
    return extensionMap
  }

  /**
   * Utility methods
   */
  getFileExtension(path) {
    const lastDot = path.lastIndexOf('.')
    return lastDot > 0 ? path.substring(lastDot) : ''
  }

  getFileName(path) {
    return path.split('/').pop() || ''
  }

  getDirectoryPath(path) {
    const parts = path.split('/')
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
  }

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
}

export default RepositoryAnalyzer