import { ref, computed } from 'vue'
import gitlabAPI from '../api/gitlab'

export function useRateLimit() {
  const rateLimitInfo = ref(gitlabAPI.getRateLimitInfo())
  
  // Update rate limit info periodically
  const updateRateLimitInfo = () => {
    rateLimitInfo.value = gitlabAPI.getRateLimitInfo()
  }
  
  // Check if approaching rate limit
  const isApproachingLimit = computed(() => {
    return gitlabAPI.isApproachingRateLimit(0.2) // Warn when 20% remaining
  })
  
  // Get percentage of rate limit remaining
  const rateLimitPercentage = computed(() => {
    const info = rateLimitInfo.value
    if (!info.limit || !info.remaining) return 100
    return Math.round((info.remaining / info.limit) * 100)
  })
  
  // Get human-readable time until reset
  const timeUntilReset = computed(() => {
    const info = rateLimitInfo.value
    if (!info.reset) return null
    
    const now = new Date()
    const resetTime = new Date(info.reset)
    const diff = resetTime.getTime() - now.getTime()
    
    if (diff <= 0) return 'Now'
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else {
      return `${minutes}m`
    }
  })
  
  // Format rate limit status message
  const rateLimitStatus = computed(() => {
    const info = rateLimitInfo.value
    if (!info.limit) return 'Rate limit info not available'
    
    return `${info.remaining}/${info.limit} requests remaining`
  })
  
  return {
    rateLimitInfo,
    isApproachingLimit,
    rateLimitPercentage,
    timeUntilReset,
    rateLimitStatus,
    updateRateLimitInfo
  }
}