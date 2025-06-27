import { ref, onUnmounted } from 'vue'

/**
 * Vue composable for clipboard operations with automatic state management
 * 
 * @returns {Object} Clipboard utilities
 * @returns {Ref<boolean>} isCopying - Reactive boolean indicating if copy operation is in progress
 * @returns {Function} copyToClipboard - Function to copy text to clipboard
 * 
 * @example
 * ```js
 * const { isCopying, copyToClipboard } = useClipboard()
 * 
 * // In template: :disabled="isCopying"
 * // In handler: await copyToClipboard('Hello World')
 * ```
 */
export function useClipboard() {
  const isCopying = ref(false)
  let timeoutId = null

  /**
   * Copy text to clipboard using modern Clipboard API
   * 
   * @param {string} text - The text content to copy to clipboard
   * @returns {Promise<boolean>} Promise that resolves to true if successful, false otherwise
   * 
   * @example
   * ```js
   * const success = await copyToClipboard('Text to copy')
   * if (success) {
   *   console.log('Successfully copied to clipboard')
   * }
   * ```
   */
  async function copyToClipboard(text) {
    if (!text || typeof text !== 'string') {
      console.warn('useClipboard: Invalid text provided')
      return false
    }

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    isCopying.value = true

    try {
      await navigator.clipboard.writeText(text)
      
      // Reset the copying state after 2 seconds
      timeoutId = setTimeout(() => {
        isCopying.value = false
        timeoutId = null
      }, 2000)
      
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      isCopying.value = false
      return false
    }
  }

  // Cleanup timeout on component unmount
  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  return {
    isCopying,
    copyToClipboard
  }
}