import { describe, it, expect, vi, afterEach } from 'vitest'
import { lazyLoadRoute } from '../../../src/utils/router'

// Eager glob compiles to static imports; a template-literal import() would pull
// Vite's virtual dynamic-import helper into coverage and crash the HTML reporter.
const pageModules = import.meta.glob('../../../src/pages/*.vue', { eager: true })

const pages = [
  'Dashboard',
  'Setup',
  'Settings',
  'BulkCreate',
  'BulkBranch',
  'MergeRequestDetails',
  'RepositoryReview',
  'RepositoryReviewResults',
  'NotFound'
]

describe('lazyLoadRoute', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gives Vue Router only a lazy component, the one key it reads', () => {
    expect(lazyLoadRoute('pages/Dashboard.vue')).toEqual({
      component: expect.any(Function)
    })
  })

  it.each(pages)('lazily loads pages/%s.vue', async (page) => {
    const route = lazyLoadRoute(`pages/${page}.vue`)
    const expected = pageModules[`../../../src/pages/${page}.vue`]

    const loaded = await route.component()

    expect(loaded.default).toBe(expected.default)
  })

  it('throws for a page that is not in the component map', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => lazyLoadRoute('pages/Missing.vue')).toThrow(
      'Unknown component path: pages/Missing.vue'
    )
  })
})
