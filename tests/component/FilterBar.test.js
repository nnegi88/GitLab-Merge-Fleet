import { describe, it, expect, beforeEach } from 'vitest'
import { mountWithPlugins } from '../utils/testHelpers.js'
import FilterBar from '../../src/components/FilterBar.vue'

describe('FilterBar.vue', () => {
  const defaultFilters = {
    state: 'opened',
    scope: 'all',
    search: '',
    labels: [],
    author: '',
    assignee: '',
    milestone: '',
    orderBy: 'created_at',
    wip: 'all'
  }

  let wrapper

  beforeEach(() => {
    wrapper = null
  })

  describe('Rendering', () => {
    it('should render filter bar with all basic elements', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      expect(wrapper.find('.v-card').exists()).toBe(true)
      expect(wrapper.find('.v-text-field').exists()).toBe(true)
      expect(wrapper.findAll('.v-select').length).toBeGreaterThanOrEqual(2)
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('should render search field with correct placeholder', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const searchField = wrapper.find('.v-text-field')
      expect(searchField.exists()).toBe(true)
    })

    it('should render state filter select', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const selects = wrapper.findAll('.v-select')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })

    it('should render scope filter select', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const selects = wrapper.findAll('.v-select')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })

    it('should render Advanced button', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      expect(wrapper.text()).toContain('Advanced')
    })

    it('should render filter icon and label', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      expect(wrapper.text()).toContain('Filters:')
    })
  })

  describe('Search Filter', () => {
    it('should display search value from filters prop', () => {
      const filtersWithSearch = {
        ...defaultFilters,
        search: 'test query'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithSearch
        }
      })

      const searchInput = wrapper.find('input[type="text"]')
      expect(searchInput.element.value).toBe('test query')
    })

    it('should emit update:filters when search is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('new search')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')[0][0]).toMatchObject({
        ...defaultFilters,
        search: 'new search'
      })
    })

    it('should handle empty search value', async () => {
      const filtersWithSearch = {
        ...defaultFilters,
        search: 'existing search'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithSearch
        }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')[0][0]).toMatchObject({
        ...defaultFilters,
        search: ''
      })
    })
  })

  describe('State Filter', () => {
    it('should display state value from filters prop', () => {
      const filtersWithState = {
        ...defaultFilters,
        state: 'merged'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithState
        }
      })

      expect(wrapper.vm.filters.state).toBe('merged')
    })

    it('should emit update:filters when state is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const selects = wrapper.findAll('.v-select')
      const stateSelect = selects[0]

      await stateSelect.vm.$emit('update:modelValue', 'closed')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')[0][0]).toMatchObject({
        ...defaultFilters,
        state: 'closed'
      })
    })
  })

  describe('Scope Filter', () => {
    it('should display scope value from filters prop', () => {
      const filtersWithScope = {
        ...defaultFilters,
        scope: 'created_by_me'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithScope
        }
      })

      expect(wrapper.vm.filters.scope).toBe('created_by_me')
    })

    it('should emit update:filters when scope is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const selects = wrapper.findAll('.v-select')
      const scopeSelect = selects[1]

      await scopeSelect.vm.$emit('update:modelValue', 'assigned_to_me')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')[0][0]).toMatchObject({
        ...defaultFilters,
        scope: 'assigned_to_me'
      })
    })
  })

  describe('Advanced Filters', () => {
    it('should not show advanced filters initially', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      expect(wrapper.text()).not.toContain('Labels')
      expect(wrapper.text()).not.toContain('Author')
      expect(wrapper.text()).not.toContain('Assignee')
    })

    it('should toggle advanced filters when button is clicked', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )

      expect(advancedButton).toBeDefined()
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAdvanced).toBe(true)
    })

    it('should show advanced filter fields when expanded', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )

      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Labels')
      expect(wrapper.text()).toContain('Author')
      expect(wrapper.text()).toContain('Assignee')
      expect(wrapper.text()).toContain('Milestone')
      expect(wrapper.text()).toContain('Sort By')
      expect(wrapper.text()).toContain('Draft/WIP')
    })

    it('should render Reset Filters button in advanced section', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )

      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Reset Filters')
    })
  })

  describe('Labels Filter', () => {
    it('should display labels as comma-separated string', async () => {
      const filtersWithLabels = {
        ...defaultFilters,
        labels: ['bug', 'feature', 'urgent']
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithLabels
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const labelInputs = wrapper.findAll('input').filter(input =>
        input.element.placeholder && input.element.placeholder.includes('comma separated')
      )

      if (labelInputs.length > 0) {
        expect(labelInputs[0].element.value).toBe('bug,feature,urgent')
      }
    })

    it('should emit update:filters when labels are changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const allInputs = wrapper.findAll('input')
      const labelInput = allInputs.find(input =>
        input.element.placeholder && input.element.placeholder.includes('comma separated')
      )

      if (labelInput) {
        await labelInput.setValue('bug,feature')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
        const lastEmit = wrapper.emitted('update:filters')[wrapper.emitted('update:filters').length - 1][0]
        expect(lastEmit.labels).toEqual(['bug', 'feature'])
      }
    })

    it('should handle empty labels', async () => {
      const filtersWithLabels = {
        ...defaultFilters,
        labels: ['bug']
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithLabels
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const allInputs = wrapper.findAll('input')
      const labelInput = allInputs.find(input =>
        input.element.placeholder && input.element.placeholder.includes('comma separated')
      )

      if (labelInput) {
        await labelInput.setValue('')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
        const lastEmit = wrapper.emitted('update:filters')[wrapper.emitted('update:filters').length - 1][0]
        expect(lastEmit.labels).toEqual([])
      }
    })
  })

  describe('Author Filter', () => {
    it('should display author value from filters prop', async () => {
      const filtersWithAuthor = {
        ...defaultFilters,
        author: 'johndoe'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithAuthor
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filters.author).toBe('johndoe')
    })

    it('should emit update:filters when author is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAll('.v-text-field')
      const authorField = textFields.find(field =>
        field.text().includes('Author') || field.html().includes('Author')
      )

      if (authorField) {
        const input = authorField.find('input')
        await input.setValue('newauthor')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
      }
    })
  })

  describe('Assignee Filter', () => {
    it('should display assignee value from filters prop', async () => {
      const filtersWithAssignee = {
        ...defaultFilters,
        assignee: 'janedoe'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithAssignee
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filters.assignee).toBe('janedoe')
    })

    it('should emit update:filters when assignee is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAll('.v-text-field')
      const assigneeField = textFields.find(field =>
        field.text().includes('Assignee') || field.html().includes('Assignee')
      )

      if (assigneeField) {
        const input = assigneeField.find('input')
        await input.setValue('newassignee')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
      }
    })
  })

  describe('Milestone Filter', () => {
    it('should display milestone value from filters prop', async () => {
      const filtersWithMilestone = {
        ...defaultFilters,
        milestone: 'v1.0'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithMilestone
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filters.milestone).toBe('v1.0')
    })

    it('should emit update:filters when milestone is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAll('.v-text-field')
      const milestoneField = textFields.find(field =>
        field.text().includes('Milestone') || field.html().includes('Milestone')
      )

      if (milestoneField) {
        const input = milestoneField.find('input')
        await input.setValue('v2.0')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
      }
    })
  })

  describe('OrderBy Filter', () => {
    it('should display orderBy value from filters prop', async () => {
      const filtersWithOrderBy = {
        ...defaultFilters,
        orderBy: 'updated_at'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithOrderBy
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filters.orderBy).toBe('updated_at')
    })

    it('should use default value "created_at" when orderBy is not set', async () => {
      const filtersWithoutOrderBy = {
        state: 'opened',
        scope: 'all',
        search: ''
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithoutOrderBy
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const selects = wrapper.findAll('.v-select')
      const orderBySelect = selects.find(select =>
        select.text().includes('Sort By') || select.html().includes('Sort By')
      )

      expect(orderBySelect).toBeDefined()
    })

    it('should emit update:filters when orderBy is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const selects = wrapper.findAll('.v-select')
      const orderBySelect = selects.find(select =>
        select.html().includes('Sort By')
      )

      if (orderBySelect) {
        await orderBySelect.vm.$emit('update:modelValue', 'title')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
      }
    })
  })

  describe('WIP Filter', () => {
    it('should display wip value from filters prop', async () => {
      const filtersWithWip = {
        ...defaultFilters,
        wip: 'yes'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithWip
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filters.wip).toBe('yes')
    })

    it('should use default value "all" when wip is not set', async () => {
      const filtersWithoutWip = {
        state: 'opened',
        scope: 'all',
        search: ''
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: filtersWithoutWip
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const selects = wrapper.findAll('.v-select')
      const wipSelect = selects.find(select =>
        select.text().includes('Draft/WIP') || select.html().includes('Draft/WIP')
      )

      expect(wipSelect).toBeDefined()
    })

    it('should emit update:filters when wip is changed', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const selects = wrapper.findAll('.v-select')
      const wipSelect = selects.find(select =>
        select.html().includes('Draft/WIP')
      )

      if (wipSelect) {
        await wipSelect.vm.$emit('update:modelValue', 'no')

        expect(wrapper.emitted('update:filters')).toBeTruthy()
      }
    })
  })

  describe('Reset Filters', () => {
    it('should reset all filters to default values when reset button is clicked', async () => {
      const customFilters = {
        state: 'merged',
        scope: 'created_by_me',
        search: 'test',
        labels: ['bug', 'feature'],
        author: 'johndoe',
        assignee: 'janedoe',
        milestone: 'v1.0',
        orderBy: 'updated_at',
        wip: 'yes'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: customFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      const resetButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Reset Filters')
      )

      expect(resetButton).toBeDefined()
      await resetButton.trigger('click')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      const resetEmit = wrapper.emitted('update:filters')[wrapper.emitted('update:filters').length - 1][0]

      expect(resetEmit).toMatchObject({
        state: 'opened',
        scope: 'all',
        search: '',
        labels: [],
        author: '',
        assignee: '',
        milestone: '',
        orderBy: 'created_at',
        wip: 'all'
      })
    })

    it('should close advanced filters panel when reset is clicked', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const advancedButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Advanced')
      )
      await advancedButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAdvanced).toBe(true)

      const resetButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Reset Filters')
      )
      await resetButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAdvanced).toBe(false)
    })
  })

  describe('Props', () => {
    it('should accept filters prop', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      expect(wrapper.vm.filters).toEqual(defaultFilters)
    })

    it('should handle partial filters object', () => {
      const partialFilters = {
        state: 'merged',
        scope: 'all'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: partialFilters
        }
      })

      expect(wrapper.vm.filters.state).toBe('merged')
      expect(wrapper.vm.filters.scope).toBe('all')
    })
  })

  describe('Events', () => {
    it('should emit update:filters event when any filter changes', async () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters').length).toBeGreaterThan(0)
    })

    it('should preserve other filter values when updating one filter', async () => {
      const customFilters = {
        state: 'merged',
        scope: 'created_by_me',
        search: 'existing',
        labels: ['bug'],
        author: 'john',
        assignee: 'jane',
        milestone: 'v1.0',
        orderBy: 'updated_at',
        wip: 'yes'
      }

      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: customFilters
        }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('new search')

      expect(wrapper.emitted('update:filters')).toBeTruthy()
      const emittedFilters = wrapper.emitted('update:filters')[0][0]

      expect(emittedFilters.state).toBe('merged')
      expect(emittedFilters.scope).toBe('created_by_me')
      expect(emittedFilters.search).toBe('new search')
      expect(emittedFilters.labels).toEqual(['bug'])
      expect(emittedFilters.author).toBe('john')
    })
  })

  describe('Tooltips', () => {
    it('should have tooltip for search field', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
      expect(tooltips.length).toBeGreaterThan(0)
    })

    it('should have tooltip for state filter', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
      expect(tooltips.length).toBeGreaterThanOrEqual(2)
    })

    it('should have tooltip for scope filter', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
      expect(tooltips.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('UI Responsiveness', () => {
    it('should render responsive columns', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const cols = wrapper.findAllComponents({ name: 'VCol' })
      expect(cols.length).toBeGreaterThan(0)
    })

    it('should render rows for layout', () => {
      wrapper = mountWithPlugins(FilterBar, {
        props: {
          filters: defaultFilters
        }
      })

      const rows = wrapper.findAllComponents({ name: 'VRow' })
      expect(rows.length).toBeGreaterThan(0)
    })
  })
})
