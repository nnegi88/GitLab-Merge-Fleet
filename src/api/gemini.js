class GeminiAPI {
  constructor() {
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent'
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
    const prompt = this.buildReviewPrompt(mrData, diffData)
    
    try {
      const review = await this.generateContent(prompt)
      return this.parseReview(review)
    } catch (error) {
      throw new Error(`AI Review failed: ${error.message}`)
    }
  }

  truncateDiff(diffData, maxLength = 8000) {
    if (!diffData || diffData.length <= maxLength) {
      return diffData
    }
    
    // Try to truncate at a reasonable line boundary
    const truncated = diffData.substring(0, maxLength)
    const lastNewline = truncated.lastIndexOf('\n')
    
    if (lastNewline > maxLength * 0.8) {
      return truncated.substring(0, lastNewline) + '\n\n... (diff truncated for analysis - showing first ' + Math.round(lastNewline / diffData.length * 100) + '% of changes)'
    }
    
    return truncated + '\n\n... (diff truncated for analysis)'
  }

  buildReviewPrompt(mrData, diffData) {
    return `You are an expert code reviewer. Analyze this GitLab merge request and provide constructive feedback.

**Merge Request Details:**
- Title: ${mrData.title}
- Description: ${mrData.description || 'No description provided'}
- Author: ${mrData.author?.name || 'Unknown'}
- Source Branch: ${mrData.source_branch}
- Target Branch: ${mrData.target_branch}
- Labels: ${mrData.labels?.join(', ') || 'None'}

**Code Changes:**
\`\`\`diff
${diffData}
\`\`\`

Provide a structured review with these sections. Do NOT wrap your response in code blocks. Write plain markdown:

## 🔍 Overall Assessment
Brief summary of the changes and general code quality.

## 🐛 Code Quality Issues
Any bugs, logic errors, or potential issues found. If none, write "No significant issues identified."

## 🎨 Style & Best Practices
Code style, naming conventions, and best practices. If good, write "Code follows good practices."

## ⚡ Performance Considerations
Performance implications or optimization opportunities. If none, write "No performance concerns."

## 🔒 Security Concerns
Security vulnerabilities or concerns. If none, write "No security issues identified."

## 💡 Suggestions
Specific improvements or recommendations.

**Requirements:**
- Use ## for main sections
- Use - for bullet points
- Use \`backticks\` for inline code
- Use \`\`\`language for code blocks
- Be specific and actionable
- Do NOT start with \`\`\`markdown or wrap in code blocks
- Write direct markdown content only`
  }

  parseReview(reviewText) {
    // Clean up the response - remove markdown code block wrapper if present
    let cleanedText = reviewText.trim()
    
    // Remove markdown code block wrapper if it exists
    if (cleanedText.startsWith('```markdown')) {
      cleanedText = cleanedText.replace(/^```markdown\s*/, '').replace(/```\s*$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '')
    }
    
    // Extract different sections from the AI response
    const sections = {
      overall: '',
      codeQuality: '',
      style: '',
      performance: '',
      security: '',
      suggestions: ''
    }

    // Try to parse structured sections using both old and new patterns
    const overallMatch = cleanedText.match(/##\s*🔍\s*Overall Assessment\s*(.*?)(?=##|$)/s) ||
                        cleanedText.match(/\*\*Overall Assessment\*\*:?\s*(.*?)(?=\*\*|$)/s)
    if (overallMatch) sections.overall = overallMatch[1].trim()

    const codeQualityMatch = cleanedText.match(/##\s*🐛\s*Code Quality Issues\s*(.*?)(?=##|$)/s) ||
                            cleanedText.match(/\*\*Code Quality Issues\*\*:?\s*(.*?)(?=\*\*|$)/s)
    if (codeQualityMatch) sections.codeQuality = codeQualityMatch[1].trim()

    const styleMatch = cleanedText.match(/##\s*🎨\s*Style & Best Practices\s*(.*?)(?=##|$)/s) ||
                      cleanedText.match(/\*\*Style & Best Practices\*\*:?\s*(.*?)(?=\*\*|$)/s)
    if (styleMatch) sections.style = styleMatch[1].trim()

    const performanceMatch = cleanedText.match(/##\s*⚡\s*Performance Considerations\s*(.*?)(?=##|$)/s) ||
                             cleanedText.match(/\*\*Performance Considerations\*\*:?\s*(.*?)(?=\*\*|$)/s)
    if (performanceMatch) sections.performance = performanceMatch[1].trim()

    const securityMatch = cleanedText.match(/##\s*🔒\s*Security Concerns\s*(.*?)(?=##|$)/s) ||
                          cleanedText.match(/\*\*Security Concerns\*\*:?\s*(.*?)(?=\*\*|$)/s)
    if (securityMatch) sections.security = securityMatch[1].trim()

    const suggestionsMatch = cleanedText.match(/##\s*💡\s*Suggestions\s*(.*?)(?=##|$)/s) ||
                            cleanedText.match(/\*\*Suggestions\*\*:?\s*(.*?)(?=\*\*|$)/s)
    if (suggestionsMatch) sections.suggestions = suggestionsMatch[1].trim()

    return {
      fullReview: cleanedText,
      sections,
      summary: this.generateSummary(sections)
    }
  }

  generateSummary(sections) {
    const issues = []
    if (sections.codeQuality && sections.codeQuality.toLowerCase().includes('issue')) {
      issues.push('code quality concerns')
    }
    if (sections.security && sections.security.toLowerCase().includes('concern')) {
      issues.push('security considerations')
    }
    if (sections.performance && sections.performance.toLowerCase().includes('performance')) {
      issues.push('performance implications')
    }

    if (issues.length === 0) {
      return '✅ Code looks good overall with minor suggestions'
    } else {
      return `⚠️ Found ${issues.join(', ')}`
    }
  }

  // Repository review methods
  async reviewRepository(repositoryData, files, options = {}) {
    const { focus = 'comprehensive', depth = 'standard' } = options
    
    try {
      // Generate the review prompt
      const prompt = this.buildRepositoryReviewPrompt(repositoryData, files, { focus, depth })
      
      // Get AI response
      const response = await this.generateContent(prompt)
      
      // Parse the structured response
      const parsedReview = this.parseRepositoryReview(response)
      
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

  buildRepositoryReviewPrompt(repositoryData, files, options) {
    const { focus, depth } = options
    
    // Build file summaries for context
    const fileSummaries = files.map(file => {
      const lines = file.content ? file.content.split('\n').length : 0
      return `### ${file.path}
- **Type**: ${file.extension || 'unknown'}
- **Size**: ${file.size || 0} bytes (${lines} lines)
- **Content**: 
\`\`\`${this.getLanguageFromExtension(file.extension)}
${this.truncateContent(file.content, depth)}
\`\`\``
    }).join('\n\n')

    const focusInstructions = this.getFocusInstructions(focus)
    const depthInstructions = this.getDepthInstructions(depth)

    return `# Repository Code Review Request

## Repository Information
- **Name**: ${repositoryData.project.name_with_namespace}
- **Description**: ${repositoryData.project.description || 'No description'}
- **Languages**: ${Object.keys(repositoryData.languages).join(', ')}
- **Files Analyzed**: ${files.length} of ${repositoryData.totalFiles} total files

## Analysis Scope
${focusInstructions}
${depthInstructions}

## Files to Review
${fileSummaries}

## Review Requirements

Provide a comprehensive code review with these sections. Write in clean markdown format:

## 🏗️ Repository Overview
Brief assessment of the overall repository structure, architecture, and purpose.

## 📊 Code Quality Assessment
Overall code quality, consistency, and maintainability across the codebase.

## 🔒 Security Analysis
Security vulnerabilities, best practices, and potential risks identified.

## ⚡ Performance Insights
Performance considerations, optimization opportunities, and efficiency improvements.

## 🎯 Architecture & Design
Code organization, design patterns, and architectural decisions.

## 📁 File-Level Insights
Specific insights for individual files, focusing on the most critical issues.

## 🚀 Recommendations
Prioritized list of improvements and next steps.

## 📋 Summary
Executive summary with key findings and overall assessment.

**Guidelines:**
- Use ## for main sections
- Use ### for subsections
- Use - for bullet points
- Use \`backticks\` for inline code and file names
- Use \`\`\`language for code blocks
- Be specific and actionable
- Prioritize issues by impact
- Consider the repository's context and purpose
- Write direct markdown content only (no code block wrappers)`
  }

  parseRepositoryReview(reviewText) {
    // Clean up the response
    let cleanedText = reviewText.trim()
    
    if (cleanedText.startsWith('```markdown')) {
      cleanedText = cleanedText.replace(/^```markdown\s*/, '').replace(/```\s*$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '')
    }

    // Extract sections
    const sections = {
      overview: this.extractSection(cleanedText, '🏗️ Repository Overview'),
      codeQuality: this.extractSection(cleanedText, '📊 Code Quality Assessment'),
      security: this.extractSection(cleanedText, '🔒 Security Analysis'),
      performance: this.extractSection(cleanedText, '⚡ Performance Insights'),
      architecture: this.extractSection(cleanedText, '🎯 Architecture & Design'),
      fileInsights: this.extractSection(cleanedText, '📁 File-Level Insights'),
      recommendations: this.extractSection(cleanedText, '🚀 Recommendations'),
      summary: this.extractSection(cleanedText, '📋 Summary')
    }

    return {
      sections,
      fullReview: cleanedText
    }
  }

  getFocusInstructions(focus) {
    const focusMap = {
      comprehensive: 'Analyze all aspects: security, performance, code quality, architecture, and best practices.',
      security: 'Focus primarily on security vulnerabilities, authentication, authorization, input validation, and secure coding practices.',
      performance: 'Focus on performance bottlenecks, optimization opportunities, resource usage, and scalability concerns.',
      quality: 'Focus on code quality, maintainability, readability, testing, and adherence to best practices.',
      architecture: 'Focus on code organization, design patterns, separation of concerns, and overall system design.'
    }
    return `**Focus Area**: ${focusMap[focus] || focusMap.comprehensive}`
  }

  getDepthInstructions(depth) {
    const depthMap = {
      quick: 'Provide a high-level overview with key issues and recommendations. Focus on the most critical findings.',
      standard: 'Provide a thorough analysis with detailed insights and specific recommendations for improvement.',
      deep: 'Provide comprehensive analysis including detailed code examples, alternative approaches, and extensive recommendations.'
    }
    return `**Analysis Depth**: ${depthMap[depth] || depthMap.standard}`
  }

  getLanguageFromExtension(ext) {
    const langMap = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.vue': 'vue',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.go': 'go',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.cpp': 'cpp',
      '.c': 'c',
      '.rs': 'rust',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.md': 'markdown'
    }
    return langMap[ext] || 'text'
  }

  truncateContent(content, depth) {
    if (!content) return ''
    
    const maxLines = {
      quick: 20,
      standard: 50,
      deep: 100
    }
    
    const lines = content.split('\n')
    const limit = maxLines[depth] || maxLines.standard
    
    if (lines.length <= limit) {
      return content
    }
    
    return lines.slice(0, limit).join('\n') + `\n... (${lines.length - limit} more lines)`
  }

  extractSection(text, sectionTitle) {
    // Try to extract section content using various patterns
    const patterns = [
      new RegExp(`##\\s*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(.*?)(?=##|$)`, 's'),
      new RegExp(`\\*\\*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*:?\\s*(.*?)(?=\\*\\*|$)`, 's'),
      new RegExp(`${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(.*?)(?=##|\\*\\*|$)`, 's')
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return 'No content available for this section.'
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