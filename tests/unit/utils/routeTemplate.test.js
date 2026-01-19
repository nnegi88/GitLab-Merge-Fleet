import { describe, it, expect, vi, beforeEach } from 'vitest'
import { routeTemplate, routeWithParamsTemplate, heavyRouteTemplate } from '../../../src/utils/routeTemplate.js'

// Mock the lazyLoadRoute function
vi.mock('../../../src/utils/router.js', () => ({
  lazyLoadRoute: vi.fn((componentPath, options = {}) => ({
    component: `mock-component-${componentPath}`,
    loadingComponent: 'mock-loading',
    errorComponent: 'mock-error',
    delay: options.delay || 200,
    timeout: options.timeout || 30000
  }))
}))

describe('routeTemplate', () => {
  describe('routeTemplate', () => {
    it('should have correct path', () => {
      expect(routeTemplate.path).toBe('/your-path')
    })

    it('should have correct name', () => {
      expect(routeTemplate.name).toBe('your-route-name')
    })

    it('should have meta with title', () => {
      expect(routeTemplate.meta).toBeDefined()
      expect(routeTemplate.meta.title).toBe('Your Page Title')
    })

    it('should include lazyLoadRoute properties', () => {
      expect(routeTemplate.component).toBeDefined()
      expect(routeTemplate.loadingComponent).toBeDefined()
      expect(routeTemplate.errorComponent).toBeDefined()
    })

    it('should use default delay value', () => {
      expect(routeTemplate.delay).toBe(200)
    })

    it('should use default timeout value', () => {
      expect(routeTemplate.timeout).toBe(30000)
    })

    it('should have all required route properties', () => {
      expect(routeTemplate).toHaveProperty('path')
      expect(routeTemplate).toHaveProperty('name')
      expect(routeTemplate).toHaveProperty('meta')
      expect(routeTemplate).toHaveProperty('component')
    })
  })

  describe('routeWithParamsTemplate', () => {
    it('should have correct path with parameter', () => {
      expect(routeWithParamsTemplate.path).toBe('/your-path/:id')
    })

    it('should have correct name', () => {
      expect(routeWithParamsTemplate.name).toBe('your-route-with-params')
    })

    it('should have meta with title', () => {
      expect(routeWithParamsTemplate.meta).toBeDefined()
      expect(routeWithParamsTemplate.meta.title).toBe('Your Page Title')
    })

    it('should include lazyLoadRoute properties', () => {
      expect(routeWithParamsTemplate.component).toBeDefined()
      expect(routeWithParamsTemplate.loadingComponent).toBeDefined()
      expect(routeWithParamsTemplate.errorComponent).toBeDefined()
    })

    it('should use default delay value', () => {
      expect(routeWithParamsTemplate.delay).toBe(200)
    })

    it('should use default timeout value', () => {
      expect(routeWithParamsTemplate.timeout).toBe(30000)
    })

    it('should have all required route properties', () => {
      expect(routeWithParamsTemplate).toHaveProperty('path')
      expect(routeWithParamsTemplate).toHaveProperty('name')
      expect(routeWithParamsTemplate).toHaveProperty('meta')
      expect(routeWithParamsTemplate).toHaveProperty('component')
    })

    it('should have path containing parameter placeholder', () => {
      expect(routeWithParamsTemplate.path).toContain(':id')
    })
  })

  describe('heavyRouteTemplate', () => {
    it('should have correct path', () => {
      expect(heavyRouteTemplate.path).toBe('/heavy-component')
    })

    it('should have correct name', () => {
      expect(heavyRouteTemplate.name).toBe('heavy-component')
    })

    it('should have meta with title', () => {
      expect(heavyRouteTemplate.meta).toBeDefined()
      expect(heavyRouteTemplate.meta.title).toBe('Heavy Component')
    })

    it('should include lazyLoadRoute properties', () => {
      expect(heavyRouteTemplate.component).toBeDefined()
      expect(heavyRouteTemplate.loadingComponent).toBeDefined()
      expect(heavyRouteTemplate.errorComponent).toBeDefined()
    })

    it('should use custom delay value of 500ms', () => {
      expect(heavyRouteTemplate.delay).toBe(500)
    })

    it('should use custom timeout value of 60000ms', () => {
      expect(heavyRouteTemplate.timeout).toBe(60000)
    })

    it('should have all required route properties', () => {
      expect(heavyRouteTemplate).toHaveProperty('path')
      expect(heavyRouteTemplate).toHaveProperty('name')
      expect(heavyRouteTemplate).toHaveProperty('meta')
      expect(heavyRouteTemplate).toHaveProperty('component')
    })

    it('should have longer timeout than default for heavy components', () => {
      expect(heavyRouteTemplate.timeout).toBeGreaterThan(30000)
    })

    it('should have longer delay than default for heavy components', () => {
      expect(heavyRouteTemplate.delay).toBeGreaterThan(200)
    })
  })

  describe('template structure consistency', () => {
    it('should ensure all templates have meta.title property', () => {
      const templates = [routeTemplate, routeWithParamsTemplate, heavyRouteTemplate]
      templates.forEach(template => {
        expect(template.meta).toBeDefined()
        expect(template.meta.title).toBeDefined()
        expect(typeof template.meta.title).toBe('string')
        expect(template.meta.title.length).toBeGreaterThan(0)
      })
    })

    it('should ensure all templates have required route properties', () => {
      const templates = [routeTemplate, routeWithParamsTemplate, heavyRouteTemplate]
      templates.forEach(template => {
        expect(template).toHaveProperty('path')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('meta')
        expect(template).toHaveProperty('component')
      })
    })

    it('should ensure all templates have timing configuration', () => {
      const templates = [routeTemplate, routeWithParamsTemplate, heavyRouteTemplate]
      templates.forEach(template => {
        expect(template).toHaveProperty('delay')
        expect(template).toHaveProperty('timeout')
        expect(typeof template.delay).toBe('number')
        expect(typeof template.timeout).toBe('number')
      })
    })

    it('should ensure all templates have loading and error components', () => {
      const templates = [routeTemplate, routeWithParamsTemplate, heavyRouteTemplate]
      templates.forEach(template => {
        expect(template).toHaveProperty('loadingComponent')
        expect(template).toHaveProperty('errorComponent')
      })
    })

    it('should ensure path is a non-empty string for all templates', () => {
      const templates = [routeTemplate, routeWithParamsTemplate, heavyRouteTemplate]
      templates.forEach(template => {
        expect(typeof template.path).toBe('string')
        expect(template.path.length).toBeGreaterThan(0)
        expect(template.path).toMatch(/^\//)
      })
    })

    it('should ensure name is a non-empty string for all templates', () => {
      const templates = [routeTemplate, routeWithParamsTemplate, heavyRouteTemplate]
      templates.forEach(template => {
        expect(typeof template.name).toBe('string')
        expect(template.name.length).toBeGreaterThan(0)
      })
    })
  })
})
