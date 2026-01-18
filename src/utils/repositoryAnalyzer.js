import gitlabAPI from '../api/gitlab'
import { FileAnalysisService } from '../services/fileAnalysis.js'
import { DEFAULT_ANALYSIS_OPTIONS } from '../config/analysis.js'

/**
 * Repository analyzer for comprehensive code review
 * Now uses modular services for better extensibility
 * 
 * EXTENSION POINTS:
 * 1. Replace FileAnalysisService with custom implementation via constructor injection
 * 2. Override analyzeRepository() to implement custom analysis workflows
 * 3. Override fetchFileContents() to implement custom content fetching strategies
 * 4. Add new analysis phases by extending the workflow
 * 5. Implement custom progress tracking and callback mechanisms
 * 6. Add support for different repository providers (GitHub, Bitbucket, etc.)
 * 
 * USAGE:
 * const analyzer = new RepositoryAnalyzer(options)
 * const result = await analyzer.analyzeRepository(projectId, branch, progressCallback)
 * 
 * CUSTOM FILE ANALYSIS SERVICE:
 * const customFileAnalysis = new CustomFileAnalysisService(options)
 * const analyzer = new RepositoryAnalyzer(options, customFileAnalysis)
 */
export class RepositoryAnalyzer {
  constructor(options = {}, fileAnalysisService = null) {
    this.options = {
      ...DEFAULT_ANALYSIS_OPTIONS,
      ...options
    }
    
    // EXTENSION POINT: Allow custom file analysis service injection
    this.fileAnalysis = fileAnalysisService || new FileAnalysisService(this.options)
  }

  /**
   * Analyze a repository and return structured file data
   * EXTENSION POINT: Override this method to implement custom analysis workflows
   *
   * @param {Number} projectId - GitLab project ID
   * @param {String} ref - Git reference (branch, tag, commit)
   * @param {Function} progressCallback - Optional callback for progress updates
   * @param {AbortSignal} signal - Optional AbortController signal for cancellation
   * @returns {Object} Analysis results with project, files, and analysis data
   */
  async analyzeRepository(projectId, ref = 'main', progressCallback = null, signal = null) {
    try {
      const config = signal ? { signal } : {}

      const project = await gitlabAPI.getProject(projectId, config)
      const languages = await gitlabAPI.getRepositoryLanguages(projectId, config)

      if (progressCallback) {
        progressCallback({ phase: 'discovery', message: 'Discovering files...' })
      }

      const tree = await gitlabAPI.getRepositoryTree(projectId, ref, true, config)

      if (progressCallback) {
        progressCallback({ phase: 'filtering', message: 'Filtering files...' })
      }

      const filteredFiles = this.fileAnalysis.filterFiles(tree)
      const prioritizedFiles = this.fileAnalysis.prioritizeFiles(filteredFiles, languages)
      const selectedFiles = this.fileAnalysis.selectFiles(prioritizedFiles)

      if (progressCallback) {
        progressCallback({
          phase: 'fetching',
          message: `Fetching content for ${selectedFiles.length} files...`,
          filesCount: selectedFiles.length
        })
      }

      const fileContents = await this.fetchFileContents(projectId, selectedFiles, ref, progressCallback, signal)

      return {
        project,
        branch: ref,
        languages,
        totalFiles: tree.length,
        filteredFiles: filteredFiles.length,
        selectedFiles: selectedFiles.length,
        files: fileContents,
        analysis: this.fileAnalysis.analyzeFileStructure(fileContents)
      }
    } catch (error) {
      console.error('Repository analysis failed:', error)
      throw error
    }
  }


  /**
   * Fetch file contents for selected files
   * @param {Number} projectId - GitLab project ID
   * @param {Array} files - Array of file metadata objects
   * @param {String} ref - Git reference (branch, tag, commit)
   * @param {Function} progressCallback - Optional callback for progress updates
   * @param {AbortSignal} signal - Optional AbortController signal for cancellation
   * @returns {Array} Array of file objects with content
   */
  async fetchFileContents(projectId, files, ref, progressCallback = null, signal = null) {
    const filePaths = files.map(f => f.path)
    const results = []
    const config = signal ? { signal } : {}

    // Process in smaller batches for better progress tracking
    const BATCH_SIZE = this.options.batchSize || 10
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

      const batchResults = await gitlabAPI.getFileContentBatch(projectId, batch, ref, config)

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

}

export default RepositoryAnalyzer