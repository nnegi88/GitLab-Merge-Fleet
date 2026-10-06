import { describe, it, expect } from 'vitest'
import { mountWithPlugins } from '../utils/testHelpers.js'
import MarkdownContent from '../../src/components/MarkdownContent.vue'

describe('MarkdownContent.vue', () => {
  const mountContent = (source, options = {}) => mountWithPlugins(MarkdownContent, {
    props: { source },
    ...options
  })

  it('should render markdown as HTML', () => {
    const wrapper = mountContent('## Summary\n\n- one\n- two')

    expect(wrapper.find('h2').text()).toBe('Summary')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('should show raw HTML from the source as text', () => {
    const wrapper = mountContent('<img src="x" onerror="alert(1)">')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('<img src="x" onerror="alert(1)">')
  })

  it('should drop the target of a javascript: link but keep its text', () => {
    const link = mountContent('[click](javascript:alert(1))').find('a')

    expect(link.attributes('href')).toBeUndefined()
    expect(link.text()).toBe('click')
  })

  it('should open web links in a new tab', () => {
    const link = mountContent('[docs](https://example.com)').find('a')

    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('should re-render when the source changes', async () => {
    const wrapper = mountContent('First review')

    await wrapper.setProps({ source: '**Second** review' })

    expect(wrapper.find('strong').text()).toBe('Second')
    expect(wrapper.text()).toBe('Second review')
  })

  it('should render nothing for an empty source', () => {
    expect(mountContent('').html()).toBe('<div></div>')
  })

  it('should pass a class through to its root element', () => {
    const wrapper = mountContent('Text', { attrs: { class: 'markdown-content' } })

    expect(wrapper.classes()).toContain('markdown-content')
  })
})
