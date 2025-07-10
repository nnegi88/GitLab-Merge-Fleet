import { PromptBuilderService } from '../services/promptBuilder.js'
import { ReviewParserService } from '../services/reviewParser.js'

/**
 * Gemini AI API service for code reviews
 * Now uses modular services for better extensibility
 * 
 * EXTENSION POINTS:
 * 1. Replace PromptBuilderService with custom implementation via constructor injection
 * 2. Replace ReviewParserService with custom implementation via constructor injection
 * 3. Override generateContent() to implement custom API communication
 * 4. Override reviewMergeRequest() to customize merge request review workflow
 * 5. Override reviewRepository() to customize repository review workflow
 * 6. Add new review types (security, performance, accessibility)
 * 7. Implement custom error handling and retry logic
 * 8. Add support for different AI providers (OpenAI, Anthropic, etc.)
 * 
 * USAGE:
 * const geminiAPI = new GeminiAPI()
 * const review = await geminiAPI.reviewRepository(repositoryData, files, options)
 * 
 * CUSTOM SERVICES:
 * const customPromptBuilder = new CustomPromptBuilderService()
 * const customReviewParser = new CustomReviewParserService()
 * const geminiAPI = new GeminiAPI(customPromptBuilder, customReviewParser)
 */
class GeminiAPI {
  constructor(promptBuilderService = null, reviewParserService = null) {
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent'
    
    // EXTENSION POINT: Allow custom service injection
    this.promptBuilder = promptBuilderService || new PromptBuilderService()
    this.reviewParser = reviewParserService || new ReviewParserService()
  }

  getApiKey() {
    return localStorage.getItem('gemini_api_key')
  }

  async generateContent(prompt) {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please add it in Settings.')
    }

    const response = await fetch(`${this.baseURL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
  }

  async reviewMergeRequest(mrData, diffData) {
    const prompt = this.promptBuilder.buildMergeRequestPrompt(mrData, diffData)
    
    try {
      const review = await this.generateContent(prompt)
      return this.reviewParser.parseMergeRequestReview(review)
    } catch (error) {
      throw new Error(`AI Review failed: ${error.message}`)
    }
  }


  // Repository review methods
  async reviewRepository(repositoryData, files, options = {}) {
    const { focus = 'comprehensive', depth = 'standard' } = options
    
    try {
      // Generate the review prompt
      const prompt = this.promptBuilder.buildRepositoryPrompt(repositoryData, files, options)
      
      // Get AI response
      const response = await this.generateContent(prompt)
      
      // Parse the structured response
      const parsedReview = this.reviewParser.parseRepositoryReview(response)
      
      return {
        fullReview: response,
        ...parsedReview,
        metadata: {
          filesAnalyzed: files.length,
          focus,
          depth,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Repository review failed:', error)
      throw error
    }
  }


  async testConnection() {
    try {
      const testPrompt = 'Hello, this is a test. Please respond with "Connection successful".'
      const response = await this.generateContent(testPrompt)
      return { 
        success: true, 
        message: 'Gemini API connection successful',
        response: response.substring(0, 100) 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      }
    }
  }
}

export default new GeminiAPI()