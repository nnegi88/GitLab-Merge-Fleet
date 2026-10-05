import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanceledError } from 'axios'
import gitlabAPI from '../../../src/api/gitlab'
import { RepositoryAnalyzer } from '../../../src/utils/repositoryAnalyzer'

vi.mock('../../../src/api/gitlab', () => ({
  default: {
    getProject: vi.fn(),
    getRepositoryLanguages: vi.fn(),
    getRepositoryTree: vi.fn(),
    getFileContentBatch: vi.fn()
  }
}))

const project = { id: 7, name_with_namespace: 'acme / fleet', default_branch: 'main' }
const languages = { JavaScript: 80, Vue: 20 }

const blob = (path, size = 100) => ({ type: 'blob', path, size })

const tree = [
  { type: 'tree', path: 'src' },
  blob('src/main.js'),
  blob('src/App.vue'),
  blob('src/utils/format.js'),
  blob('package.json'),
  blob('README.md'),
  blob('public/logo.png'),
  blob('node_modules/lib/index.js'),
  blob('src/huge.js', 500 * 1024)
]

// What GitLab returns for each path: a successful fetch with its content.
const fetched = (path) => ({
  path,
  success: true,
  data: { content: `// ${path}\nexport {}`, encoding: 'base64', size: 30 }
})

const paths = (files) => files.map(f => f.path).sort()

