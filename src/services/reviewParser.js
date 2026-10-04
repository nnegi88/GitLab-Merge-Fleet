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
    const overallMatch = cleanedText.match(/##\s*🔍\s*Overall Assessment\s*(.*?)(?=^#{1,2}[ \t]|(?![\s\S]))/ms) ||
                        cleanedText.match(/\*\*Overall Assessment\*\*:?\s*(.*?)(?=\*\*|^#{1,2}[ \t]|(?![\s\S]))/ms)
    if (overallMatch) sections.overall = overallMatch[1].trim()

    const codeQualityMatch = cleanedText.match(/##\s*🐛\s*Code Quality Issues\s*(.*?)(?=^#{1,2}[ \t]|(?![\s\S]))/ms) ||
                            cleanedText.match(/\*\*Code Quality Issues\*\*:?\s*(.*?)(?=\*\*|^#{1,2}[ \t]|(?![\s\S]))/ms)
    if (codeQualityMatch) sections.codeQuality = codeQualityMatch[1].trim()

    const styleMatch = cleanedText.match(/##\s*🎨\s*Style & Best Practices\s*(.*?)(?=^#{1,2}[ \t]|(?![\s\S]))/ms) ||
                      cleanedText.match(/\*\*Style & Best Practices\*\*:?\s*(.*?)(?=\*\*|^#{1,2}[ \t]|(?![\s\S]))/ms)
    if (styleMatch) sections.style = styleMatch[1].trim()

    const performanceMatch = cleanedText.match(/##\s*⚡\s*Performance Considerations\s*(.*?)(?=^#{1,2}[ \t]|(?![\s\S]))/ms) ||
                             cleanedText.match(/\*\*Performance Considerations\*\*:?\s*(.*?)(?=\*\*|^#{1,2}[ \t]|(?![\s\S]))/ms)
    if (performanceMatch) sections.performance = performanceMatch[1].trim()

    const securityMatch = cleanedText.match(/##\s*🔒\s*Security Concerns\s*(.*?)(?=^#{1,2}[ \t]|(?![\s\S]))/ms) ||
                          cleanedText.match(/\*\*Security Concerns\*\*:?\s*(.*?)(?=\*\*|^#{1,2}[ \t]|(?![\s\S]))/ms)
    if (securityMatch) sections.security = securityMatch[1].trim()

    const suggestionsMatch = cleanedText.match(/##\s*💡\s*Suggestions\s*(.*?)(?=^#{1,2}[ \t]|(?![\s\S]))/ms) ||
                            cleanedText.match(/\*\*Suggestions\*\*:?\s*(.*?)(?=\*\*|^#{1,2}[ \t]|(?![\s\S]))/ms)
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
    const title = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // A section ends at the next # or ## heading (### subsections stay inside it) or at end of text
    const sectionEnd = '^#{1,2}[ \\t]|(?![\\s\\S])'

    // Try to extract section content using various patterns
    const patterns = [
      new RegExp(`##\\s*${title}\\s*(.*?)(?=${sectionEnd})`, 'ms'),
      new RegExp(`\\*\\*${title}\\*\\*:?\\s*(.*?)(?=\\*\\*|${sectionEnd})`, 'ms'),
      new RegExp(`${title}\\s*(.*?)(?=\\*\\*|${sectionEnd})`, 'ms')
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      // A section that is present but empty returns '', not the placeholder
      if (match) {
        return match[1].trim()
      }
    }
    
    return 'No content available for this section.'
  }
}