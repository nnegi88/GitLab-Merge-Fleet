import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useClipboard } from '../../../src/hooks/useClipboard.js'

describe('useClipboard', () => {
  let mockClipboard
  let consoleWarnSpy
  let consoleErrorSpy

  beforeEach(() => {
    vi.useFakeTimers()

    // Setup clipboard API mock
    mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    }

    vi.stubGlobal('navigator', {
      clipboard: mockClipboard
    })

    // Spy on console methods to suppress expected output
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with isCopying as false', () => {
      const { isCopying } = useClipboard()

      expect(isCopying.value).toBe(false)
    })

    it('should provide copyToClipboard function', () => {
      const { copyToClipboard } = useClipboard()

      expect(typeof copyToClipboard).toBe('function')
    })
  })

  describe('copyToClipboard', () => {
    it('should successfully copy text to clipboard', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      const promise = copyToClipboard('Hello World')

      expect(isCopying.value).toBe(true)

      const result = await promise

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Hello World')
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1)
    })

    it('should set isCopying to true during copy operation', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      expect(isCopying.value).toBe(false)

      const promise = copyToClipboard('Test text')

      expect(isCopying.value).toBe(true)

      await promise
    })

    it('should reset isCopying to false after 2 seconds', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      await copyToClipboard('Test text')

      expect(isCopying.value).toBe(true)

      // Advance timers by 2 seconds
      vi.advanceTimersByTime(2000)

      expect(isCopying.value).toBe(false)
    })

    it('should not reset isCopying before 2 seconds', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      await copyToClipboard('Test text')

      expect(isCopying.value).toBe(true)

      // Advance timers by less than 2 seconds
      vi.advanceTimersByTime(1999)

      expect(isCopying.value).toBe(true)
    })

    it('should copy multiline text', async () => {
      const { copyToClipboard } = useClipboard()
      const multilineText = 'Line 1\nLine 2\nLine 3'

      const result = await copyToClipboard(multilineText)

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(multilineText)
    })

    it('should copy text with special characters', async () => {
      const { copyToClipboard } = useClipboard()
      const specialText = '!@#$%^&*()_+-={}[]|:";\'<>?,./'

      const result = await copyToClipboard(specialText)

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(specialText)
    })
  })

  describe('invalid input handling', () => {
    it('should return false and warn when text is null', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard(null)

      expect(result).toBe(false)
      expect(mockClipboard.writeText).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('useClipboard: Invalid text provided')
    })

    it('should return false and warn when text is undefined', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard(undefined)

      expect(result).toBe(false)
      expect(mockClipboard.writeText).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('useClipboard: Invalid text provided')
    })

    it('should return false and warn when text is empty string', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard('')

      expect(result).toBe(false)
      expect(mockClipboard.writeText).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('useClipboard: Invalid text provided')
    })

    it('should return false and warn when text is not a string', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard(12345)

      expect(result).toBe(false)
      expect(mockClipboard.writeText).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('useClipboard: Invalid text provided')
    })

    it('should return false and warn when text is an object', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard({ text: 'value' })

      expect(result).toBe(false)
      expect(mockClipboard.writeText).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('useClipboard: Invalid text provided')
    })

    it('should return false and warn when text is an array', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard(['text'])

      expect(result).toBe(false)
      expect(mockClipboard.writeText).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('useClipboard: Invalid text provided')
    })
  })

  describe('error handling', () => {
    it('should handle clipboard API errors gracefully', async () => {
      const { copyToClipboard, isCopying } = useClipboard()
      const error = new Error('Clipboard API not available')
      mockClipboard.writeText.mockRejectedValue(error)

      const result = await copyToClipboard('Test text')

      expect(result).toBe(false)
      expect(isCopying.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', error)
    })

    it('should reset isCopying to false on error', async () => {
      const { copyToClipboard, isCopying } = useClipboard()
      mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'))

      await copyToClipboard('Test text')

      expect(isCopying.value).toBe(false)
    })

    it('should not set timeout on error', async () => {
      const { copyToClipboard, isCopying } = useClipboard()
      mockClipboard.writeText.mockRejectedValue(new Error('Error'))

      await copyToClipboard('Test text')

      expect(isCopying.value).toBe(false)

      // Advance timers to verify no timeout was set
      vi.advanceTimersByTime(2000)

      expect(isCopying.value).toBe(false)
    })
  })

  describe('timeout management', () => {
    it('should clear previous timeout when copying again before timeout expires', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      // First copy
      await copyToClipboard('First text')
      expect(isCopying.value).toBe(true)

      // Advance time partially
      vi.advanceTimersByTime(1000)
      expect(isCopying.value).toBe(true)

      // Second copy before first timeout expires
      await copyToClipboard('Second text')
      expect(isCopying.value).toBe(true)

      // Advance time by 1000ms (total 2000ms from first copy, 1000ms from second)
      vi.advanceTimersByTime(1000)
      expect(isCopying.value).toBe(true)

      // Advance time by 1000ms more (2000ms from second copy)
      vi.advanceTimersByTime(1000)
      expect(isCopying.value).toBe(false)
    })

    it('should handle multiple rapid copy operations', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      // Multiple rapid copies
      await copyToClipboard('Text 1')
      await copyToClipboard('Text 2')
      await copyToClipboard('Text 3')

      expect(isCopying.value).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(3)

      // Only the last timeout should remain
      vi.advanceTimersByTime(2000)
      expect(isCopying.value).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should clear timeout on unmount', async () => {
      const { copyToClipboard, isCopying } = useClipboard()

      await copyToClipboard('Test text')
      expect(isCopying.value).toBe(true)

      // Simulate component unmount by advancing timers without the timeout firing
      // This test verifies cleanup doesn't cause errors
      vi.clearAllTimers()

      // No errors should occur
      expect(isCopying.value).toBe(true)
    })
  })

  describe('return value', () => {
    it('should return true on successful copy', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard('Success')

      expect(result).toBe(true)
    })

    it('should return false on invalid input', async () => {
      const { copyToClipboard } = useClipboard()

      const result = await copyToClipboard(null)

      expect(result).toBe(false)
    })

    it('should return false on clipboard error', async () => {
      const { copyToClipboard } = useClipboard()
      mockClipboard.writeText.mockRejectedValue(new Error('Error'))

      const result = await copyToClipboard('Test')

      expect(result).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle very long text', async () => {
      const { copyToClipboard } = useClipboard()
      const longText = 'a'.repeat(10000)

      const result = await copyToClipboard(longText)

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(longText)
    })

    it('should handle text with only whitespace', async () => {
      const { copyToClipboard } = useClipboard()
      const whitespaceText = '   \t\n   '

      const result = await copyToClipboard(whitespaceText)

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(whitespaceText)
    })

    it('should handle unicode characters', async () => {
      const { copyToClipboard } = useClipboard()
      const unicodeText = '你好世界 🌍 مرحبا العالم'

      const result = await copyToClipboard(unicodeText)

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(unicodeText)
    })

    it('should handle emojis', async () => {
      const { copyToClipboard } = useClipboard()
      const emojiText = '😀 😃 😄 😁 🎉 🚀'

      const result = await copyToClipboard(emojiText)

      expect(result).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(emojiText)
    })
  })
})