describe('RepositoryAnalyzer', () => {
  beforeEach(() => {
    gitlabAPI.getProject.mockResolvedValue(project)
    gitlabAPI.getRepositoryLanguages.mockResolvedValue(languages)
    gitlabAPI.getRepositoryTree.mockResolvedValue(tree)
    gitlabAPI.getFileContentBatch.mockImplementation(
      async (projectId, batch) => batch.map(fetched)
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('analyzeRepository', () => {
    it('reads the project, its languages and the full tree at the given ref', async () => {
      await new RepositoryAnalyzer().analyzeRepository(7, 'develop')

      expect(gitlabAPI.getProject).toHaveBeenCalledWith(7, {})
      expect(gitlabAPI.getRepositoryLanguages).toHaveBeenCalledWith(7, {})
      expect(gitlabAPI.getRepositoryTree).toHaveBeenCalledWith(7, 'develop', true, {})
    })

    it('reviews the main branch by default', async () => {
      const result = await new RepositoryAnalyzer().analyzeRepository(7)

      expect(result.branch).toBe('main')
      expect(gitlabAPI.getRepositoryTree).toHaveBeenCalledWith(7, 'main', true, {})
    })

    it('selects code and config files, skipping folders, excluded paths, binaries and oversized files', async () => {
      const result = await new RepositoryAnalyzer().analyzeRepository(7, 'main')

      expect(paths(result.files)).toEqual([
        'package.json',
        'src/App.vue',
        'src/main.js',
        'src/utils/format.js'
      ])
      expect(result.totalFiles).toBe(9)
      expect(result.filteredFiles).toBe(4)
      expect(result.selectedFiles).toBe(4)
    })

    it('includes docs when asked to', async () => {
      const result = await new RepositoryAnalyzer({ includeDocs: true }).analyzeRepository(7)

      expect(paths(result.files)).toContain('README.md')
    })

    it('honours custom exclusions', async () => {
      const result = await new RepositoryAnalyzer({ customExclusions: ['src/utils'] })
        .analyzeRepository(7)

      expect(paths(result.files)).not.toContain('src/utils/format.js')
    })

    it('caps the review at maxFiles', async () => {
      const result = await new RepositoryAnalyzer({ maxFiles: 2 }).analyzeRepository(7)

      expect(result.filteredFiles).toBe(4)
      expect(result.selectedFiles).toBe(2)
      expect(result.files).toHaveLength(2)
    })

    it('returns each file with its fetched content alongside its metadata', async () => {
      const result = await new RepositoryAnalyzer().analyzeRepository(7)

      const main = result.files.find(f => f.path === 'src/main.js')
      expect(main).toMatchObject({
        path: 'src/main.js',
        type: 'blob',
        extension: '.js',
        fileName: 'main.js',
        content: '// src/main.js\nexport {}',
        encoding: 'base64',
        size: 30
      })
    })

    it('returns the project, languages and a structural analysis of the fetched files', async () => {
      const result = await new RepositoryAnalyzer().analyzeRepository(7)

      expect(result.project).toBe(project)
      expect(result.languages).toBe(languages)
      expect(result.analysis.filesByExtension['.js'].count).toBe(2)
      expect(result.analysis.filesByExtension['.vue'].count).toBe(1)
      expect(result.analysis.complexityIndicators.totalLines).toBe(8)
    })

    it('leaves out files GitLab failed to return', async () => {
      gitlabAPI.getFileContentBatch.mockImplementation(async (projectId, batch) =>
        batch.map(path =>
          path === 'src/App.vue'
            ? { path, success: false, error: '404 File Not Found' }
            : fetched(path)
        )
      )

      const result = await new RepositoryAnalyzer().analyzeRepository(7)

      expect(paths(result.files)).not.toContain('src/App.vue')
      expect(result.files).toHaveLength(3)
    })

    it('reports progress through each phase', async () => {
      const progress = vi.fn()

      await new RepositoryAnalyzer().analyzeRepository(7, 'main', progress)

      expect(progress.mock.calls.map(([p]) => p.phase)).toEqual([
        'discovery',
        'filtering',
        'fetching',
        'fetching'
      ])
      expect(progress).toHaveBeenCalledWith({
        phase: 'fetching',
        message: 'Fetching content for 4 files...',
        filesCount: 4
      })
    })

    it('rethrows GitLab failures and logs them', async () => {
      const failure = new Error('404 Project Not Found')
      gitlabAPI.getProject.mockRejectedValue(failure)

      await expect(new RepositoryAnalyzer().analyzeRepository(7)).rejects.toBe(failure)
      expect(console.error).toHaveBeenCalledWith('Repository analysis failed:', failure)
    })

    it('passes the abort signal to every GitLab request', async () => {
      const { signal } = new AbortController()

      await new RepositoryAnalyzer().analyzeRepository(7, 'main', null, signal)

      expect(gitlabAPI.getProject).toHaveBeenCalledWith(7, { signal })
      expect(gitlabAPI.getRepositoryLanguages).toHaveBeenCalledWith(7, { signal })
      expect(gitlabAPI.getRepositoryTree).toHaveBeenCalledWith(7, 'main', true, { signal })
      expect(gitlabAPI.getFileContentBatch).toHaveBeenCalledWith(
        7, expect.any(Array), 'main', { signal }
      )
    })
  })

  describe('cancellation', () => {
    it('stops fetching and throws an AbortError when cancelled mid-fetch', async () => {
      const controller = new AbortController()
      // Like the real client, an aborted batch comes back as per-file failures, not a throw.
      gitlabAPI.getFileContentBatch.mockImplementation(async (projectId, batch) => {
        controller.abort()
        return batch.map(path => ({ path, success: false, error: 'canceled' }))
      })

      const analysis = new RepositoryAnalyzer({ batchSize: 1 })
        .analyzeRepository(7, 'main', null, controller.signal)

      await expect(analysis).rejects.toMatchObject({ name: 'AbortError' })
      expect(gitlabAPI.getFileContentBatch).toHaveBeenCalledTimes(1)
    })

    it('throws an AbortError when cancelled while discovering files', async () => {
      const controller = new AbortController()
      gitlabAPI.getRepositoryTree.mockImplementation(async () => {
        controller.abort()
        throw new CanceledError()
      })

      const analysis = new RepositoryAnalyzer()
        .analyzeRepository(7, 'main', null, controller.signal)

      await expect(analysis).rejects.toMatchObject({ name: 'AbortError' })
      expect(gitlabAPI.getFileContentBatch).not.toHaveBeenCalled()
    })

    it('does not log a cancellation as a failure', async () => {
      const controller = new AbortController()
      gitlabAPI.getProject.mockImplementation(async () => {
        controller.abort()
        throw new CanceledError()
      })

      await new RepositoryAnalyzer()
        .analyzeRepository(7, 'main', null, controller.signal)
        .catch(() => {})

      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe('fetchFileContents', () => {
    const files = Array.from({ length: 5 }, (_, i) => ({ path: `src/f${i}.js` }))

    it('fetches files in batches of batchSize, reporting progress before each', async () => {
      const progress = vi.fn()

      const result = await new RepositoryAnalyzer({ batchSize: 2 })
        .fetchFileContents(7, files, 'main', progress)

      expect(gitlabAPI.getFileContentBatch.mock.calls.map(([, batch]) => batch)).toEqual([
        ['src/f0.js', 'src/f1.js'],
        ['src/f2.js', 'src/f3.js'],
        ['src/f4.js']
      ])
      expect(progress.mock.calls.map(([p]) => [p.message, p.progress])).toEqual([
        ['Fetching files 1-2 of 5...', 0],
        ['Fetching files 3-4 of 5...', 40],
        ['Fetching files 5-5 of 5...', 80]
      ])
      expect(result.map(f => f.path)).toEqual(files.map(f => f.path))
    })

    it('fetches nothing when there are no files', async () => {
      const result = await new RepositoryAnalyzer().fetchFileContents(7, [], 'main')

      expect(result).toEqual([])
      expect(gitlabAPI.getFileContentBatch).not.toHaveBeenCalled()
    })
  })
})
