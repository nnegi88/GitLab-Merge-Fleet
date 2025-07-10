/**
 * Configuration for repository analysis
 * Centralized configuration to improve maintainability and extensibility
 * 
 * EXTENSION POINTS:
 * 1. Add new file extensions to FILE_EXTENSIONS sets
 * 2. Add new excluded paths to EXCLUDED_PATHS
 * 3. Add new languages to LANGUAGE_EXTENSIONS mapping
 * 4. Add new priority rules to FILE_PRIORITY_RULES
 * 5. Modify default options in DEFAULT_ANALYSIS_OPTIONS
 * 6. Add new content limits for analysis depths
 * 7. Add new language mappings for syntax highlighting
 */

// File extensions for different categories
// EXTENSION POINT: Add new file types by adding to these sets
export const FILE_EXTENSIONS = {
  CODE: new Set([
    // Web technologies
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.scss', '.sass', '.less',
    // Backend languages
    '.py', '.java', '.cs', '.rb', '.go', '.php', '.swift', '.kt', '.scala',
    // Systems languages
    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.rs', '.asm',
    // Functional languages
    '.hs', '.ml', '.fs', '.clj', '.lisp', '.elm',
    // Data & markup
    '.json', '.xml', '.yaml', '.yml', '.toml', '.sql',
    // Shell & scripting
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'
  ]),

  CONFIG: new Set([
    '.json', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config',
    '.env', '.properties', '.plist', '.xml'
  ]),

  DOCS: new Set([
    '.md', '.txt', '.rst', '.adoc', '.tex'
  ]),

  EXCLUDED: new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
    // Archives
    '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',
    // Binaries
    '.exe', '.dll', '.so', '.dylib', '.app', '.deb', '.rpm',
    // Fonts
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    // Media
    '.mp4', '.avi', '.mov', '.mp3', '.wav', '.ogg',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Large data
    '.db', '.sqlite', '.dump', '.backup'
  ])
}

// Paths to exclude from analysis
// EXTENSION POINT: Add new paths to exclude by adding to this set
export const EXCLUDED_PATHS = new Set([
  'node_modules', 'vendor', 'build', 'dist', 'target', 'bin', 'obj',
  '.git', '.svn', '.hg', '.vs', '.vscode', '.idea',
  'coverage', '__pycache__', '.pytest_cache', '.mypy_cache',
  'logs', 'tmp', 'temp', '.cache', '.nuxt', '.next'
])

// Language-to-extension mappings for syntax highlighting
// EXTENSION POINT: Add new programming languages by adding entries here
export const LANGUAGE_EXTENSIONS = {
  'JavaScript': ['.js', '.jsx'],
  'TypeScript': ['.ts', '.tsx'],
  'Vue': ['.vue'],
  'Python': ['.py'],
  'Java': ['.java'],
  'C#': ['.cs'],
  'Ruby': ['.rb'],
  'Go': ['.go'],
  'PHP': ['.php'],
  'Swift': ['.swift'],
  'Kotlin': ['.kt'],
  'Scala': ['.scala'],
  'C++': ['.cpp', '.cc', '.cxx'],
  'C': ['.c'],
  'Rust': ['.rs']
}

// Priority scoring for different file types
// EXTENSION POINT: Add new priority rules by adding to NAME_PATTERNS or PATH_PATTERNS arrays
export const FILE_PRIORITY_RULES = {
  // File name patterns (case-insensitive)
  NAME_PATTERNS: [
    { pattern: /index/i, score: 20 },
    { pattern: /main/i, score: 20 },
    { pattern: /app/i, score: 15 },
    { pattern: /server/i, score: 15 },
    { pattern: /config/i, score: 10 },
    { pattern: /setting/i, score: 10 },
    { pattern: /auth/i, score: 25 },
    { pattern: /security/i, score: 25 }
  ],

  // Path patterns
  PATH_PATTERNS: [
    { pattern: /\/api\//i, score: 15 },
    { pattern: /\/routes\//i, score: 15 },
    { pattern: /\/controllers\//i, score: 15 },
    { pattern: /\/middleware\//i, score: 12 },
    { pattern: /\/models\//i, score: 10 },
    { pattern: /\/services\//i, score: 10 },
    { pattern: /\/utils\//i, score: 8 },
    { pattern: /\/components\//i, score: 8 }
  ]
}

// Default analysis options
// EXTENSION POINT: Modify default settings or add new options here
export const DEFAULT_ANALYSIS_OPTIONS = {
  maxFiles: 100,
  maxFileSize: 100 * 1024, // 100KB
  includeConfig: true,
  includeDocs: false,
  customExtensions: [],
  customExclusions: [],
  batchSize: 10
}

// Content truncation limits for different depth levels
// EXTENSION POINT: Add new analysis depths or modify limits here
export const CONTENT_LIMITS = {
  quick: 20,
  standard: 50,
  deep: 100
}

// Extension-to-language mapping for syntax highlighting
// EXTENSION POINT: Add new language mappings for better syntax highlighting
export const EXTENSION_LANGUAGE_MAP = {
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