import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithPlugins } from '../../utils/testHelpers.js'
import Dashboard from '../../../src/pages/Dashboard.vue'
import { useAuthStore } from '../../../src/stores/authStore.js'
import gitlabAPI from '../../../src/api/gitlab.js'

// Mock the gitlab API
vi.mock('../../../src/api/gitlab.js', () => ({
  default: {
    getMergeRequests: vi.fn(() => Promise.resolve([]))
  }
}))

describe('Dashboard.vue', () => {
  let wrapper
  let authStore

  beforeEach(() => {
    wrapper = null
    vi.clearAllMocks()
  })

  describe('Not Connected State', () => {
    it('should render "Not Connected" message when no token', () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = null

      expect(wrapper.text()).toContain('Not Connected')
      expect(wrapper.text()).toContain('Please connect to GitLab first.')
    })

    it('should render "Connect to GitLab" button when not connected', () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = null

      expect(wrapper.text()).toContain('Connect to GitLab')
    })

    it('should have link to setup page when not connected', () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = null

      const button = wrapper.find('a[href="/setup"]')
      expect(button.exists()).toBe(true)
    })
  })

  describe('Connected State', () => {
    beforeEach(() => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])
    })

    it('should render dashboard when user is connected', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.v-card').exists()).toBe(true)
    })

    it('should render page title', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Merge Requests')
    })

    it('should render action buttons when connected', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Bulk Create Branches')
      expect(wrapper.text()).toContain('Bulk Create MRs')
      expect(wrapper.text()).toContain('Repository Review')
      expect(wrapper.text()).toContain('Refresh')
    })
  })

  describe('Welcome Guidance', () => {
    beforeEach(() => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])
    })

    it('should show welcome guidance when no merge requests', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Welcome to GitLab Merge Fleet!')
    })

    it('should show feature guidance in welcome message', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Bulk Create Branches')
      expect(wrapper.text()).toContain('Bulk Create MRs')
      expect(wrapper.text()).toContain('code analysis and recommendations')
    })

    it('should not show welcome guidance when merge requests exist', async () => {
      const mockMRs = [
        {
          id: 1,
          iid: 42,
          project_id: 100,
          title: 'Test MR',
          source_branch: 'feature/test',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test',
          author: { username: 'testuser' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!42' },
          draft: false,
          work_in_progress: false,
          approvals_required: 0
        }
      ]

      gitlabAPI.getMergeRequests.mockResolvedValue(mockMRs)

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).not.toContain('Welcome to GitLab Merge Fleet!')
    })
  })

  describe('Stats Cards', () => {
    beforeEach(() => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])
    })

    it('should render stats cards', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Total Open')
      expect(wrapper.text()).toContain('Draft')
      expect(wrapper.text()).toContain('Approved')
    })

    it('should show correct total count', async () => {
      const mockMRs = [
        {
          id: 1,
          iid: 1,
          project_id: 100,
          title: 'MR 1',
          source_branch: 'feature/1',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/1',
          author: { username: 'user1' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!1' },
          draft: false,
          work_in_progress: false,
          approvals_required: 0
        },
        {
          id: 2,
          iid: 2,
          project_id: 100,
          title: 'MR 2',
          source_branch: 'feature/2',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/2',
          author: { username: 'user2' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!2' },
          draft: false,
          work_in_progress: false,
          approvals_required: 0
        }
      ]

      gitlabAPI.getMergeRequests.mockResolvedValue(mockMRs)

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.stats.total).toBe(2)
    })

    it('should calculate draft count correctly', async () => {
      const mockMRs = [
        {
          id: 1,
          iid: 1,
          project_id: 100,
          title: 'Draft MR',
          source_branch: 'feature/1',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/1',
          author: { username: 'user1' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!1' },
          draft: true,
          work_in_progress: false,
          approvals_required: 0
        },
        {
          id: 2,
          iid: 2,
          project_id: 100,
          title: 'WIP MR',
          source_branch: 'feature/2',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/2',
          author: { username: 'user2' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!2' },
          draft: false,
          work_in_progress: true,
          approvals_required: 0
        },
        {
          id: 3,
          iid: 3,
          project_id: 100,
          title: 'Regular MR',
          source_branch: 'feature/3',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/3',
          author: { username: 'user3' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!3' },
          draft: false,
          work_in_progress: false,
          approvals_required: 0
        }
      ]

      gitlabAPI.getMergeRequests.mockResolvedValue(mockMRs)

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.stats.draft).toBe(2)
    })

    it('should calculate approved count correctly', async () => {
      const mockMRs = [
        {
          id: 1,
          iid: 1,
          project_id: 100,
          title: 'Approved MR',
          source_branch: 'feature/1',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/1',
          author: { username: 'user1' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!1' },
          draft: false,
          work_in_progress: false,
          approvals_required: 2,
          approved_by: [
            { username: 'reviewer1' },
            { username: 'reviewer2' }
          ]
        },
        {
          id: 2,
          iid: 2,
          project_id: 100,
          title: 'Not Approved MR',
          source_branch: 'feature/2',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test/2',
          author: { username: 'user2' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!2' },
          draft: false,
          work_in_progress: false,
          approvals_required: 2,
          approved_by: [
            { username: 'reviewer1' }
          ]
        }
      ]

      gitlabAPI.getMergeRequests.mockResolvedValue(mockMRs)

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.stats.approved).toBe(1)
    })
  })

  describe('Filter Bar', () => {
    beforeEach(() => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])
    })

    it('should render filter bar component', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent({ name: 'FilterBar' }).exists()).toBe(true)
    })

    it('should initialize filters with default values', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filters).toMatchObject({
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
  })

  describe('Merge Request List', () => {
    it('should render MergeRequestList component when connected', async () => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const mrListComponent = wrapper.findAllComponents({ name: 'VCard' })
      expect(mrListComponent.length).toBeGreaterThan(0)
    })

    it('should pass merge requests to MergeRequestList', async () => {
      const mockMRs = [
        {
          id: 1,
          iid: 42,
          project_id: 100,
          title: 'Test MR',
          source_branch: 'feature/test',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test',
          author: { username: 'testuser' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!42' },
          draft: false,
          work_in_progress: false,
          approvals_required: 0
        }
      ]

      gitlabAPI.getMergeRequests.mockResolvedValue(mockMRs)

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Test MR')
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when fetching data', async () => {
      gitlabAPI.getMergeRequests.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 1000))
      )

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
    })
  })

  describe('Error State', () => {
    it('should show error message when API fails', async () => {
      const errorMessage = 'Failed to fetch merge requests'
      gitlabAPI.getMergeRequests.mockRejectedValue(new Error(errorMessage))

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Error loading merge requests')
    })

    it('should show "Try Again" button on error', async () => {
      gitlabAPI.getMergeRequests.mockRejectedValue(new Error('API Error'))

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Try Again')
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])
    })

    it('should have link to bulk branch page', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      const bulkBranchLink = wrapper.find('a[href="/bulk-branch"]')
      expect(bulkBranchLink.exists()).toBe(true)
    })

    it('should have link to bulk create page', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      const bulkCreateLink = wrapper.find('a[href="/bulk-create"]')
      expect(bulkCreateLink.exists()).toBe(true)
    })

    it('should have link to repository review page', async () => {
      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      const repoReviewLink = wrapper.find('a[href="/repository-review"]')
      expect(repoReviewLink.exists()).toBe(true)
    })
  })

  describe('Refresh Functionality', () => {
    it('should call refetch when refresh button is clicked', async () => {
      gitlabAPI.getMergeRequests.mockResolvedValue([])

      wrapper = mountWithPlugins(Dashboard, {
        withVueQuery: true
      })

      authStore = useAuthStore()
      authStore.token = 'test-token'
      await wrapper.vm.$nextTick()

      const refreshButtons = wrapper.findAll('button').filter(btn =>
        btn.text().includes('Refresh')
      )

      expect(refreshButtons.length).toBeGreaterThan(0)
    })
  })
})
