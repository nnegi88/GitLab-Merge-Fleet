import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

class GitLabAPI {
  constructor() {
    this.client = null
    this.gitlabVersion = null
    this.rateLimitInfo = {
      limit: null,
      remaining: null,
      reset: null,
      observed: null
    }
  }

  getClient() {
    const authStore = useAuthStore()
    const { token, gitlabUrl } = authStore
    
    if (!this.client || this.client.defaults.baseURL !== `${gitlabUrl}/api/v4`) {
      this.client = axios.create({
        baseURL: `${gitlabUrl}/api/v4`,
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json'
        }
      })

      // Add response interceptor for error handling and rate limit tracking
      this.client.interceptors.response.use(
        response => {
          // Track rate limit headers
          this.updateRateLimitInfo(response.headers)
          return response
        },
        error => {
          // Track rate limit headers even on errors
          if (error.response) {
            this.updateRateLimitInfo(error.response.headers)
            
            // Handle rate limit errors specifically
            if (error.response.status === 429) {
              const resetTime = error.response.headers['ratelimit-reset'] || error.response.headers['x-ratelimit-reset']
              const retryAfter = error.response.headers['retry-after']
              
              error.rateLimitInfo = {
                resetTime: resetTime ? new Date(parseInt(resetTime) * 1000) : null,
                retryAfter: retryAfter ? parseInt(retryAfter) : null,
                message: 'GitLab API rate limit exceeded'
              }
            }
          }
          
          if (error.response?.status === 401 && !error.config?.headers?.['X-Propagate-401']) {
            authStore.clearToken()
            window.location.reload()
          }
          return Promise.reject(error)
        }
      )
    }

