# Extension Points Documentation

This document outlines all the extension points in the GitLab Merge Fleet codebase that facilitate future enhancements and customizations.

## Architecture Overview

The codebase has been refactored for modularity with clear separation of concerns:

- **Configuration Layer**: Centralized configuration in `src/config/`
- **Service Layer**: Modular services in `src/services/`
- **Utility Layer**: Core utilities in `src/utils/`
- **API Layer**: External integrations in `src/api/`

## Extension Points by Category

### 1. Configuration Extensions (`src/config/analysis.js`)

#### File Type Configuration
- **`FILE_EXTENSIONS`**: Add support for new file types
  ```javascript
  // Add new code extensions
  FILE_EXTENSIONS.CODE.add('.elm')
  FILE_EXTENSIONS.CODE.add('.dart')
  
  // Add new config file types
  FILE_EXTENSIONS.CONFIG.add('.tfvars')
  ```

#### Path Exclusion
- **`EXCLUDED_PATHS`**: Add new paths to exclude from analysis
  ```javascript
  EXCLUDED_PATHS.add('terraform')
  EXCLUDED_PATHS.add('ansible')
  ```

#### Language Support
- **`LANGUAGE_EXTENSIONS`**: Add new programming languages
  ```javascript
  LANGUAGE_EXTENSIONS['Dart'] = ['.dart']
  LANGUAGE_EXTENSIONS['Elm'] = ['.elm']
  ```

#### Priority Rules
- **`FILE_PRIORITY_RULES`**: Add custom file prioritization logic
  ```javascript
  // Add new name patterns
  FILE_PRIORITY_RULES.NAME_PATTERNS.push({
    pattern: /test/i,
    score: 5
  })
  
  // Add new path patterns
  FILE_PRIORITY_RULES.PATH_PATTERNS.push({
    pattern: /\/tests\//i,
    score: 8
  })
  ```

#### Analysis Options
- **`DEFAULT_ANALYSIS_OPTIONS`**: Modify default behavior
  ```javascript
  DEFAULT_ANALYSIS_OPTIONS.maxFiles = 200
  DEFAULT_ANALYSIS_OPTIONS.includeTests = true
  ```

### 2. File Analysis Service Extensions (`src/services/fileAnalysis.js`)

#### Custom File Filtering
```javascript
class CustomFileAnalysisService extends FileAnalysisService {
  filterFiles(tree) {
    // Custom filtering logic
    const baseFiltered = super.filterFiles(tree)
    return baseFiltered.filter(file => this.customCriteria(file))
  }
  
  customCriteria(file) {
    // Implement custom filtering criteria
    return !file.path.includes('legacy/')
  }
}
```

#### Custom Priority Algorithms
```javascript
class AIBasedFileAnalysisService extends FileAnalysisService {
  async prioritizeFiles(files, languages) {
    // Use AI to determine file importance
    const aiPriorities = await this.getAIPriorities(files)
    return this.mergePriorities(files, aiPriorities)
  }
}
```

#### Custom Selection Strategies
```javascript
class BalancedFileAnalysisService extends FileAnalysisService {
  selectFiles(prioritizedFiles) {
    // Ensure balanced selection across file types
    return this.balanceByFileType(prioritizedFiles, this.options.maxFiles)
  }
}
```

### 3. Prompt Builder Extensions (`src/services/promptBuilder.js`)

#### Custom Review Types
```javascript
class SecurityPromptBuilderService extends PromptBuilderService {
  buildSecurityPrompt(repositoryData, files, options = {}) {
    // Security-focused prompt generation
    return this.buildCustomPrompt(repositoryData, files, {
      ...options,
      focus: 'security',
      securityFrameworks: ['OWASP', 'CWE'],
      complianceStandards: ['SOC2', 'PCI-DSS']
    })
  }
}
```

#### Template-Based Prompts
```javascript
class TemplatePromptBuilderService extends PromptBuilderService {
  constructor(templateEngine) {
    super()
    this.templates = templateEngine
  }
  
  buildRepositoryPrompt(repositoryData, files, options) {
    return this.templates.render('repository-review', {
      repository: repositoryData,
      files: files,
      options: options
    })
  }
}
```

### 4. Review Parser Extensions (`src/services/reviewParser.js`)

#### Custom Response Formats
```javascript
class JSONReviewParserService extends ReviewParserService {
  parseRepositoryReview(reviewText) {
    try {
      // Parse JSON response format
      const jsonReview = JSON.parse(reviewText)
      return this.normalizeJSONReview(jsonReview)
    } catch (error) {
      // Fallback to markdown parsing
      return super.parseRepositoryReview(reviewText)
    }
  }
}
```

#### Custom Validation
```javascript
class ValidatingReviewParserService extends ReviewParserService {
  parseRepositoryReview(reviewText) {
    const parsed = super.parseRepositoryReview(reviewText)
    return this.validateAndEnhance(parsed)
  }
  
  validateAndEnhance(parsed) {
    // Add validation logic
    // Enhance with additional metadata
    return {
      ...parsed,
      validationStatus: this.validateSections(parsed.sections),
      confidence: this.calculateConfidence(parsed)
    }
  }
}
```

### 5. Repository Analyzer Extensions (`src/utils/repositoryAnalyzer.js`)

