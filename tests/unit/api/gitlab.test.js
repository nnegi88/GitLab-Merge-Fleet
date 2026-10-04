import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import GitLabAPI from '../../../src/api/gitlab.js'
import { useAuthStore } from '../../../src/stores/authStore'

vi.mock('axios')
vi.mock('../../../src/stores/authStore')

describe('GitLabAPI', () => {
  let mockClient
  let mockAuthStore

  beforeEach(() => {
    // Reset the GitLabAPI instance state
    GitLabAPI.client = null
    GitLabAPI.gitlabVersion = null
    GitLabAPI.rateLimitInfo = {
      limit: null,
      remaining: null,
      reset: null,
      observed: null
    }

    // Mock axios client
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      defaults: {
        baseURL: 'https://gitlab.com/api/v4'
      },
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    }

    axios.create = vi.fn(() => mockClient)

    // Mock auth store
    mockAuthStore = {
      token: 'test-token',
      gitlabUrl: 'https://gitlab.com',
      clearToken: vi.fn()
    }
    useAuthStore.mockReturnValue(mockAuthStore)

    // Mock window.location.reload
    delete window.location
    window.location = { reload: vi.fn() }

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with null client and rate limit info', () => {
      expect(GitLabAPI.client).toBeNull()
      expect(GitLabAPI.gitlabVersion).toBeNull()
      expect(GitLabAPI.rateLimitInfo).toEqual({
        limit: null,
        remaining: null,
        reset: null,
        observed: null
      })
    })
  })

  describe('getClient', () => {
    it('should create new axios client with correct config', () => {
      GitLabAPI.getClient()

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://gitlab.com/api/v4',
        headers: {
          'PRIVATE-TOKEN': 'test-token',
          'Content-Type': 'application/json'
        }
      })
    })

    it('should reuse existing client if baseURL matches', () => {
      GitLabAPI.getClient()
      GitLabAPI.getClient()

      expect(axios.create).toHaveBeenCalledTimes(1)
    })

    it('should create new client if baseURL changes', () => {
      GitLabAPI.getClient()

      mockAuthStore.gitlabUrl = 'https://gitlab.example.com'
      GitLabAPI.client = null
      GitLabAPI.getClient()

      expect(axios.create).toHaveBeenCalledTimes(2)
      expect(axios.create).toHaveBeenLastCalledWith({
        baseURL: 'https://gitlab.example.com/api/v4',
        headers: {
          'PRIVATE-TOKEN': 'test-token',
          'Content-Type': 'application/json'
        }
      })
    })

    it('should setup response interceptor', () => {
      GitLabAPI.getClient()

      expect(mockClient.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('response interceptor', () => {
    let successHandler
    let errorHandler

    beforeEach(() => {
      GitLabAPI.getClient()
      const interceptorCall = mockClient.interceptors.response.use.mock.calls[0]
      successHandler = interceptorCall[0]
      errorHandler = interceptorCall[1]
    })

    it('should track rate limit info on successful response', () => {
      const response = {
        data: { test: 'data' },
        headers: {
          'ratelimit-limit': '60',
          'ratelimit-remaining': '50',
          'ratelimit-reset': '1640000000'
        }
      }

      const result = successHandler(response)

      expect(result).toEqual(response)
      expect(GitLabAPI.rateLimitInfo.limit).toBe(60)
      expect(GitLabAPI.rateLimitInfo.remaining).toBe(50)
      expect(GitLabAPI.rateLimitInfo.reset).toBeInstanceOf(Date)
    })

    it('should track rate limit info on error response', async () => {
      const error = {
        response: {
          status: 429,
          headers: {
            'ratelimit-limit': '60',
            'ratelimit-remaining': '0',
            'ratelimit-reset': '1640000000',
            'retry-after': '60'
          }
        }
      }

      await expect(errorHandler(error)).rejects.toThrow()
      expect(GitLabAPI.rateLimitInfo.limit).toBe(60)
      expect(GitLabAPI.rateLimitInfo.remaining).toBe(0)
    })

    it('should handle 429 rate limit errors with rateLimitInfo', async () => {
      const error = {
        response: {
          status: 429,
          headers: {
            'ratelimit-reset': '1640000000',
            'retry-after': '120'
          }
        }
      }

      try {
        await errorHandler(error)
      } catch (e) {
        expect(e.rateLimitInfo).toBeDefined()
        expect(e.rateLimitInfo.message).toBe('GitLab API rate limit exceeded')
        expect(e.rateLimitInfo.retryAfter).toBe(120)
        expect(e.rateLimitInfo.resetTime).toBeInstanceOf(Date)
      }
    })

    it('should handle 401 errors and clear token', async () => {
      const error = {
        response: {
          status: 401
        },
        config: {
          headers: {}
        }
      }

      await expect(errorHandler(error)).rejects.toThrow()
      expect(mockAuthStore.clearToken).toHaveBeenCalled()
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('should not clear token on 401 if X-Propagate-401 header is present', async () => {
      const error = {
        response: {
          status: 401
        },
        config: {
          headers: {
            'X-Propagate-401': 'true'
          }
        }
      }

      await expect(errorHandler(error)).rejects.toThrow()
      expect(mockAuthStore.clearToken).not.toHaveBeenCalled()
      expect(window.location.reload).not.toHaveBeenCalled()
    })
  })

  describe('updateRateLimitInfo', () => {
    it('should update rate limit info from headers with standard names', () => {
      const headers = {
        'ratelimit-limit': '60',
        'ratelimit-remaining': '50',
        'ratelimit-reset': '1640000000'
      }

      GitLabAPI.updateRateLimitInfo(headers)

      expect(GitLabAPI.rateLimitInfo.limit).toBe(60)
      expect(GitLabAPI.rateLimitInfo.remaining).toBe(50)
      expect(GitLabAPI.rateLimitInfo.reset).toBeInstanceOf(Date)
      expect(GitLabAPI.rateLimitInfo.observed).toBeInstanceOf(Date)
    })

    it('should update rate limit info from headers with x- prefix', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '75',
        'x-ratelimit-reset': '1640000100'
      }

      GitLabAPI.updateRateLimitInfo(headers)

      expect(GitLabAPI.rateLimitInfo.limit).toBe(100)
      expect(GitLabAPI.rateLimitInfo.remaining).toBe(75)
    })

    it('should handle headers with missing rate limit info', () => {
      const headers = {}

      GitLabAPI.updateRateLimitInfo(headers)

      expect(GitLabAPI.rateLimitInfo.limit).toBeNull()
      expect(GitLabAPI.rateLimitInfo.remaining).toBeNull()
      expect(GitLabAPI.rateLimitInfo.reset).toBeNull()
      expect(GitLabAPI.rateLimitInfo.observed).toBeInstanceOf(Date)
    })
  })

  describe('getRateLimitInfo', () => {
    it('should return a copy of rate limit info', () => {
      GitLabAPI.rateLimitInfo = {
        limit: 60,
        remaining: 50,
        reset: new Date(),
        observed: new Date()
      }

      const info = GitLabAPI.getRateLimitInfo()

      expect(info).toEqual(GitLabAPI.rateLimitInfo)
      expect(info).not.toBe(GitLabAPI.rateLimitInfo)
    })
  })

  describe('isApproachingRateLimit', () => {
    it('should return false when rate limit info is not set', () => {
      expect(GitLabAPI.isApproachingRateLimit()).toBe(false)
    })

    it('should return true when remaining is at or below threshold', () => {
      GitLabAPI.rateLimitInfo.limit = 100
      GitLabAPI.rateLimitInfo.remaining = 10

      expect(GitLabAPI.isApproachingRateLimit(0.1)).toBe(true)
    })

    it('should return true when remaining is exactly at threshold', () => {
      GitLabAPI.rateLimitInfo.limit = 100
      GitLabAPI.rateLimitInfo.remaining = 10

      expect(GitLabAPI.isApproachingRateLimit(0.1)).toBe(true)
    })

    it('should return false when remaining is above threshold', () => {
      GitLabAPI.rateLimitInfo.limit = 100
      GitLabAPI.rateLimitInfo.remaining = 50

      expect(GitLabAPI.isApproachingRateLimit(0.1)).toBe(false)
    })

    it('should use default threshold of 0.1', () => {
      GitLabAPI.rateLimitInfo.limit = 100
      GitLabAPI.rateLimitInfo.remaining = 5

      expect(GitLabAPI.isApproachingRateLimit()).toBe(true)
    })

    it('should return false when limit is null', () => {
      GitLabAPI.rateLimitInfo.limit = null
      GitLabAPI.rateLimitInfo.remaining = 10

      expect(GitLabAPI.isApproachingRateLimit()).toBe(false)
    })

    it('should return false when remaining is null', () => {
      GitLabAPI.rateLimitInfo.limit = 100
      GitLabAPI.rateLimitInfo.remaining = null

      expect(GitLabAPI.isApproachingRateLimit()).toBe(false)
    })
  })

  describe('waitForRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should wait when rate limit is exceeded', async () => {
      const resetTime = new Date(Date.now() + 5000)
      GitLabAPI.rateLimitInfo.reset = resetTime
      GitLabAPI.rateLimitInfo.remaining = 0

      const waitPromise = GitLabAPI.waitForRateLimit()

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit exceeded'))

      vi.advanceTimersByTime(5000)
      await waitPromise
    })

    it('should not wait when rate limit is not exceeded', async () => {
      GitLabAPI.rateLimitInfo.reset = new Date(Date.now() + 5000)
      GitLabAPI.rateLimitInfo.remaining = 10

      await GitLabAPI.waitForRateLimit()

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should not wait when reset time is null', async () => {
      GitLabAPI.rateLimitInfo.reset = null
      GitLabAPI.rateLimitInfo.remaining = 0

      await GitLabAPI.waitForRateLimit()

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should not wait when reset time is in the past', async () => {
      GitLabAPI.rateLimitInfo.reset = new Date(Date.now() - 5000)
      GitLabAPI.rateLimitInfo.remaining = 0

      await GitLabAPI.waitForRateLimit()

      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch current user', async () => {
      const userData = { id: 1, username: 'testuser' }
      mockClient.get.mockResolvedValue({ data: userData })

      const result = await GitLabAPI.getCurrentUser()

      expect(mockClient.get).toHaveBeenCalledWith('/user')
      expect(result).toEqual(userData)
    })
  })

  describe('getProjects', () => {
    it('should fetch projects with default params', async () => {
      const projects = [{ id: 1, name: 'project1' }]
      mockClient.get.mockResolvedValue({ data: projects })

      const result = await GitLabAPI.getProjects()

      expect(mockClient.get).toHaveBeenCalledWith('/projects', {
        params: {
          membership: true,
          order_by: 'last_activity_at',
          sort: 'desc',
          per_page: 100
        }
      })
      expect(result).toEqual(projects)
    })

    it('should fetch projects with custom params', async () => {
      const projects = [{ id: 1, name: 'project1' }]
      mockClient.get.mockResolvedValue({ data: projects })

      const customParams = { archived: false, per_page: 50 }
      await GitLabAPI.getProjects(customParams)

      expect(mockClient.get).toHaveBeenCalledWith('/projects', {
        params: {
          membership: true,
          order_by: 'last_activity_at',
          sort: 'desc',
          per_page: 50,
          archived: false
        }
      })
    })
  })

  describe('getProject', () => {
    it('should fetch a specific project', async () => {
      const project = { id: 1, name: 'project1' }
      mockClient.get.mockResolvedValue({ data: project })

      const result = await GitLabAPI.getProject(1)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1')
      expect(result).toEqual(project)
    })

    it('should encode project ID with special characters', async () => {
      const project = { id: 1, name: 'project1' }
      mockClient.get.mockResolvedValue({ data: project })

      await GitLabAPI.getProject('group/project')

      expect(mockClient.get).toHaveBeenCalledWith('/projects/group%2Fproject')
    })
  })

  describe('getMergeRequests', () => {
    it('should fetch merge requests with default params', async () => {
      const mergeRequests = [{ id: 1, title: 'MR 1' }]
      mockClient.get.mockResolvedValue({ data: mergeRequests })

      const result = await GitLabAPI.getMergeRequests()

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: {
          scope: 'all',
          state: 'opened',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: 100
        }
      })
      expect(result).toEqual(mergeRequests)
    })

    it('should fetch merge requests with custom scope and state', async () => {
      const mergeRequests = [{ id: 1, title: 'MR 1' }]
      mockClient.get.mockResolvedValue({ data: mergeRequests })

      await GitLabAPI.getMergeRequests({ scope: 'created_by_me', state: 'merged' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: {
          scope: 'created_by_me',
          state: 'merged',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: 100
        }
      })
    })

    it('should include search parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ search: 'bug fix' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          search: 'bug fix'
        })
      })
    })

    it('should include labels parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ labels: ['bug', 'urgent'] })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          labels: 'bug,urgent'
        })
      })
    })

    it('should include author parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ author: 'johndoe' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          author_username: 'johndoe'
        })
      })
    })

    it('should include assignee parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ assignee: 'janedoe' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          assignee_username: 'janedoe'
        })
      })
    })

    it('should include milestone parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ milestone: 'v1.0' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          milestone: 'v1.0'
        })
      })
    })

    it('should include wip parameter when set to yes', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ wip: 'yes' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          wip: 'yes'
        })
      })
    })

    it('should include wip parameter when set to no', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({ wip: 'no' })

      expect(mockClient.get).toHaveBeenCalledWith('/merge_requests', {
        params: expect.objectContaining({
          wip: 'no'
        })
      })
    })

    it('should not include wip parameter when not specified', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getMergeRequests({})

      const callParams = mockClient.get.mock.calls[0][1].params
      expect(callParams).not.toHaveProperty('wip')
    })
  })

  describe('getProjectMergeRequests', () => {
    it('should fetch project merge requests with default params', async () => {
      const mergeRequests = [{ id: 1, title: 'MR 1' }]
      mockClient.get.mockResolvedValue({ data: mergeRequests })

      const result = await GitLabAPI.getProjectMergeRequests(1)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/merge_requests', {
        params: {
          state: 'opened',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: 100
        }
      })
      expect(result).toEqual(mergeRequests)
    })

    it('should fetch project merge requests with custom params', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getProjectMergeRequests('group/project', { state: 'merged' })

      expect(mockClient.get).toHaveBeenCalledWith('/projects/group%2Fproject/merge_requests', {
        params: {
          state: 'merged',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: 100
        }
      })
    })
  })

  describe('getMergeRequest', () => {
    it('should fetch a specific merge request', async () => {
      const mergeRequest = { id: 1, iid: 10, title: 'MR 1' }
      mockClient.get.mockResolvedValue({ data: mergeRequest })

      const result = await GitLabAPI.getMergeRequest(1, 10)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/merge_requests/10')
      expect(result).toEqual(mergeRequest)
    })

    it('should encode project ID with special characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} })

      await GitLabAPI.getMergeRequest('group/project', 10)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/group%2Fproject/merge_requests/10')
    })
  })

  describe('createMergeRequest', () => {
    it('should create a merge request', async () => {
      const mrData = {
        source_branch: 'feature',
        target_branch: 'main',
        title: 'New MR'
      }
      const createdMR = { id: 1, ...mrData }
      mockClient.post.mockResolvedValue({ data: createdMR })

      const result = await GitLabAPI.createMergeRequest(1, mrData)

      expect(mockClient.post).toHaveBeenCalledWith('/projects/1/merge_requests', mrData)
      expect(result).toEqual(createdMR)
    })
  })

  describe('getMergeRequestDiff', () => {
    it('should fetch merge request diff in text format', async () => {
      const diffText = 'diff --git a/file.js b/file.js\n...'
      mockClient.get.mockResolvedValue({ data: diffText })

      const result = await GitLabAPI.getMergeRequestDiff(1, 10)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/merge_requests/10.diff', {
        headers: { 'Accept': 'text/plain' }
      })
      expect(result).toBe(diffText)
    })

    it('should fallback to changes format if diff fails', async () => {
      const changesData = {
        changes: [
          {
            old_path: 'file.js',
            new_path: 'file.js',
            diff: '@@ -1,1 +1,1 @@\n-old\n+new'
          }
        ]
      }

      mockClient.get
        .mockRejectedValueOnce(new Error('Diff not available'))
        .mockResolvedValueOnce({ data: changesData })

      const result = await GitLabAPI.getMergeRequestDiff(1, 10)

      expect(result).toContain('diff --git a/file.js b/file.js')
      expect(result).toContain('@@ -1,1 +1,1 @@')
    })

    it('should handle new file in changes fallback', async () => {
      const changesData = {
        changes: [
          {
            new_path: 'newfile.js',
            new_file: true,
            diff: '@@ -0,0 +1,1 @@\n+content'
          }
        ]
      }

      mockClient.get
        .mockRejectedValueOnce(new Error('Diff not available'))
        .mockResolvedValueOnce({ data: changesData })

      const result = await GitLabAPI.getMergeRequestDiff(1, 10)

      expect(result).toContain('new file mode 100644')
    })

    it('should handle deleted file in changes fallback', async () => {
      const changesData = {
        changes: [
          {
            old_path: 'deleted.js',
            deleted_file: true,
            diff: '@@ -1,1 +0,0 @@\n-content'
          }
        ]
      }

      mockClient.get
        .mockRejectedValueOnce(new Error('Diff not available'))
        .mockResolvedValueOnce({ data: changesData })

      const result = await GitLabAPI.getMergeRequestDiff(1, 10)

      expect(result).toContain('deleted file mode 100644')
    })

    it('should handle renamed file in changes fallback', async () => {
      const changesData = {
        changes: [
          {
            old_path: 'old.js',
            new_path: 'new.js',
            renamed_file: true
          }
        ]
      }

      mockClient.get
        .mockRejectedValueOnce(new Error('Diff not available'))
        .mockResolvedValueOnce({ data: changesData })

      const result = await GitLabAPI.getMergeRequestDiff(1, 10)

      expect(result).toContain('rename from old.js')
      expect(result).toContain('rename to new.js')
    })

    it('should return fallback message if both diff and changes fail', async () => {
      mockClient.get
        .mockRejectedValueOnce(new Error('Diff not available'))
        .mockRejectedValueOnce(new Error('Changes not available'))

      const result = await GitLabAPI.getMergeRequestDiff(1, 10)

      expect(result).toBe('Unable to retrieve diff data')
    })
  })

  describe('getMergeRequestChanges', () => {
    it('should fetch merge request changes', async () => {
      const changes = { changes: [{ old_path: 'file.js', new_path: 'file.js' }] }
      mockClient.get.mockResolvedValue({ data: changes })

      const result = await GitLabAPI.getMergeRequestChanges(1, 10)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/merge_requests/10/changes')
      expect(result).toEqual(changes)
    })
  })

  describe('createMergeRequestNote', () => {
    it('should create a merge request note', async () => {
      const noteData = { id: 1, body: 'Test comment' }
      mockClient.post.mockResolvedValue({ data: noteData })

      const result = await GitLabAPI.createMergeRequestNote(1, 10, 'Test comment')

      expect(mockClient.post).toHaveBeenCalledWith('/projects/1/merge_requests/10/notes', {
        body: 'Test comment'
      })
      expect(result).toEqual(noteData)
    })
  })

  describe('getMergeRequestNotes', () => {
    it('should fetch merge request notes', async () => {
      const notes = [{ id: 1, body: 'Comment 1' }]
      mockClient.get.mockResolvedValue({ data: notes })

      const result = await GitLabAPI.getMergeRequestNotes(1, 10)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/merge_requests/10/notes', {
        params: { sort: 'desc', order_by: 'created_at' }
      })
      expect(result).toEqual(notes)
    })
  })

  describe('getBranches', () => {
    it('should fetch repository branches', async () => {
      const branches = [{ name: 'main' }, { name: 'develop' }]
      mockClient.get.mockResolvedValue({ data: branches })

      const result = await GitLabAPI.getBranches(1)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/repository/branches')
      expect(result).toEqual(branches)
    })
  })

  describe('createBranch', () => {
    it('should create a branch without options', async () => {
      const branchData = { name: 'feature', commit: {} }
      mockClient.post.mockResolvedValue({ data: branchData })

      const result = await GitLabAPI.createBranch(1, 'feature', 'main')

      expect(mockClient.post).toHaveBeenCalledWith(
        '/projects/1/repository/branches',
        { branch: 'feature', ref: 'main' },
        { headers: {} }
      )
      expect(result).toEqual(branchData)
    })

    it('should create a branch with propagate401 option', async () => {
      const branchData = { name: 'feature', commit: {} }
      mockClient.post.mockResolvedValue({ data: branchData })

      await GitLabAPI.createBranch(1, 'feature', 'main', { propagate401: true })

      expect(mockClient.post).toHaveBeenCalledWith(
        '/projects/1/repository/branches',
        { branch: 'feature', ref: 'main' },
        { headers: { 'X-Propagate-401': 'true' } }
      )
    })
  })

  describe('getRepositoryTree', () => {
    it('should fetch repository tree with default params', async () => {
      const tree = [{ name: 'file.js', type: 'blob' }]
      mockClient.get.mockResolvedValue({ data: tree })

      const result = await GitLabAPI.getRepositoryTree(1)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/repository/tree', {
        params: {
          ref: 'main',
          recursive: true,
          per_page: 1000
        }
      })
      expect(result).toEqual(tree)
    })

    it('should fetch repository tree with custom ref', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await GitLabAPI.getRepositoryTree(1, 'develop', false)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/repository/tree', {
        params: {
          ref: 'develop',
          recursive: false,
          per_page: 1000
        }
      })
    })
  })

  describe('getFileContent', () => {
    it('should fetch and decode file content', async () => {
      const encodedContent = btoa('file content')
      const fileData = { file_path: 'file.js', content: encodedContent }
      mockClient.get.mockResolvedValue({ data: fileData })

      const result = await GitLabAPI.getFileContent(1, 'file.js')

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/repository/files/file.js', {
        params: { ref: 'main' }
      })
      expect(result.content).toBe('file content')
    })

    it('should fetch file content with custom ref', async () => {
      const encodedContent = btoa('file content')
      mockClient.get.mockResolvedValue({ data: { content: encodedContent } })

      await GitLabAPI.getFileContent(1, 'file.js', 'develop')

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/repository/files/file.js', {
        params: { ref: 'develop' }
      })
    })

    it('should encode file path with special characters', async () => {
      const encodedContent = btoa('content')
      mockClient.get.mockResolvedValue({ data: { content: encodedContent } })

      await GitLabAPI.getFileContent(1, 'path/to/file.js')

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/repository/files/path%2Fto%2Ffile.js', {
        params: { ref: 'main' }
      })
    })
  })

  describe('getFileContentBatch', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should fetch multiple files in batches', async () => {
      const files = ['file1.js', 'file2.js', 'file3.js']
      mockClient.get.mockImplementation((url) => {
        const fileName = url.split('/').pop()
        return Promise.resolve({
          data: {
            file_path: fileName,
            content: btoa(`content of ${fileName}`)
          }
        })
      })

      const promise = GitLabAPI.getFileContentBatch(1, files)
      await vi.runAllTimersAsync()
      const results = await promise

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[0].path).toBe('file1.js')
      expect(results[0].data.content).toContain('content of')
    })

    it('should handle file fetch errors', async () => {
      const files = ['file1.js', 'file2.js']
      mockClient.get
        .mockResolvedValueOnce({ data: { content: btoa('content') } })
        .mockRejectedValueOnce({ response: { data: { message: 'File not found' } } })

      const promise = GitLabAPI.getFileContentBatch(1, files)
      await vi.runAllTimersAsync()
      const results = await promise

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('File not found')
    })

    it('should process files in batches of 5 with delay', async () => {
      const files = Array.from({ length: 12 }, (_, i) => `file${i}.js`)
      mockClient.get.mockImplementation(() =>
        Promise.resolve({ data: { content: btoa('content') } })
      )

      const promise = GitLabAPI.getFileContentBatch(1, files)
      await vi.runAllTimersAsync()
      const results = await promise

      expect(results).toHaveLength(12)
      expect(results.every(r => r.success)).toBe(true)
    })
  })

  describe('getRepositoryLanguages', () => {
    it('should fetch repository languages', async () => {
      const languages = { JavaScript: 60.5, TypeScript: 39.5 }
      mockClient.get.mockResolvedValue({ data: languages })

      const result = await GitLabAPI.getRepositoryLanguages(1)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/languages')
      expect(result).toEqual(languages)
    })
  })

  describe('getRepositorySize', () => {
    it('should fetch repository statistics', async () => {
      const stats = { repository_size: 12345, commit_count: 100 }
      mockClient.get.mockResolvedValue({ data: stats })

      const result = await GitLabAPI.getRepositorySize(1)

      expect(mockClient.get).toHaveBeenCalledWith('/projects/1/statistics')
      expect(result).toEqual(stats)
    })
  })

  describe('checkVersion', () => {
    it('should fetch GitLab version', async () => {
      const versionData = { version: '15.0.0', revision: 'abc123' }
      mockClient.get.mockResolvedValue({ data: versionData })

      const result = await GitLabAPI.checkVersion()

      expect(mockClient.get).toHaveBeenCalledWith('/version')
      expect(result).toEqual(versionData)
      expect(GitLabAPI.gitlabVersion).toBe('15.0.0')
    })

    it('should handle version endpoint not available', async () => {
      mockClient.get.mockRejectedValue(new Error('Not found'))

      const result = await GitLabAPI.checkVersion()

      expect(result).toEqual({ version: 'unknown', revision: 'unknown' })
      expect(GitLabAPI.gitlabVersion).toBe('unknown')
    })
  })

  describe('testConnection', () => {
    it('should return success when connection is valid', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1, username: 'testuser' } })

      const result = await GitLabAPI.testConnection()

      expect(result).toEqual({ success: true })
    })

    it('should return error when connection fails', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { message: 'Unauthorized' } }
      })

      const result = await GitLabAPI.testConnection()

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized'
      })
    })

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'))

      const result = await GitLabAPI.testConnection()

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      })
    })
  })
})
