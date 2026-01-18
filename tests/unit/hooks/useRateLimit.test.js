import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRateLimit } from '../../../src/hooks/useRateLimit.js'
import gitlabAPI from '../../../src/api/gitlab.js'

vi.mock('../../../src/api/gitlab.js')

describe('useRateLimit', () => {
  let mockRateLimitInfo

  beforeEach(() => {
    vi.useFakeTimers()

    mockRateLimitInfo = {
      limit: 100,
      remaining: 80,
      reset: new Date('2024-01-01T12:00:00Z').toISOString(),
      observed: new Date('2024-01-01T11:00:00Z').toISOString()
    }

    gitlabAPI.getRateLimitInfo = vi.fn(() => mockRateLimitInfo)
    gitlabAPI.isApproachingRateLimit = vi.fn(() => false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with rate limit info from API', () => {
      const { rateLimitInfo } = useRateLimit()

      expect(rateLimitInfo.value).toEqual(mockRateLimitInfo)
      expect(gitlabAPI.getRateLimitInfo).toHaveBeenCalledTimes(1)
    })

    it('should provide all expected properties', () => {
      const hook = useRateLimit()

      expect(hook.rateLimitInfo).toBeDefined()
      expect(hook.isApproachingLimit).toBeDefined()
      expect(hook.rateLimitPercentage).toBeDefined()
      expect(hook.timeUntilReset).toBeDefined()
      expect(hook.rateLimitStatus).toBeDefined()
      expect(typeof hook.updateRateLimitInfo).toBe('function')
    })
  })

  describe('updateRateLimitInfo', () => {
    it('should update rate limit info when called', () => {
      const { rateLimitInfo, updateRateLimitInfo } = useRateLimit()

      const newRateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: new Date('2024-01-01T13:00:00Z').toISOString(),
        observed: new Date('2024-01-01T12:00:00Z').toISOString()
      }

      gitlabAPI.getRateLimitInfo.mockReturnValue(newRateLimitInfo)

      updateRateLimitInfo()

      expect(rateLimitInfo.value).toEqual(newRateLimitInfo)
      expect(gitlabAPI.getRateLimitInfo).toHaveBeenCalledTimes(2)
    })

    it('should allow multiple updates', () => {
      const { rateLimitInfo, updateRateLimitInfo } = useRateLimit()

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 60,
        reset: null,
        observed: null
      })
      updateRateLimitInfo()

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 40,
        reset: null,
        observed: null
      })
      updateRateLimitInfo()

      expect(rateLimitInfo.value.remaining).toBe(40)
      expect(gitlabAPI.getRateLimitInfo).toHaveBeenCalledTimes(3)
    })
  })

  describe('isApproachingLimit', () => {
    it('should call gitlabAPI with 0.2 threshold', () => {
      const { isApproachingLimit } = useRateLimit()

      isApproachingLimit.value

      expect(gitlabAPI.isApproachingRateLimit).toHaveBeenCalledWith(0.2)
    })

    it('should return false when not approaching limit', () => {
      gitlabAPI.isApproachingRateLimit.mockReturnValue(false)

      const { isApproachingLimit } = useRateLimit()

      expect(isApproachingLimit.value).toBe(false)
    })

    it('should return true when approaching limit', () => {
      gitlabAPI.isApproachingRateLimit.mockReturnValue(true)

      const { isApproachingLimit } = useRateLimit()

      expect(isApproachingLimit.value).toBe(true)
    })

    it('should react to rate limit info changes', () => {
      gitlabAPI.isApproachingRateLimit.mockReturnValue(false)

      const { isApproachingLimit, updateRateLimitInfo } = useRateLimit()

      expect(isApproachingLimit.value).toBe(false)

      gitlabAPI.isApproachingRateLimit.mockReturnValue(true)
      updateRateLimitInfo()

      expect(isApproachingLimit.value).toBe(true)
    })
  })

  describe('rateLimitPercentage', () => {
    it('should calculate percentage correctly', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 80,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(80)
    })

    it('should round to nearest integer', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 33,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(33)
    })

    it('should return 100 when limit is not set', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: null,
        remaining: 50,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(100)
    })

    it('should return 100 when remaining is not set', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: null,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(100)
    })

    it('should return 0 when no requests remaining', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 0,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(0)
    })

    it('should update when rate limit info changes', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 80,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage, updateRateLimitInfo } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(80)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 20,
        reset: null,
        observed: null
      })

      updateRateLimitInfo()

      expect(rateLimitPercentage.value).toBe(20)
    })
  })

  describe('timeUntilReset', () => {
    it('should return null when reset time is not set', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: null,
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBeNull()
    })

    it('should return "Now" when reset time is in the past', () => {
      const pastTime = new Date()
      pastTime.setMinutes(pastTime.getMinutes() - 5)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: pastTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('Now')
    })

    it('should return minutes when less than an hour', () => {
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + 30)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('30m')
    })

    it('should return hours and minutes when more than an hour', () => {
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 2)
      futureTime.setMinutes(futureTime.getMinutes() + 15)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('2h 15m')
    })

    it('should round down minutes', () => {
      const futureTime = new Date()
      futureTime.setSeconds(futureTime.getSeconds() + 90)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('1m')
    })

    it('should handle exactly one hour', () => {
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 1)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('1h 0m')
    })

    it('should update when rate limit info changes', () => {
      const futureTime1 = new Date()
      futureTime1.setMinutes(futureTime1.getMinutes() + 30)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime1.toISOString(),
        observed: null
      })

      const { timeUntilReset, updateRateLimitInfo } = useRateLimit()

      expect(timeUntilReset.value).toBe('30m')

      const futureTime2 = new Date()
      futureTime2.setMinutes(futureTime2.getMinutes() + 15)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime2.toISOString(),
        observed: null
      })

      updateRateLimitInfo()

      expect(timeUntilReset.value).toBe('15m')
    })
  })

  describe('rateLimitStatus', () => {
    it('should return formatted status message', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 80,
        reset: null,
        observed: null
      })

      const { rateLimitStatus } = useRateLimit()

      expect(rateLimitStatus.value).toBe('80/100 requests remaining')
    })

    it('should return info not available when limit is not set', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: null,
        remaining: 50,
        reset: null,
        observed: null
      })

      const { rateLimitStatus } = useRateLimit()

      expect(rateLimitStatus.value).toBe('Rate limit info not available')
    })

    it('should handle zero remaining requests', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 0,
        reset: null,
        observed: null
      })

      const { rateLimitStatus } = useRateLimit()

      expect(rateLimitStatus.value).toBe('0/100 requests remaining')
    })

    it('should handle full remaining requests', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 100,
        reset: null,
        observed: null
      })

      const { rateLimitStatus } = useRateLimit()

      expect(rateLimitStatus.value).toBe('100/100 requests remaining')
    })

    it('should update when rate limit info changes', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 80,
        reset: null,
        observed: null
      })

      const { rateLimitStatus, updateRateLimitInfo } = useRateLimit()

      expect(rateLimitStatus.value).toBe('80/100 requests remaining')

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 20,
        reset: null,
        observed: null
      })

      updateRateLimitInfo()

      expect(rateLimitStatus.value).toBe('20/100 requests remaining')
    })
  })

  describe('edge cases', () => {
    it('should handle very large rate limit values', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 1000000,
        remaining: 999999,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage, rateLimitStatus } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(100)
      expect(rateLimitStatus.value).toBe('999999/1000000 requests remaining')
    })

    it('should handle very small remaining time', () => {
      const futureTime = new Date()
      futureTime.setSeconds(futureTime.getSeconds() + 10)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('0m')
    })

    it('should handle very long remaining time', () => {
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 24)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: futureTime.toISOString(),
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('24h 0m')
    })

    it('should handle invalid reset time format', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: 'invalid-date',
        observed: null
      })

      const { timeUntilReset } = useRateLimit()

      expect(timeUntilReset.value).toBe('Now')
    })

    it('should handle fractional percentages', () => {
      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 3,
        remaining: 1,
        reset: null,
        observed: null
      })

      const { rateLimitPercentage } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(33)
    })
  })

  describe('reactivity', () => {
    it('should maintain reactivity across multiple updates', () => {
      const { rateLimitInfo, rateLimitPercentage, updateRateLimitInfo } = useRateLimit()

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 100,
        reset: null,
        observed: null
      })
      updateRateLimitInfo()
      expect(rateLimitPercentage.value).toBe(100)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 75,
        reset: null,
        observed: null
      })
      updateRateLimitInfo()
      expect(rateLimitPercentage.value).toBe(75)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 50,
        reset: null,
        observed: null
      })
      updateRateLimitInfo()
      expect(rateLimitPercentage.value).toBe(50)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 25,
        reset: null,
        observed: null
      })
      updateRateLimitInfo()
      expect(rateLimitPercentage.value).toBe(25)

      expect(gitlabAPI.getRateLimitInfo).toHaveBeenCalledTimes(5)
    })

    it('should update all computed properties when rate limit info changes', () => {
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + 30)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 80,
        reset: futureTime.toISOString(),
        observed: null
      })
      gitlabAPI.isApproachingRateLimit.mockReturnValue(false)

      const {
        rateLimitPercentage,
        timeUntilReset,
        rateLimitStatus,
        isApproachingLimit,
        updateRateLimitInfo
      } = useRateLimit()

      expect(rateLimitPercentage.value).toBe(80)
      expect(timeUntilReset.value).toBe('30m')
      expect(rateLimitStatus.value).toBe('80/100 requests remaining')
      expect(isApproachingLimit.value).toBe(false)

      const newFutureTime = new Date()
      newFutureTime.setMinutes(newFutureTime.getMinutes() + 15)

      gitlabAPI.getRateLimitInfo.mockReturnValue({
        limit: 100,
        remaining: 15,
        reset: newFutureTime.toISOString(),
        observed: null
      })
      gitlabAPI.isApproachingRateLimit.mockReturnValue(true)

      updateRateLimitInfo()

      expect(rateLimitPercentage.value).toBe(15)
      expect(timeUntilReset.value).toBe('15m')
      expect(rateLimitStatus.value).toBe('15/100 requests remaining')
      expect(isApproachingLimit.value).toBe(true)
    })
  })
})
