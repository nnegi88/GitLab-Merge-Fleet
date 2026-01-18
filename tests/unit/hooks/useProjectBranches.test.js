import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useProjectBranches } from '../../../src/hooks/useProjectBranches.js'
import gitlabAPI from '../../../src/api/gitlab.js'

vi.mock('../../../src/api/gitlab.js')

describe('useProjectBranches', () => {
  let consoleErrorSpy

  beforeEach(() => {
    vi.useFakeTimers()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty reactive state', () => {
      const hook = useProjectBranches()

      expect(Object.keys(hook.projectBranches)).toHaveLength(0)
      expect(Object.keys(hook.projectsLoading)).toHaveLength(0)
      expect(Object.keys(hook.branchLoadingErrors)).toHaveLength(0)
      expect(hook.isLoadingCommonBranches.value).toBe(false)
      expect(hook.isFetchingBranches.value).toBe(false)
      expect(hook.commonBranchesError.value).toBeNull()
      expect(hook.failedProjectsCount.value).toBe(0)
      expect(hook.branchesLoadedCount.value).toBe(0)
      expect(hook.totalProjectsToLoad.value).toBe(0)
    })

    it('should accept custom default branches', () => {
      const customDefaults = ['custom1', 'custom2']
      const hook = useProjectBranches({ defaultBranches: customDefaults })

      expect(hook).toBeDefined()
    })

    it('should accept custom cache TTL', () => {
      const hook = useProjectBranches({ cacheTTL: 10000 })

      expect(hook).toBeDefined()
    })
  })

  describe('fetchBranchesForProject', () => {
    it('should fetch branches successfully', async () => {
      const mockBranches = [
        { name: 'main' },
        { name: 'develop' },
        { name: 'feature-1' }
      ]
      gitlabAPI.getBranches = vi.fn().mockResolvedValue(mockBranches)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(gitlabAPI.getBranches).toHaveBeenCalledWith(1)
      expect(hook.projectBranches[1]).toEqual(['main', 'develop', 'feature-1'])
      expect(hook.projectsLoading[1]).toBe(false)
      expect(hook.branchLoadingErrors[1]).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      gitlabAPI.getBranches = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([{ name: 'main' }]), 100)
        })
      })

      const hook = useProjectBranches()
      const promise = hook.fetchBranchesForProject(1)

      expect(hook.projectsLoading[1]).toBe(true)

      await promise

      expect(hook.projectsLoading[1]).toBe(false)
    })

    it('should use cache when data is fresh', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      gitlabAPI.getBranches.mockClear()

      await hook.fetchBranchesForProject(1)

      expect(gitlabAPI.getBranches).not.toHaveBeenCalled()
    })

    it('should bypass cache when forceRefresh is true', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      gitlabAPI.getBranches.mockClear()
      gitlabAPI.getBranches.mockResolvedValue([{ name: 'develop' }])

      await hook.fetchBranchesForProject(1, true)

      expect(gitlabAPI.getBranches).toHaveBeenCalledWith(1)
      expect(hook.projectBranches[1]).toEqual(['develop'])
    })

    it('should refresh cache when data is stale', async () => {
      const shortCacheTTL = 1000
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches({ cacheTTL: shortCacheTTL })
      await hook.fetchBranchesForProject(1)

      gitlabAPI.getBranches.mockClear()
      gitlabAPI.getBranches.mockResolvedValue([{ name: 'develop' }])

      vi.advanceTimersByTime(shortCacheTTL + 100)

      await hook.fetchBranchesForProject(1)

      expect(gitlabAPI.getBranches).toHaveBeenCalledWith(1)
      expect(hook.projectBranches[1]).toEqual(['develop'])
    })

    it('should skip fetch if already loading', async () => {
      gitlabAPI.getBranches = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([{ name: 'main' }]), 100)
        })
      })

      const hook = useProjectBranches()
      const promise1 = hook.fetchBranchesForProject(1)
      const promise2 = hook.fetchBranchesForProject(1)

      await promise1
      await promise2

      expect(gitlabAPI.getBranches).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch errors', async () => {
      const error = new Error('Network error')
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(error)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.projectBranches[1]).toEqual([])
      expect(hook.branchLoadingErrors[1]).toBe('Network error')
      expect(hook.projectsLoading[1]).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch branches for project 1:',
        error
      )
    })

    it('should handle rate limit errors with reset time', async () => {
      const resetTime = new Date('2024-01-01T12:00:00Z')
      const error = {
        response: { status: 429 },
        rateLimitInfo: { resetTime }
      }
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(error)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.branchLoadingErrors[1]).toContain('Rate limit exceeded')
      expect(hook.branchLoadingErrors[1]).toContain(resetTime.toLocaleTimeString())
      expect(hook.projectBranches[1]).toEqual([])
    })

    it('should handle rate limit errors without reset time', async () => {
      const error = {
        response: { status: 429 },
        rateLimitInfo: {}
      }
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(error)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.branchLoadingErrors[1]).toBe('Rate limit exceeded. Please try again later.')
      expect(hook.projectBranches[1]).toEqual([])
    })

    it('should handle API response errors with message', async () => {
      const error = {
        response: {
          data: { message: 'Project not found' }
        }
      }
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(error)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.branchLoadingErrors[1]).toBe('Project not found')
      expect(hook.projectBranches[1]).toEqual([])
    })

    it('should handle errors with default message', async () => {
      const error = {}
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(error)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.branchLoadingErrors[1]).toBe('Unable to load branches')
      expect(hook.projectBranches[1]).toEqual([])
    })
  })

  describe('fetchBranchesThrottled', () => {
    it('should handle empty project list', async () => {
      const hook = useProjectBranches()
      await hook.fetchBranchesThrottled([])

      expect(hook.isFetchingBranches.value).toBe(false)
      expect(hook.totalProjectsToLoad.value).toBe(0)
    })

    it('should fetch multiple projects in batches', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([{ name: 'main' }])
        .mockResolvedValueOnce([{ name: 'develop' }])
        .mockResolvedValueOnce([{ name: 'feature' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesThrottled([1, 2, 3])

      expect(gitlabAPI.getBranches).toHaveBeenCalledTimes(3)
      expect(hook.projectBranches[1]).toEqual(['main'])
      expect(hook.projectBranches[2]).toEqual(['develop'])
      expect(hook.projectBranches[3]).toEqual(['feature'])
      expect(hook.isFetchingBranches.value).toBe(false)
    })

    it('should set loading state during batch fetch', async () => {
      gitlabAPI.getBranches = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([{ name: 'main' }]), 100)
        })
      })

      const hook = useProjectBranches()
      const promise = hook.fetchBranchesThrottled([1, 2])

      expect(hook.isFetchingBranches.value).toBe(true)
      expect(hook.totalProjectsToLoad.value).toBe(2)

      await promise

      expect(hook.isFetchingBranches.value).toBe(false)
    })

    it('should update branchesLoadedCount progressively', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesThrottled([1, 2, 3])

      expect(hook.branchesLoadedCount.value).toBe(3)
    })

    it('should process projects in batches of 5', async () => {
      const projectIds = [1, 2, 3, 4, 5, 6, 7, 8]
      const fetchOrder = []

      gitlabAPI.getBranches = vi.fn().mockImplementation((projectId) => {
        fetchOrder.push(projectId)
        return Promise.resolve([{ name: 'main' }])
      })

      const hook = useProjectBranches()
      await hook.fetchBranchesThrottled(projectIds)

      expect(fetchOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(gitlabAPI.getBranches).toHaveBeenCalledTimes(8)
    })

    it('should add delay between batches', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      const promise = hook.fetchBranchesThrottled([1, 2, 3, 4, 5, 6])

      await vi.runAllTimersAsync()
      await promise

      expect(gitlabAPI.getBranches).toHaveBeenCalledTimes(6)
    })

    it('should respect forceRefresh parameter', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesThrottled([1, 2])

      gitlabAPI.getBranches.mockClear()
      gitlabAPI.getBranches.mockResolvedValue([{ name: 'develop' }])

      await hook.fetchBranchesThrottled([1, 2], true)

      expect(gitlabAPI.getBranches).toHaveBeenCalledTimes(2)
      expect(hook.projectBranches[1]).toEqual(['develop'])
      expect(hook.projectBranches[2]).toEqual(['develop'])
    })
  })

  describe('fetchCommonBranches', () => {
    const mockGetProjectName = (id) => `Project ${id}`

    it('should return empty array for no projects', async () => {
      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([], mockGetProjectName)

      expect(result).toEqual([])
      expect(hook.isLoadingCommonBranches.value).toBe(false)
    })

    it('should find common branches across projects', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([
          { name: 'main' },
          { name: 'develop' },
          { name: 'feature-1' }
        ])
        .mockResolvedValueOnce([
          { name: 'main' },
          { name: 'develop' },
          { name: 'feature-2' }
        ])

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2], mockGetProjectName)

      expect(result).toContain('main')
      expect(result).toContain('develop')
      expect(result).toContain('master')
      expect(hook.commonBranchesError.value).toBeNull()
      expect(hook.failedProjectsCount.value).toBe(0)
    })

    it('should prioritize actual common branches over defaults', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([
          { name: 'production' },
          { name: 'staging' }
        ])
        .mockResolvedValueOnce([
          { name: 'production' },
          { name: 'staging' }
        ])

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2], mockGetProjectName)

      expect(result[0]).toBe('production')
      expect(result[1]).toBe('staging')
      expect(result).toContain('main')
      expect(result).toContain('master')
    })

    it('should include default branches when no common branches found', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([{ name: 'feature-1' }])
        .mockResolvedValueOnce([{ name: 'feature-2' }])

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2], mockGetProjectName)

      expect(result).toContain('main')
      expect(result).toContain('master')
      expect(result).toContain('develop')
      expect(result).toContain('development')
    })

    it('should set loading state during fetch', async () => {
      gitlabAPI.getBranches = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([{ name: 'main' }]), 100)
        })
      })

      const hook = useProjectBranches()
      const promise = hook.fetchCommonBranches([1, 2], mockGetProjectName)

      expect(hook.isLoadingCommonBranches.value).toBe(true)

      await promise

      expect(hook.isLoadingCommonBranches.value).toBe(false)
    })

    it('should handle partial failures with few projects', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([{ name: 'main' }])
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce([{ name: 'main' }])

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2, 3], mockGetProjectName)

      expect(hook.failedProjectsCount.value).toBe(1)
      expect(hook.commonBranchesError.value).toContain('Unable to load branches from: Project 2')
      expect(result).toContain('main')
    })

    it('should handle partial failures with many projects', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([{ name: 'main' }])
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce([{ name: 'main' }])

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2, 3, 4, 5], mockGetProjectName)

      expect(hook.failedProjectsCount.value).toBe(3)
      expect(hook.commonBranchesError.value).toContain('Unable to load branches from 3 of 5 repositories')
      expect(result).toContain('main')
    })

    it('should handle all projects failing with few projects', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2], mockGetProjectName)

      expect(hook.failedProjectsCount.value).toBe(2)
      expect(hook.commonBranchesError.value).toContain('Unable to load branches from: Project 1, Project 2')
      expect(result).toEqual(['main', 'master', 'develop', 'development'])
    })

    it('should handle all projects failing with many projects', async () => {
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(new Error('Failed'))

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2, 3, 4, 5], mockGetProjectName)

      expect(hook.failedProjectsCount.value).toBe(5)
      expect(hook.commonBranchesError.value).toContain('Unable to load branches from all 5 repositories')
      expect(result).toEqual(['main', 'master', 'develop', 'development'])
    })

    it('should handle empty repositories', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1, 2], mockGetProjectName)

      expect(result).toEqual(['main', 'master', 'develop', 'development'])
      expect(hook.commonBranchesError.value).toBeNull()
    })

    it('should handle unexpected errors', async () => {
      gitlabAPI.getBranches = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const hook = useProjectBranches()
      const result = await hook.fetchCommonBranches([1], mockGetProjectName)

      expect(hook.commonBranchesError.value).toBe('Unable to calculate common branches. Using default branches.')
      expect(result).toEqual(['main', 'master', 'develop'])
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch common branches:', expect.any(Error))
    })

    it('should use custom default branches', async () => {
      gitlabAPI.getBranches = vi.fn().mockRejectedValue(new Error('Failed'))

      const customDefaults = ['custom1', 'custom2']
      const hook = useProjectBranches({ defaultBranches: customDefaults })
      const result = await hook.fetchCommonBranches([1], mockGetProjectName)

      expect(result).toEqual(customDefaults)
    })
  })

  describe('computed getters', () => {
    describe('getProjectBranches', () => {
      it('should return branches for a project', async () => {
        gitlabAPI.getBranches = vi.fn().mockResolvedValue([
          { name: 'main' },
          { name: 'develop' }
        ])

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        const branches = hook.getProjectBranches.value(1)
        expect(branches).toEqual(['main', 'develop'])
      })

      it('should return empty array for non-existent project', () => {
        const hook = useProjectBranches()
        const branches = hook.getProjectBranches.value(999)

        expect(branches).toEqual([])
      })
    })

    describe('isProjectBranchesLoading', () => {
      it('should return true when project is loading', async () => {
        gitlabAPI.getBranches = vi.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve([{ name: 'main' }]), 100)
          })
        })

        const hook = useProjectBranches()
        const promise = hook.fetchBranchesForProject(1)

        expect(hook.isProjectBranchesLoading.value(1)).toBe(true)

        await promise

        expect(hook.isProjectBranchesLoading.value(1)).toBe(false)
      })

      it('should return false for non-loading project', () => {
        const hook = useProjectBranches()

        expect(hook.isProjectBranchesLoading.value(1)).toBe(false)
      })
    })

    describe('isBranchValidForProject', () => {
      it('should return true for valid branch name', async () => {
        gitlabAPI.getBranches = vi.fn().mockResolvedValue([
          { name: 'main' },
          { name: 'develop' }
        ])

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        expect(hook.isBranchValidForProject.value(1, 'main')).toBe(true)
        expect(hook.isBranchValidForProject.value(1, 'develop')).toBe(true)
      })

      it('should return false for invalid branch name', async () => {
        gitlabAPI.getBranches = vi.fn().mockResolvedValue([
          { name: 'main' }
        ])

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        expect(hook.isBranchValidForProject.value(1, 'nonexistent')).toBe(false)
      })

      it('should return false for empty or null branch name', async () => {
        gitlabAPI.getBranches = vi.fn().mockResolvedValue([
          { name: 'main' }
        ])

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        expect(hook.isBranchValidForProject.value(1, '')).toBe(false)
        expect(hook.isBranchValidForProject.value(1, null)).toBe(false)
        expect(hook.isBranchValidForProject.value(1, undefined)).toBe(false)
      })

      it('should trim branch name before validation', async () => {
        gitlabAPI.getBranches = vi.fn().mockResolvedValue([
          { name: 'main' }
        ])

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        expect(hook.isBranchValidForProject.value(1, '  main  ')).toBe(true)
      })

      it('should return true when project has error', async () => {
        gitlabAPI.getBranches = vi.fn().mockRejectedValue(new Error('Failed'))

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        expect(hook.isBranchValidForProject.value(1, 'custom-branch')).toBe(true)
      })

      it('should return true when project has no branches loaded', () => {
        const hook = useProjectBranches()

        expect(hook.isBranchValidForProject.value(1, 'custom-branch')).toBe(true)
      })
    })

    describe('getCacheAge', () => {
      it('should return cache age in milliseconds', async () => {
        gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

        const hook = useProjectBranches()
        await hook.fetchBranchesForProject(1)

        vi.advanceTimersByTime(5000)

        const age = hook.getCacheAge.value(1)
        expect(age).toBeGreaterThanOrEqual(5000)
      })

      it('should return null for non-cached project', () => {
        const hook = useProjectBranches()

        expect(hook.getCacheAge.value(1)).toBeNull()
      })
    })
  })

  describe('getFailedProjectsInCustomMode', () => {
    it('should return projects with loading errors', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockResolvedValueOnce([{ name: 'main' }])
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce([{ name: 'develop' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)
      await hook.fetchBranchesForProject(2)
      await hook.fetchBranchesForProject(3)

      const failed = hook.getFailedProjectsInCustomMode([1, 2, 3])

      expect(failed).toEqual([2])
    })

    it('should return empty array when no projects failed', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)
      await hook.fetchBranchesForProject(2)

      const failed = hook.getFailedProjectsInCustomMode([1, 2])

      expect(failed).toEqual([])
    })
  })

  describe('refreshBranchesForProject', () => {
    it('should force refresh branches', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      gitlabAPI.getBranches.mockClear()
      gitlabAPI.getBranches.mockResolvedValue([{ name: 'develop' }])

      await hook.refreshBranchesForProject(1)

      expect(gitlabAPI.getBranches).toHaveBeenCalledWith(1)
      expect(hook.projectBranches[1]).toEqual(['develop'])
    })
  })

  describe('clearBranchCache', () => {
    it('should clear all cache data for a project', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      hook.clearBranchCache(1)

      expect(hook.projectBranches[1]).toBeUndefined()
      expect(hook.getCacheAge.value(1)).toBeNull()
      expect(hook.branchLoadingErrors[1]).toBeUndefined()
    })

    it('should allow fetching after cache clear', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      hook.clearBranchCache(1)

      gitlabAPI.getBranches.mockClear()
      gitlabAPI.getBranches.mockResolvedValue([{ name: 'develop' }])

      await hook.fetchBranchesForProject(1)

      expect(gitlabAPI.getBranches).toHaveBeenCalledWith(1)
      expect(hook.projectBranches[1]).toEqual(['develop'])
    })
  })

  describe('isCacheStale', () => {
    it('should return true for uncached project', () => {
      const hook = useProjectBranches()

      expect(hook.isCacheStale(1)).toBe(true)
    })

    it('should return false for fresh cache', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.isCacheStale(1)).toBe(false)
    })

    it('should return true when cache exceeds TTL', async () => {
      const shortCacheTTL = 1000
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([{ name: 'main' }])

      const hook = useProjectBranches({ cacheTTL: shortCacheTTL })
      await hook.fetchBranchesForProject(1)

      vi.advanceTimersByTime(shortCacheTTL + 100)

      expect(hook.isCacheStale(1)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle concurrent fetches for different projects', async () => {
      gitlabAPI.getBranches = vi.fn()
        .mockImplementation((projectId) => {
          return Promise.resolve([{ name: `branch-${projectId}` }])
        })

      const hook = useProjectBranches()
      await Promise.all([
        hook.fetchBranchesForProject(1),
        hook.fetchBranchesForProject(2),
        hook.fetchBranchesForProject(3)
      ])

      expect(hook.projectBranches[1]).toEqual(['branch-1'])
      expect(hook.projectBranches[2]).toEqual(['branch-2'])
      expect(hook.projectBranches[3]).toEqual(['branch-3'])
    })

    it('should handle branches with special characters', async () => {
      gitlabAPI.getBranches = vi.fn().mockResolvedValue([
        { name: 'feature/special-chars-123' },
        { name: 'release-v1.0.0' },
        { name: 'hotfix/bug#456' }
      ])

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.projectBranches[1]).toEqual([
        'feature/special-chars-123',
        'release-v1.0.0',
        'hotfix/bug#456'
      ])
    })

    it('should handle large number of branches', async () => {
      const largeBranchList = Array.from({ length: 1000 }, (_, i) => ({
        name: `branch-${i}`
      }))
      gitlabAPI.getBranches = vi.fn().mockResolvedValue(largeBranchList)

      const hook = useProjectBranches()
      await hook.fetchBranchesForProject(1)

      expect(hook.projectBranches[1]).toHaveLength(1000)
    })
  })
})
