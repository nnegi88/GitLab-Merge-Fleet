/**
 * Prompt building service for AI reviews
 * Extracted from Gemini API for better modularity and extensibility
 * 
 * EXTENSION POINTS:
 * 1. Override buildMergeRequestPrompt() to customize merge request review prompts
 * 2. Override buildRepositoryPrompt() to customize repository review prompts
 * 3. Add new prompt building methods for different review types (e.g., buildSecurityPrompt)
 * 4. Override getFocusInstructions() to add new focus areas
 * 5. Override getDepthInstructions() to add new analysis depth levels
 * 6. Override truncateContent() to implement custom content truncation strategies
 * 7. Add template-based prompt generation for consistency
 * 
 * USAGE:
 * const promptBuilder = new PromptBuilderService()
 * const prompt = promptBuilder.buildRepositoryPrompt(repo, files, options)
 */

import { CONTENT_LIMITS, EXTENSION_LANGUAGE_MAP } from '../config/analysis.js'

export class PromptBuilderService {
  
  /**
   * Build a merge request review prompt
   * EXTENSION POINT: Override this method to customize merge request review prompts
   * 
   * @param {Object} mrData - Merge request data from GitLab API
   * @param {String} diffData - Diff content for the merge request
   * @returns {String} Formatted prompt for AI review
   */
  buildMergeRequestPrompt(mrData, diffData) {
    const truncatedDiff = this.truncateDiff(diffData)
    
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
${truncatedDiff}
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

  /**
   * Build a repository review prompt
   * EXTENSION POINT: Override this method to customize repository review prompts
   * 
   * @param {Object} repositoryData - Repository data from analysis
   * @param {Array} files - Array of file objects with content
   * @param {Object} options - Review options (focus, depth, branch)
   * @returns {String} Formatted prompt for AI review
   */
  buildRepositoryPrompt(repositoryData, files, options = {}) {
    const { focus = 'comprehensive', depth = 'standard', branch } = options
    
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
- **Branch**: ${branch || repositoryData.project.default_branch || 'main'}
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

  /**
   * Truncate diff content for analysis
   */
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

  /**
   * Truncate file content based on analysis depth
   */
  truncateContent(content, depth) {
    if (!content) return ''
    
    const lines = content.split('\n')
    const limit = CONTENT_LIMITS[depth] || CONTENT_LIMITS.standard
    
    if (lines.length <= limit) {
      return content
    }
    
    return lines.slice(0, limit).join('\n') + `\n... (${lines.length - limit} more lines)`
  }

  /**
   * Get focus-specific instructions
   */
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

  /**
   * Get depth-specific instructions
   */
  getDepthInstructions(depth) {
    const depthMap = {
      quick: 'Provide a high-level overview with key issues and recommendations. Focus on the most critical findings.',
      standard: 'Provide a thorough analysis with detailed insights and specific recommendations for improvement.',
      deep: 'Provide comprehensive analysis including detailed code examples, alternative approaches, and extensive recommendations.'
    }
    return `**Analysis Depth**: ${depthMap[depth] || depthMap.standard}`
  }

  /**
   * Get language identifier from file extension
   */
  getLanguageFromExtension(ext) {
    return EXTENSION_LANGUAGE_MAP[ext] || 'text'
  }
}