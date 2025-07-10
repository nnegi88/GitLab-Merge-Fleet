/**
 * Review parsing service for AI responses
 * Extracted from Gemini API for better modularity and extensibility
 * 
 * EXTENSION POINTS:
 * 1. Override parseMergeRequestReview() to customize merge request review parsing
 * 2. Override parseRepositoryReview() to customize repository review parsing
 * 3. Add new parsing methods for different review types (e.g., parseSecurityReview)
 * 4. Override extractSection() to implement custom section extraction logic
 * 5. Override generateMergeRequestSummary() to customize summary generation
 * 6. Add support for new review formats (JSON, XML, custom markdown)
 * 7. Implement custom validation for parsed reviews
 * 
 * USAGE:
 * const reviewParser = new ReviewParserService()
 * const parsed = reviewParser.parseRepositoryReview(response)
 */

export class ReviewParserService {
  
  /**
   * Parse merge request review response
   * EXTENSION POINT: Override this method to customize merge request review parsing
   * 
   * @param {String} reviewText - Raw AI response text
   * @returns {Object} Parsed review with sections and summary
   */
  parseMergeRequestReview(reviewText) {
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
      summary: this.generateMergeRequestSummary(sections)
    }
  }

  /**
   * Parse repository review response
   * EXTENSION POINT: Override this method to customize repository review parsing
   * 
   * @param {String} reviewText - Raw AI response text
   * @returns {Object} Parsed review with sections
   */
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

  /**
   * Generate summary for merge request review
   */
  generateMergeRequestSummary(sections) {
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

  /**
   * Extract a specific section from review text
   */
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
}