import { ReviewParserService } from '../../../src/services/reviewParser.js'
import { describe, it, expect, beforeEach } from 'vitest'

describe('ReviewParserService', () => {
  let reviewParser

  beforeEach(() => {
    reviewParser = new ReviewParserService()
  })

  describe('parseMergeRequestReview', () => {
    it('should parse review with markdown code block wrapper', () => {
      const reviewText = `\`\`\`markdown
## 🔍 Overall Assessment
Great code quality

## 🐛 Code Quality Issues
No major issues found

## 🎨 Style & Best Practices
Follows best practices

## ⚡ Performance Considerations
Good performance

## 🔒 Security Concerns
No security concerns

## 💡 Suggestions
Minor improvements suggested
\`\`\``

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toBe('Great code quality')
      expect(result.sections.codeQuality).toBe('No major issues found')
      expect(result.sections.style).toBe('Follows best practices')
      expect(result.sections.performance).toBe('Good performance')
      expect(result.sections.security).toBe('No security concerns')
      expect(result.sections.suggestions).toBe('Minor improvements suggested')
      expect(result.fullReview).not.toContain('```markdown')
      expect(result.summary).toBeDefined()
    })

    it('should parse review with plain markdown wrapper', () => {
      const reviewText = `\`\`\`
## 🔍 Overall Assessment
Looks good
\`\`\``

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toBe('Looks good')
      expect(result.fullReview).not.toContain('```')
    })

    it('should parse review without markdown wrapper', () => {
      const reviewText = `## 🔍 Overall Assessment
Clean implementation

## 🐛 Code Quality Issues
Well structured`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toBe('Clean implementation')
      expect(result.sections.codeQuality).toBe('Well structured')
    })

    it('should parse review with bold section headers', () => {
      const reviewText = `**Overall Assessment**: The code is well written

**Code Quality Issues**: None found

**Style & Best Practices**: Good style

**Performance Considerations**: Optimized

**Security Concerns**: Secure

**Suggestions**: Keep it up`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toBe('The code is well written')
      expect(result.sections.codeQuality).toBe('None found')
      expect(result.sections.style).toBe('Good style')
      expect(result.sections.performance).toBe('Optimized')
      expect(result.sections.security).toBe('Secure')
      expect(result.sections.suggestions).toBe('Keep it up')
    })

    it('should handle review with mixed section formats', () => {
      const reviewText = `## 🔍 Overall Assessment
Good work

**Code Quality Issues**: Some minor issues

## 🎨 Style & Best Practices
Consistent style

**Performance Considerations**: No issues`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      // A ## section runs until the next # or ## heading, so bold lines stay inside it
      expect(result.sections.overall).toBe('Good work\n\n**Code Quality Issues**: Some minor issues')
      expect(result.sections.style).toBe('Consistent style\n\n**Performance Considerations**: No issues')
      // The bold fallback stops at the next ## heading
      expect(result.sections.codeQuality).toBe('Some minor issues')
      expect(result.sections.performance).toBe('No issues')
    })

    it('should keep ### subsections inside a ## section', () => {
      const reviewText = `## 🔍 Overall Assessment
Summary

## 🐛 Code Quality Issues
Intro
### src/api/gitlab.js
- Missing error handling

## 🎨 Style & Best Practices
Fine`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.codeQuality).toBe('Intro\n### src/api/gitlab.js\n- Missing error handling')
      expect(result.sections.style).toBe('Fine')
    })

    it('should return empty string for a ## section with no content', () => {
      const reviewText = `## 🔍 Overall Assessment

## 🐛 Code Quality Issues
None`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toBe('')
      expect(result.sections.codeQuality).toBe('None')
    })

    it('should handle review with multiline sections', () => {
      const reviewText = `## 🔍 Overall Assessment
This is a comprehensive review.
The code quality is excellent.
Several improvements are recommended.

## 🐛 Code Quality Issues
Issue 1: Variable naming
Issue 2: Function complexity`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toContain('comprehensive review')
      expect(result.sections.overall).toContain('Several improvements')
      expect(result.sections.codeQuality).toContain('Issue 1')
      expect(result.sections.codeQuality).toContain('Issue 2')
    })

    it('should handle review with missing sections', () => {
      const reviewText = `## 🔍 Overall Assessment
Basic review

## 🐛 Code Quality Issues
Some issues`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toBe('Basic review')
      expect(result.sections.codeQuality).toBe('Some issues')
      expect(result.sections.style).toBe('')
      expect(result.sections.performance).toBe('')
      expect(result.sections.security).toBe('')
      expect(result.sections.suggestions).toBe('')
    })

    it('should handle empty review text', () => {
      const result = reviewParser.parseMergeRequestReview('')

      expect(result.sections.overall).toBe('')
      expect(result.sections.codeQuality).toBe('')
      expect(result.sections.style).toBe('')
      expect(result.sections.performance).toBe('')
      expect(result.sections.security).toBe('')
      expect(result.sections.suggestions).toBe('')
      expect(result.fullReview).toBe('')
    })

    it('should handle review with only whitespace', () => {
      const result = reviewParser.parseMergeRequestReview('   \n\n  ')

      expect(result.sections.overall).toBe('')
      expect(result.fullReview).toBe('')
    })

    it('should preserve special characters in section content', () => {
      const reviewText = `## 🔍 Overall Assessment
Code uses @decorators and #hashtags
Also contains special chars: $variable, &operator, *pointer`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toContain('@decorators')
      expect(result.sections.overall).toContain('#hashtags')
      expect(result.sections.overall).toContain('$variable')
    })

    it('should handle review with nested markdown formatting', () => {
      const reviewText = `## 🔍 Overall Assessment
**Bold text** and *italic text*
- List item 1
- List item 2
\`code snippet\``

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.sections.overall).toContain('**Bold text**')
      expect(result.sections.overall).toContain('*italic text*')
      expect(result.sections.overall).toContain('- List item 1')
      expect(result.sections.overall).toContain('`code snippet`')
    })

    it('should generate summary from parsed sections', () => {
      const reviewText = `## 🔍 Overall Assessment
Good

## 🐛 Code Quality Issues
Major issue found

## 🔒 Security Concerns
Security concern detected`

      const result = reviewParser.parseMergeRequestReview(reviewText)

      expect(result.summary).toContain('code quality concerns')
      expect(result.summary).toContain('security considerations')
    })
  })

  describe('parseRepositoryReview', () => {
    it('should parse repository review with all sections', () => {
      const reviewText = `## 🏗️ Repository Overview
Well-structured repository

## 📊 Code Quality Assessment
High quality code

## 🔒 Security Analysis
Secure implementation

## ⚡ Performance Insights
Good performance

## 🎯 Architecture & Design
Clean architecture

## 📁 File-Level Insights
Well organized files

## 🚀 Recommendations
Continue good practices

## 📋 Summary
Excellent repository`

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toBe('Well-structured repository')
      expect(result.sections.codeQuality).toBe('High quality code')
      expect(result.sections.security).toBe('Secure implementation')
      expect(result.sections.performance).toBe('Good performance')
      expect(result.sections.architecture).toBe('Clean architecture')
      expect(result.sections.fileInsights).toBe('Well organized files')
      expect(result.sections.recommendations).toBe('Continue good practices')
      expect(result.sections.summary).toBe('Excellent repository')
      expect(result.fullReview).toBeDefined()
    })

    it('should remove markdown code block wrapper', () => {
      const reviewText = `\`\`\`markdown
## 🏗️ Repository Overview
Repository analysis
\`\`\``

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toBe('Repository analysis')
      expect(result.fullReview).not.toContain('```markdown')
    })

    it('should remove plain code block wrapper', () => {
      const reviewText = `\`\`\`
## 🏗️ Repository Overview
Repository analysis
\`\`\``

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toBe('Repository analysis')
      expect(result.fullReview).not.toContain('```')
    })

    it('should handle missing sections with default message', () => {
      const reviewText = `## 🏗️ Repository Overview
Basic overview`

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toBe('Basic overview')
      expect(result.sections.codeQuality).toBe('No content available for this section.')
      expect(result.sections.security).toBe('No content available for this section.')
      expect(result.sections.performance).toBe('No content available for this section.')
      expect(result.sections.architecture).toBe('No content available for this section.')
      expect(result.sections.fileInsights).toBe('No content available for this section.')
      expect(result.sections.recommendations).toBe('No content available for this section.')
      expect(result.sections.summary).toBe('No content available for this section.')
    })

    it('should handle empty review text', () => {
      const result = reviewParser.parseRepositoryReview('')

      expect(result.sections.overview).toBe('No content available for this section.')
      expect(result.fullReview).toBe('')
    })

    it('should preserve multiline section content', () => {
      const reviewText = `## 🏗️ Repository Overview
Line 1
Line 2
Line 3

## 📊 Code Quality Assessment
Quality line 1
Quality line 2`

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toContain('Line 1')
      expect(result.sections.overview).toContain('Line 2')
      expect(result.sections.overview).toContain('Line 3')
      expect(result.sections.codeQuality).toContain('Quality line 1')
      expect(result.sections.codeQuality).toContain('Quality line 2')
    })

    it('should handle sections with special characters', () => {
      const reviewText = `## 🏗️ Repository Overview
Repository uses @decorators, #hashtags, and $variables`

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toContain('@decorators')
      expect(result.sections.overview).toContain('#hashtags')
      expect(result.sections.overview).toContain('$variables')
    })

    it('should handle sections with nested markdown', () => {
      const reviewText = `## 🏗️ Repository Overview
**Bold** and *italic*
- List item
\`code\``

      const result = reviewParser.parseRepositoryReview(reviewText)

      expect(result.sections.overview).toContain('**Bold**')
      expect(result.sections.overview).toContain('*italic*')
      expect(result.sections.overview).toContain('- List item')
      expect(result.sections.overview).toContain('`code`')
    })
  })

  describe('generateMergeRequestSummary', () => {
    it('should generate positive summary when no issues', () => {
      const sections = {
        codeQuality: 'Everything looks good',
        security: 'No problems',
        performance: 'Fast'
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toBe('✅ Code looks good overall with minor suggestions')
    })

    it('should detect code quality concerns', () => {
      const sections = {
        codeQuality: 'Found some code quality issues',
        security: 'Secure',
        performance: 'Good'
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toContain('⚠️')
      expect(result).toContain('code quality concerns')
    })

    it('should detect security considerations', () => {
      const sections = {
        codeQuality: 'Good',
        security: 'Security concerns detected',
        performance: 'Good'
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toContain('⚠️')
      expect(result).toContain('security considerations')
    })

    it('should detect performance implications', () => {
      const sections = {
        codeQuality: 'Good',
        security: 'Secure',
        performance: 'Performance issues detected'
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toContain('⚠️')
      expect(result).toContain('performance implications')
    })

    it('should combine multiple concerns', () => {
      const sections = {
        codeQuality: 'Code quality issue found',
        security: 'Security concern detected',
        performance: 'Performance problem'
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toContain('⚠️')
      expect(result).toContain('code quality concerns')
      expect(result).toContain('security considerations')
      expect(result).toContain('performance implications')
    })

    it('should handle empty sections', () => {
      const sections = {
        codeQuality: '',
        security: '',
        performance: ''
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toBe('✅ Code looks good overall with minor suggestions')
    })

    it('should be case insensitive for issue detection', () => {
      const sections = {
        codeQuality: 'CODE QUALITY ISSUE',
        security: 'SECURITY CONCERN',
        performance: 'PERFORMANCE PROBLEM'
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toContain('code quality concerns')
      expect(result).toContain('security considerations')
      expect(result).toContain('performance implications')
    })

    it('should handle undefined sections', () => {
      const sections = {}

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toBe('✅ Code looks good overall with minor suggestions')
    })

    it('should handle partial sections', () => {
      const sections = {
        codeQuality: 'Major issue',
        security: undefined,
        performance: null
      }

      const result = reviewParser.generateMergeRequestSummary(sections)

      expect(result).toContain('code quality concerns')
      expect(result).not.toContain('security considerations')
      expect(result).not.toContain('performance implications')
    })
  })

  describe('extractSection', () => {
    it('should extract section with ## header pattern', () => {
      const text = `## 🏗️ Repository Overview
This is the overview content
## Next Section
Other content`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('This is the overview content')
    })

    it('should extract section with ** bold pattern', () => {
      const text = `**🏗️ Repository Overview**: This is the content
**Next Section**: Other content`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('This is the content')
    })

    it('should extract section with ** bold pattern and colon', () => {
      const text = `**🏗️ Repository Overview**: This is the content`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('This is the content')
    })

    it('should extract section with plain text pattern', () => {
      const text = `🏗️ Repository Overview
This is the content
## Next Section`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('This is the content')
    })

    it('should handle section at end of text', () => {
      const text = `## First Section
Content 1
## 🏗️ Repository Overview
Final content here`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('Final content here')
    })

    it('should return default message when section not found', () => {
      const text = `## Some Other Section
Some content`

      const result = reviewParser.extractSection(text, 'Missing Section')

      expect(result).toBe('No content available for this section.')
    })

    it('should handle multiline section content', () => {
      const text = `## 🏗️ Repository Overview
Line 1
Line 2
Line 3
## Next Section`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toContain('Line 1')
      expect(result).toContain('Line 2')
      expect(result).toContain('Line 3')
    })

    it('should handle section with special regex characters', () => {
      const text = `## Section (with) [brackets] {and} $special
Content here
## Next`

      const result = reviewParser.extractSection(text, 'Section (with) [brackets] {and} $special')

      expect(result).toBe('Content here')
    })

    it('should trim whitespace from extracted content', () => {
      const text = `## 🏗️ Repository Overview

  Content with whitespace

## Next`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('Content with whitespace')
    })

    it('should handle empty section content', () => {
      const text = `## 🏗️ Repository Overview
## Next Section`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('')
    })

    it('should handle section with only whitespace', () => {
      const text = `## 🏗️ Repository Overview


## Next Section`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('')
    })

    it('should extract content until next heading', () => {
      const text = `## Section 1
Content 1
## Section 2
Content 2`

      const result = reviewParser.extractSection(text, 'Section 1')

      expect(result).toBe('Content 1')
      expect(result).not.toContain('Section 2')
    })

    it('should keep bold lines inside a ## section', () => {
      const text = `## Section 1
Content 1
**Section 2**: Content 2`

      const result = reviewParser.extractSection(text, 'Section 1')

      expect(result).toBe('Content 1\n**Section 2**: Content 2')
    })

    it('should keep ### subsections inside a ## section', () => {
      const text = `## 🏗️ Repository Overview
Intro line
### Frontend
Vue 3 app
- **src/api/gitlab.js**: handles API
## 📊 Code Quality Assessment
Good`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toBe('Intro line\n### Frontend\nVue 3 app\n- **src/api/gitlab.js**: handles API')
    })

    it('should stop a bold-title section at the next ## heading', () => {
      const text = `**Section 1**: Content 1

## Section 2
Content 2`

      const result = reviewParser.extractSection(text, 'Section 1')

      expect(result).toBe('Content 1')
    })

    it('should handle sections with nested markdown', () => {
      const text = `## 🏗️ Repository Overview
**Bold text**
*Italic text*
- List item
\`code\`
## Next`

      const result = reviewParser.extractSection(text, '🏗️ Repository Overview')

      expect(result).toContain('**Bold text**')
      expect(result).toContain('*Italic text*')
      expect(result).toContain('- List item')
      expect(result).toContain('`code`')
    })

    it('should handle sections without emoji', () => {
      const text = `## Repository Overview
Plain content
## Next`

      const result = reviewParser.extractSection(text, 'Repository Overview')

      expect(result).toBe('Plain content')
    })

    it('should handle empty text', () => {
      const result = reviewParser.extractSection('', 'Any Section')

      expect(result).toBe('No content available for this section.')
    })
  })
})
