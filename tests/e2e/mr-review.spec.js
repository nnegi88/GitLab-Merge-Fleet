import { test, expect } from '@playwright/test'

/**
 * E2E Tests for MR Details and AI Review
 *
 * Tests the complete merge request details and AI review flow including:
 * - MR details page rendering (title, author, branches, description, stats)
 * - Changes summary and file list display
 * - Recent comments display
 * - AI review trigger and loading state
 * - AI review results display (summary, full review)
 * - Markdown rendering (rendered vs raw view)
 * - Copy to clipboard functionality
 * - Post review as comment
 * - Error handling (no API key, review failures, network errors)
 */

test.describe('MR Details and AI Review', () => {
  // Mock user data for authentication
  const mockUser = {
    id: 123,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  // Mock merge request data
  const mockMergeRequest = {
    id: 1,
    iid: 10,
    project_id: 100,
    title: 'Add new authentication feature',
    description: 'This PR adds a new authentication feature using OAuth2.\n\nIncludes:\n- OAuth2 provider setup\n- Login flow\n- Token management',
    state: 'opened',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    web_url: 'https://gitlab.example.com/project/repo/-/merge_requests/10',
    source_branch: 'feature/oauth-auth',
    target_branch: 'main',
    author: {
      id: 123,
      username: 'testuser',
      name: 'Test User'
    },
    draft: false
  }

  // Mock MR changes
  const mockChanges = {
    changes: [
      {
        old_path: 'src/auth/oauth.js',
        new_path: 'src/auth/oauth.js',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
        diff: '@@ -0,0 +1,50 @@\n+export function setupOAuth() {\n+  // OAuth setup code\n+}\n+\n+export function login() {\n+  // Login code\n+}'
      },
      {
        old_path: null,
        new_path: 'src/auth/tokens.js',
        new_file: true,
        deleted_file: false,
        renamed_file: false,
        diff: '@@ -0,0 +1,20 @@\n+export function storeToken(token) {\n+  // Token storage\n+}'
      },
      {
        old_path: 'src/legacy/auth.js',
        new_path: null,
        new_file: false,
        deleted_file: true,
        renamed_file: false,
        diff: '@@ -1,10 +0,0 @@\n-// Old auth code\n-function oldAuth() {}'
      }
    ]
  }

  // Mock MR diff (full diff string)
  const mockDiff = `--- a/src/auth/oauth.js
+++ b/src/auth/oauth.js
@@ -0,0 +1,50 @@
+export function setupOAuth() {
+  // OAuth setup code
+}
+
+export function login() {
+  // Login code
+}

--- a/src/auth/tokens.js
+++ b/src/auth/tokens.js
@@ -0,0 +1,20 @@
+export function storeToken(token) {
+  // Token storage
+}`

  // Mock MR notes/comments
  const mockNotes = [
    {
      id: 1,
      body: 'Great work on the OAuth implementation!',
      author: {
        id: 456,
        username: 'reviewer1',
        name: 'Code Reviewer'
      },
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      body: 'Please add tests for the token management.',
      author: {
        id: 789,
        username: 'reviewer2',
        name: 'Another Reviewer'
      },
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  ]

  // Mock AI review response
  const mockAIReview = {
    summary: 'Overall good implementation with minor suggestions for improvement.',
    fullReview: `## Summary
Overall good implementation with minor suggestions for improvement.

## Code Quality
The code is well-structured and follows best practices. The OAuth implementation is clean and maintainable.

## Security Considerations
- Ensure tokens are stored securely with encryption
- Add rate limiting to prevent brute force attacks
- Validate all OAuth callbacks

## Performance
The implementation is efficient with no obvious performance concerns.

## Suggestions
1. Add unit tests for token management
2. Consider adding refresh token support
3. Add better error handling for OAuth failures

## Conclusion
Approve with minor suggestions. Great work!`
  }

  // Mock Gemini API response
  const mockGeminiResponse = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: mockAIReview.fullReview
            }
          ]
        }
      }
    ]
  }

  // Helper to setup authenticated state
  async function setupAuthenticatedState(page) {
    await page.goto('/')

    // Set up localStorage with auth data
    await page.evaluate(({ gitlabUrl, encryptedToken }) => {
      localStorage.setItem('auth-storage', JSON.stringify({
        gitlabUrl,
        encryptedToken,
        sessionOnly: false
      }))
    }, {
      gitlabUrl: 'https://gitlab.example.com',
      encryptedToken: {
        encrypted: 'encrypted-token-data',
        key: 'key-data',
        iv: 'iv-data'
      }
    })

    // Mock the GitLab API user endpoint
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })
  }

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should display MR details correctly', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/notes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotes)
      })
    })

    await page.goto('/#/mr/100/10')

    // Verify MR title
    await expect(page.locator('text=Add new authentication feature')).toBeVisible()

    // Verify author
    await expect(page.locator('text=Test User').first()).toBeVisible()

    // Verify status chip
    await expect(page.locator('.v-chip:has-text("opened")')).toBeVisible()

    // Verify branches
    await expect(page.locator('text=feature/oauth-auth')).toBeVisible()
    await expect(page.locator('text=main')).toBeVisible()

    // Verify description
    await expect(page.locator('text=This PR adds a new authentication feature using OAuth2.')).toBeVisible()

    // Verify "View in GitLab" button
    const gitlabLink = page.locator('a:has-text("View in GitLab")')
    await expect(gitlabLink).toBeVisible()
    await expect(gitlabLink).toHaveAttribute('href', mockMergeRequest.web_url)
    await expect(gitlabLink).toHaveAttribute('target', '_blank')
  })

  test('should display loading state while fetching MR details', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock slow API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.goto('/#/mr/100/10')

    // Verify loading state
    await expect(page.locator('.v-progress-circular')).toBeVisible()
    await expect(page.locator('text=Loading merge request details...')).toBeVisible()

    // Wait for content to load
    await expect(page.locator('text=Add new authentication feature')).toBeVisible({ timeout: 3000 })
  })

  test('should display error state when MR fails to load', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock failed API response
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Not Found',
          message: '404 Merge Request Not Found'
        })
      })
    })

    await page.goto('/#/mr/100/10')

    // Verify error state
    await expect(page.locator('.mdi-close-circle')).toBeVisible()
    await expect(page.locator('text=Back to Dashboard')).toBeVisible()

    // Click back to dashboard
    await page.locator('button:has-text("Back to Dashboard")').click()
    await expect(page).toHaveURL('/#/')
  })

  test('should display changes summary with correct stats', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.goto('/#/mr/100/10')

    // Wait for changes to load
    await expect(page.locator('text=Changes Summary')).toBeVisible()

    // Verify stats are displayed (calculated from diff)
    await expect(page.locator('text=Additions')).toBeVisible()
    await expect(page.locator('text=Deletions')).toBeVisible()
    await expect(page.locator('text=Files Changed')).toBeVisible()

    // Verify file count is correct (3 files)
    const filesChanged = page.locator('.text-h4').filter({ hasText: /^3$/ })
    await expect(filesChanged).toBeVisible()
  })

  test('should display modified files with correct badges', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.goto('/#/mr/100/10')

    // Wait for changes to load
    await expect(page.locator('text=Modified Files:')).toBeVisible()

    // Verify files are listed
    await expect(page.locator('text=src/auth/oauth.js')).toBeVisible()
    await expect(page.locator('text=src/auth/tokens.js')).toBeVisible()
    await expect(page.locator('text=src/legacy/auth.js')).toBeVisible()

    // Verify badges
    await expect(page.locator('.v-chip:has-text("new")')).toBeVisible()
    await expect(page.locator('.v-chip:has-text("deleted")')).toBeVisible()
  })

  test('should display recent comments', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/notes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotes)
      })
    })

    await page.goto('/#/mr/100/10')

    // Wait for comments section
    await expect(page.locator('text=Recent Comments')).toBeVisible()

    // Verify comments are displayed
    await expect(page.locator('text=Great work on the OAuth implementation!')).toBeVisible()
    await expect(page.locator('text=Please add tests for the token management.')).toBeVisible()

    // Verify comment authors
    await expect(page.locator('text=Code Reviewer')).toBeVisible()
    await expect(page.locator('text=Another Reviewer')).toBeVisible()
  })

  test('should show API key warning when Gemini key not configured', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.goto('/#/mr/100/10')

    // Verify AI Review section
    await expect(page.locator('text=AI Code Review')).toBeVisible()

    // Verify API key warning
    await expect(page.locator('text=Gemini API key not configured.')).toBeVisible()
    await expect(page.locator('a:has-text("Add it in Settings")')).toBeVisible()

    // Verify "Start AI Review" button is disabled
    const reviewButton = page.locator('button:has-text("Start AI Review")')
    await expect(reviewButton).toBeDisabled()
  })

  test('should successfully trigger AI review and display results', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key in localStorage
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock the diff endpoint for AI review
    await page.route('**/api/v4/projects/100/merge_requests/10/changes?access_raw_diffs=true', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: mockDiff
      })
    })

    // Mock Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    await page.goto('/#/mr/100/10')

    // Wait for page to load
    await expect(page.locator('text=AI Code Review')).toBeVisible()

    // Verify "Start AI Review" button is enabled
    const reviewButton = page.locator('button:has-text("Start AI Review")')
    await expect(reviewButton).not.toBeDisabled()

    // Click to start AI review
    await reviewButton.click()

    // Verify loading state
    await expect(page.locator('button:has-text("Analyzing...")')).toBeVisible()

    // Wait for review to complete
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })

    // Verify summary is displayed
    await expect(page.locator('text=Overall good implementation with minor suggestions for improvement.')).toBeVisible()

    // Verify full review is displayed (check for some content)
    await expect(page.locator('text=Code Quality')).toBeVisible()
    await expect(page.locator('text=Security Considerations')).toBeVisible()
    await expect(page.locator('text=Performance')).toBeVisible()
    await expect(page.locator('text=Suggestions')).toBeVisible()
  })

  test('should display AI review loading state', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock slow Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    await page.goto('/#/mr/100/10')

    // Click to start AI review
    const reviewButton = page.locator('button:has-text("Start AI Review")')
    await reviewButton.click()

    // Verify loading state
    await expect(page.locator('button:has-text("Analyzing...")')).toBeVisible()

    // Verify button is disabled during loading
    await expect(page.locator('button:has-text("Analyzing...")')).toBeDisabled()

    // Wait for review to complete
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })
  })

  test('should toggle between rendered and raw markdown view', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    await page.goto('/#/mr/100/10')

    // Trigger AI review
    await page.locator('button:has-text("Start AI Review")').click()
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })

    // Find toggle button
    const toggleButton = page.locator('button:has-text("Show Raw Markdown")')
    await expect(toggleButton).toBeVisible()

    // Click to show raw markdown
    await toggleButton.click()

    // Verify raw markdown is displayed (check for pre tag with raw content)
    const preElement = page.locator('pre.whitespace-pre-wrap')
    await expect(preElement).toBeVisible()
    await expect(preElement).toContainText('## Summary')

    // Click to show rendered view
    await page.locator('button:has-text("Show Rendered")').click()

    // Verify rendered markdown is displayed
    await expect(page.locator('.markdown-content')).toBeVisible()
  })

  test('should copy review to clipboard', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    await page.goto('/#/mr/100/10')

    // Trigger AI review
    await page.locator('button:has-text("Start AI Review")').click()
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })

    // Click copy button
    const copyButton = page.locator('button:has-text("Copy Markdown")')
    await expect(copyButton).toBeVisible()
    await copyButton.click()

    // Verify button text changes to "Copied!"
    await expect(page.locator('button:has-text("Copied!")')).toBeVisible()

    // Wait for button to reset (useClipboard has 2 second timeout)
    await expect(page.locator('button:has-text("Copy Markdown")')).toBeVisible({ timeout: 3000 })
  })

  test('should clear AI review', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    await page.goto('/#/mr/100/10')

    // Trigger AI review
    await page.locator('button:has-text("Start AI Review")').click()
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })

    // Click clear button
    const clearButton = page.locator('button:has-text("Clear Review")')
    await expect(clearButton).toBeVisible()
    await clearButton.click()

    // Verify review is cleared (summary should be hidden)
    await expect(page.locator('text=Review Summary')).not.toBeVisible()

    // Verify "Start AI Review" button is visible again
    await expect(page.locator('button:has-text("Start AI Review")')).toBeVisible()
  })

  test('should handle AI review API errors', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock Gemini API error
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Internal server error'
          }
        })
      })
    })

    await page.goto('/#/mr/100/10')

    // Trigger AI review
    await page.locator('button:has-text("Start AI Review")').click()

    // Wait for error to be displayed
    await expect(page.locator('.v-alert--type-error')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=AI Review failed')).toBeVisible()

    // Verify "Start AI Review" button is enabled again
    await expect(page.locator('button:has-text("Start AI Review")')).not.toBeDisabled()
  })

  test('should post AI review as comment', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    // Mock the post comment endpoint
    let commentPosted = false
    await page.route('**/api/v4/projects/100/merge_requests/10/notes', async route => {
      if (route.request().method() === 'POST') {
        commentPosted = true
        const postData = route.request().postDataJSON()
        expect(postData.body).toContain('🤖 AI Code Review')
        expect(postData.body).toContain('Generated by GitLab Merge Fleet AI Assistant')

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 999,
            body: postData.body,
            author: mockUser
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      }
    })

    await page.goto('/#/mr/100/10')

    // Trigger AI review
    await page.locator('button:has-text("Start AI Review")').click()
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })

    // Click "Post as Comment" button
    const postButton = page.locator('button:has-text("Post as Comment")')
    await expect(postButton).toBeVisible()

    // Listen for the alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('AI review posted as comment successfully')
      await dialog.accept()
    })

    await postButton.click()

    // Wait a bit for the POST request to complete
    await page.waitForTimeout(500)

    // Verify comment was posted
    expect(commentPosted).toBe(true)
  })

  test('should handle post comment errors', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Set Gemini API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-gemini-api-key')
    })

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    // Mock Gemini API response
    await page.route('**/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeminiResponse)
      })
    })

    // Mock failed post comment endpoint
    await page.route('**/api/v4/projects/100/merge_requests/10/notes', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Forbidden',
            message: 'You do not have permission to post comments'
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      }
    })

    await page.goto('/#/mr/100/10')

    // Trigger AI review
    await page.locator('button:has-text("Start AI Review")').click()
    await expect(page.locator('text=Review Summary')).toBeVisible({ timeout: 5000 })

    // Listen for the alert dialog with error
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Failed to post comment')
      await dialog.accept()
    })

    // Click "Post as Comment" button
    await page.locator('button:has-text("Post as Comment")').click()

    // Wait for error alert
    await page.waitForTimeout(500)
  })

  test('should navigate to Settings when clicking "Add it in Settings" link', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock GitLab API responses
    await page.route('**/api/v4/projects/100/merge_requests/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequest)
      })
    })

    await page.route('**/api/v4/projects/100/merge_requests/10/changes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChanges)
      })
    })

    await page.goto('/#/mr/100/10')

    // Wait for page to load
    await expect(page.locator('text=Gemini API key not configured.')).toBeVisible()

    // Click the Settings link
    const settingsLink = page.locator('a:has-text("Add it in Settings")')
    await expect(settingsLink).toBeVisible()
    await settingsLink.click()

    // Verify navigation to Settings page
    await expect(page).toHaveURL('/#/settings')
  })
})