    return this.client
  }

  updateRateLimitInfo(headers) {
    // GitLab uses different header names in different versions
    const limit = headers['ratelimit-limit'] || headers['x-ratelimit-limit']
    const remaining = headers['ratelimit-remaining'] || headers['x-ratelimit-remaining']
    const reset = headers['ratelimit-reset'] || headers['x-ratelimit-reset']
    
    if (limit) this.rateLimitInfo.limit = parseInt(limit)
    if (remaining) this.rateLimitInfo.remaining = parseInt(remaining)
    if (reset) this.rateLimitInfo.reset = new Date(parseInt(reset) * 1000)
    this.rateLimitInfo.observed = new Date()
  }

  getRateLimitInfo() {
    return { ...this.rateLimitInfo }
  }

  isApproachingRateLimit(threshold = 0.1) {
    if (!this.rateLimitInfo.limit || !this.rateLimitInfo.remaining) {
      return false
    }
    const percentageRemaining = this.rateLimitInfo.remaining / this.rateLimitInfo.limit
    return percentageRemaining <= threshold
  }

  async waitForRateLimit() {
    if (this.rateLimitInfo.reset && this.rateLimitInfo.remaining === 0) {
      const waitTime = this.rateLimitInfo.reset.getTime() - Date.now()
      if (waitTime > 0) {
        console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.getClient().get('/user')
    return response.data
  }

  // Project endpoints
  async getProjects(params = {}) {
    const defaultParams = {
      membership: true,
      order_by: 'last_activity_at',
      sort: 'desc',
      per_page: 100,
      ...params
    }
    const response = await this.getClient().get('/projects', { params: defaultParams })
    return response.data
  }

  async getProject(projectId) {
    const response = await this.getClient().get(`/projects/${encodeURIComponent(projectId)}`)
    return response.data
  }

  // Merge Request endpoints
  async getMergeRequests(params = {}) {
    // Build query parameters
    const queryParams = {
      scope: params.scope || 'all',
      state: params.state || 'opened',
      order_by: params.orderBy || 'updated_at',
      sort: 'desc',
      per_page: 100
    }
    
    // Add optional filters
    if (params.search) queryParams.search = params.search
    if (params.labels && params.labels.length > 0) {
      queryParams.labels = params.labels.join(',')
    }
    if (params.author) queryParams.author_username = params.author
    if (params.assignee) queryParams.assignee_username = params.assignee
    if (params.milestone) queryParams.milestone = params.milestone
    
    // Handle WIP/Draft filter
    if (params.wip === 'yes') {
      queryParams.wip = 'yes'
    } else if (params.wip === 'no') {
      queryParams.wip = 'no'
    }
    
    const response = await this.getClient().get('/merge_requests', { params: queryParams })
    return response.data
  }

  async getProjectMergeRequests(projectId, params = {}) {
    const defaultParams = {
      state: 'opened',
      order_by: 'updated_at',
      sort: 'desc',
      per_page: 100,
      ...params
    }
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests`,
      { params: defaultParams }
    )
    return response.data
  }

  async getMergeRequest(projectId, mrIid) {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
    )
    return response.data
  }

  async createMergeRequest(projectId, data) {
    const response = await this.getClient().post(
      `/projects/${encodeURIComponent(projectId)}/merge_requests`,
      data
    )
    return response.data
  }

  async getMergeRequestDiff(projectId, mrIid) {
    try {
      // Try to get the diff in text format first
      const response = await this.getClient().get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}.diff`,
        { 
          headers: { 
            'Accept': 'text/plain' 
          } 
        }
      )
      return response.data
    } catch (error) {
      console.warn('Failed to get plain diff, trying changes format:', error.message)
      
      // Fallback to changes format
      try {
        const changesResponse = await this.getMergeRequestChanges(projectId, mrIid)
        
        // Convert changes to diff format
        if (changesResponse.changes && changesResponse.changes.length > 0) {
          const diffText = changesResponse.changes.map(change => {
            let diffSection = `diff --git a/${change.old_path || change.new_path} b/${change.new_path || change.old_path}\n`
            
            if (change.new_file) {
              diffSection += `new file mode 100644\n`
              diffSection += `index 0000000..${change.new_path}\n`
            } else if (change.deleted_file) {
              diffSection += `deleted file mode 100644\n`
              diffSection += `index ${change.old_path}..0000000\n`
            } else if (change.renamed_file) {
              diffSection += `similarity index 100%\n`
              diffSection += `rename from ${change.old_path}\n`
              diffSection += `rename to ${change.new_path}\n`
            }
            
            diffSection += `--- a/${change.old_path || change.new_path}\n`
            diffSection += `+++ b/${change.new_path || change.old_path}\n`
            
            if (change.diff) {
              diffSection += change.diff
            }
            
            return diffSection
          }).join('\n\n')
          
          return diffText
        }
      } catch (fallbackError) {
        console.error('Failed to get changes as fallback:', fallbackError.message)
      }
      
      return 'Unable to retrieve diff data'
    }
  }

  async getMergeRequestChanges(projectId, mrIid) {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/changes`
    )
    return response.data
  }

  async createMergeRequestNote(projectId, mrIid, body) {
    const response = await this.getClient().post(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`,
      { body }
    )
    return response.data
  }

  async getMergeRequestNotes(projectId, mrIid) {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`,
      { params: { sort: 'desc', order_by: 'created_at' } }
    )
    return response.data
  }

  // Branch endpoints
  async getBranches(projectId) {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/repository/branches`
    )
    return response.data
  }

  async createBranch(projectId, branch, ref, options = {}) {
    const headers = options.propagate401 ? { 'X-Propagate-401': 'true' } : {}
    const response = await this.getClient().post(
      `/projects/${encodeURIComponent(projectId)}/repository/branches`,
      { branch, ref },
      { headers }
    )
    return response.data
  }

  // Repository analysis endpoints
  async getRepositoryTree(projectId, ref = 'main', recursive = true) {
    const params = {
      ref,
      recursive,
      per_page: 1000 // Get up to 1000 files
    }
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/repository/tree`,
      { params }
    )
    return response.data
  }

  async getFileContent(projectId, filePath, ref = 'main') {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`,
      { params: { ref } }
    )
    // Decode base64 content
    const content = atob(response.data.content)
    return {
      ...response.data,
      content
    }
  }

  async getFileContentBatch(projectId, filePaths, ref = 'main') {
    const results = []
    const BATCH_SIZE = 5 // Process 5 files at a time to avoid rate limiting
    
    for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
      const batch = filePaths.slice(i, i + BATCH_SIZE)
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          const fileData = await this.getFileContent(projectId, filePath, ref)
          return {
            path: filePath,
            success: true,
            data: fileData
          }
        } catch (error) {
          return {
            path: filePath,
            success: false,
            error: error.response?.data?.message || error.message
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    return results
  }

  async getRepositoryLanguages(projectId) {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/languages`
    )
    return response.data
  }

  async getRepositorySize(projectId) {
    const response = await this.getClient().get(
      `/projects/${encodeURIComponent(projectId)}/statistics`
    )
    return response.data
  }

  // Version check
  async checkVersion() {
    try {
      const response = await this.getClient().get('/version')
      this.gitlabVersion = response.data.version
      return response.data
    } catch (error) {
      // Fallback for instances where version endpoint is not available
      this.gitlabVersion = 'unknown'
      return { version: 'unknown', revision: 'unknown' }
    }
  }

  // Test connection
  async testConnection() {
    try {
      await this.getCurrentUser()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      }
    }
  }
}

export default new GitLabAPI()