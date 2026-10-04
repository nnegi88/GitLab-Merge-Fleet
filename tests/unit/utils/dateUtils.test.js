import { formatDistanceToNow, formatDate } from '../../../src/utils/dateUtils.js'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('dateUtils', () => {
  describe('formatDistanceToNow', () => {
    let originalNow
    const mockNow = new Date('2024-01-15T12:00:00Z')

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(mockNow)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "just now" for dates less than 60 seconds ago', () => {
      const date = new Date('2024-01-15T11:59:30Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('just now')
    })

    it('should return "just now" for dates 0 seconds ago', () => {
      const date = mockNow.toISOString()
      expect(formatDistanceToNow(date)).toBe('just now')
    })

    it('should return "1 minute ago" for dates 60-119 seconds ago', () => {
      const date = new Date('2024-01-15T11:59:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('1 minute ago')
    })

    it('should return "X minutes ago" for dates in minutes range', () => {
      const date = new Date('2024-01-15T11:55:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('5 minutes ago')
    })

    it('should return "30 minutes ago" for dates 30 minutes ago', () => {
      const date = new Date('2024-01-15T11:30:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('30 minutes ago')
    })

    it('should return "1 hour ago" for dates 60-119 minutes ago', () => {
      const date = new Date('2024-01-15T11:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('1 hour ago')
    })

    it('should return "X hours ago" for dates in hours range', () => {
      const date = new Date('2024-01-15T08:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('4 hours ago')
    })

    it('should return "12 hours ago" for dates 12 hours ago', () => {
      const date = new Date('2024-01-15T00:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('12 hours ago')
    })

    it('should return "1 day ago" for dates 24-47 hours ago', () => {
      const date = new Date('2024-01-14T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('1 day ago')
    })

    it('should return "X days ago" for dates in days range', () => {
      const date = new Date('2024-01-10T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('5 days ago')
    })

    it('should return "15 days ago" for dates 15 days ago', () => {
      const date = new Date('2023-12-31T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('15 days ago')
    })

    it('should return "1 month ago" for dates 30-59 days ago', () => {
      const date = new Date('2023-12-16T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('1 month ago')
    })

    it('should return "X months ago" for dates in months range', () => {
      const date = new Date('2023-10-15T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('3 months ago')
    })

    it('should return "6 months ago" for dates 6 months ago', () => {
      const date = new Date('2023-07-15T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('6 months ago')
    })

    it('should return "1 year ago" for dates 12-23 months ago', () => {
      const date = new Date('2023-01-15T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('1 year ago')
    })

    it('should return "X years ago" for dates in years range', () => {
      const date = new Date('2021-01-15T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('3 years ago')
    })

    it('should return "5 years ago" for dates 5 years ago', () => {
      const date = new Date('2019-01-15T12:00:00Z').toISOString()
      expect(formatDistanceToNow(date)).toBe('5 years ago')
    })

    it('should handle edge case at 59 seconds', () => {
      const date = new Date(mockNow.getTime() - 59000).toISOString()
      expect(formatDistanceToNow(date)).toBe('just now')
    })

    it('should handle edge case at 60 seconds', () => {
      const date = new Date(mockNow.getTime() - 60000).toISOString()
      expect(formatDistanceToNow(date)).toBe('1 minute ago')
    })
  })

  describe('formatDate', () => {
    it('should format a date string in en-US locale', () => {
      const date = '2024-01-15T12:30:00Z'
      const result = formatDate(date)
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it('should format a date with time components', () => {
      const date = '2024-03-20T14:45:00Z'
      const result = formatDate(date)
      expect(result).toMatch(/Mar 20, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should format a date at year boundary', () => {
      const date = '2023-12-31T23:59:00Z'
      const result = formatDate(date)
      expect(result).toMatch(/Dec 31, 2023/)
    })

    it('should format a date at beginning of year', () => {
      const date = '2024-01-01T00:00:00Z'
      const result = formatDate(date)
      expect(result).toMatch(/Jan 1, 2024/)
    })

    it('should format dates with different months', () => {
      const date = '2024-06-15T09:00:00Z'
      const result = formatDate(date)
      expect(result).toMatch(/Jun 15, 2024/)
    })

    it('should format dates in the past', () => {
      const date = '2020-05-10T16:20:00Z'
      const result = formatDate(date)
      expect(result).toMatch(/May 10, 2020/)
    })

    it('should include hour and minute in formatted output', () => {
      const date = '2024-01-15T12:30:00Z'
      const result = formatDate(date)
      expect(result).toContain(':')
    })
  })
})