#### Custom Analysis Workflows
```javascript
class MLRepositoryAnalyzer extends RepositoryAnalyzer {
  async analyzeRepository(projectId, ref, progressCallback) {
    // Add ML-based analysis phase
    const baseAnalysis = await super.analyzeRepository(projectId, ref, progressCallback)
    
    if (progressCallback) {
      progressCallback({ phase: 'ml-analysis', message: 'Running ML analysis...' })
    }
    
    const mlInsights = await this.runMLAnalysis(baseAnalysis.files)
    
    return {
      ...baseAnalysis,
      mlInsights
    }
  }
}
```

#### Custom File Content Fetching
```javascript
class CachingRepositoryAnalyzer extends RepositoryAnalyzer {
  async fetchFileContents(projectId, files, ref, progressCallback) {
    // Check cache first
    const cached = this.getCachedContents(projectId, ref, files)
    const uncached = files.filter(f => !cached.has(f.path))
    
    if (uncached.length === 0) {
      return Array.from(cached.values())
    }
    
    // Fetch only uncached files
    const fetched = await super.fetchFileContents(projectId, uncached, ref, progressCallback)
    
    // Update cache
    this.updateCache(projectId, ref, fetched)
    
    return [...Array.from(cached.values()), ...fetched]
  }
}
```

### 6. AI API Extensions (`src/api/gemini.js`)

#### Multiple AI Provider Support
```javascript
class MultiProviderAIService extends GeminiAPI {
  constructor(providers = {}) {
    super()
    this.providers = {
      gemini: this,
      openai: providers.openai,
      anthropic: providers.anthropic
    }
    this.primaryProvider = 'gemini'
  }
  
  async generateContent(prompt) {
    try {
      return await this.providers[this.primaryProvider].generateContent(prompt)
    } catch (error) {
      // Fallback to secondary provider
      return await this.providers.openai.generateContent(prompt)
    }
  }
}
```

#### Custom Error Handling
```javascript
class ResilientGeminiAPI extends GeminiAPI {
  async generateContent(prompt) {
    const maxRetries = 3
    let attempt = 0
    
    while (attempt < maxRetries) {
      try {
        return await super.generateContent(prompt)
      } catch (error) {
        attempt++
        if (this.isRetryableError(error) && attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
          continue
        }
        throw error
      }
    }
  }
}
```

### 7. Hook System Extensions

#### Analysis Hooks
```javascript
class HookableRepositoryAnalyzer extends RepositoryAnalyzer {
  constructor(options, fileAnalysisService, hooks = {}) {
    super(options, fileAnalysisService)
    this.hooks = hooks
  }
  
  async analyzeRepository(projectId, ref, progressCallback) {
    // Pre-analysis hook
    if (this.hooks.beforeAnalysis) {
      await this.hooks.beforeAnalysis(projectId, ref)
    }
    
    const result = await super.analyzeRepository(projectId, ref, progressCallback)
    
    // Post-analysis hook
    if (this.hooks.afterAnalysis) {
      await this.hooks.afterAnalysis(result)
    }
    
    return result
  }
}
```

## Usage Examples

### Basic Extension
```javascript
// Extend file analysis for a specific project type
class ReactProjectAnalyzer extends FileAnalysisService {
  prioritizeFiles(files, languages) {
    const prioritized = super.prioritizeFiles(files, languages)
    
    // Boost priority for React-specific files
    return prioritized.map(file => {
      if (file.path.includes('components/') || file.path.includes('hooks/')) {
        file.priority += 10
      }
      return file
    })
  }
}

// Use the custom analyzer
const customAnalyzer = new RepositoryAnalyzer({}, new ReactProjectAnalyzer())
```

### Advanced Extension with Multiple Services
```javascript
// Security-focused analysis setup
const securityPromptBuilder = new SecurityPromptBuilderService()
const validatingParser = new ValidatingReviewParserService()
const securityAI = new GeminiAPI(securityPromptBuilder, validatingParser)

const securityFileAnalysis = new SecurityFileAnalysisService({
  includeConfig: true,
  includeDocs: true,
  maxFiles: 50
})

const securityAnalyzer = new RepositoryAnalyzer({
  maxFiles: 50,
  focus: 'security'
}, securityFileAnalysis)
```

## Best Practices

1. **Backward Compatibility**: Always call super methods when overriding
2. **Error Handling**: Implement proper error handling in custom extensions
3. **Configuration**: Use configuration objects to make extensions configurable
4. **Documentation**: Document custom extensions and their behavior
5. **Testing**: Write tests for custom extensions
6. **Performance**: Consider performance implications of custom logic
7. **Validation**: Validate inputs and outputs in custom services

## Future Enhancement Areas

1. **Plugin System**: Implement a formal plugin architecture
2. **Event System**: Add event-driven architecture for loose coupling
3. **Configuration Management**: Add dynamic configuration loading
4. **Metrics Collection**: Add built-in metrics and monitoring
5. **Caching Layer**: Implement sophisticated caching strategies
6. **Batch Processing**: Add support for batch analysis operations
7. **Real-time Analysis**: Add real-time analysis capabilities

This extension system provides the foundation for adding new features like:
- Branch comparison analysis
- Commit/tag analysis
- Advanced UX features
- Integration with other tools
- Custom reporting formats
- Automated quality gates
- CI/CD integration