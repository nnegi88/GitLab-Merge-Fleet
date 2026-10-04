import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithPlugins } from '../utils/testHelpers.js'
import MergeRequestList from '../../src/components/MergeRequestList.vue'

// Mock the dateUtils module
vi.mock('../../src/utils/dateUtils.js', () => ({
  formatDistanceToNow: vi.fn((dateString) => '2 hours ago')
}))

describe('MergeRequestList.vue', () => {
  let mockRouter

  beforeEach(() => {
    // Create a fresh router for each test
    mockRouter = null
  })

  describe('Empty State', () => {
    it('should render empty state when no merge requests', () => {
      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: []
        }
      })

      expect(wrapper.find('.v-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('No merge requests found')
      expect(wrapper.text()).toContain('There are no open merge requests matching your filters.')
      expect(wrapper.find('.v-icon').exists()).toBe(true)
    })

    it('should display merge icon in empty state', () => {
      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: []
        }
      })

      const icon = wrapper.find('.v-icon')
      expect(icon.exists()).toBe(true)
    })
  })

  describe('Merge Request Rendering', () => {
    const mockMR = {
      id: 1,
      iid: 42,
      project_id: 100,
      title: 'Fix authentication bug',
      source_branch: 'feature/auth-fix',
      target_branch: 'main',
      web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
      author: {
        username: 'johndoe'
      },
      created_at: '2024-01-15T12:00:00Z',
      user_notes_count: 5,
      labels: ['bug', 'security'],
      references: {
        full: 'project/repo!42'
      },
      draft: false,
      work_in_progress: false,
      approvals_required: 2,
      approved_by: [{ username: 'reviewer1' }]
    }

    it('should render merge request card with basic information', () => {
      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mockMR]
        }
      })

      expect(wrapper.text()).toContain('Fix authentication bug')
      expect(wrapper.text()).toContain('feature/auth-fix → main')
      expect(wrapper.text()).toContain('johndoe')
      expect(wrapper.text()).toContain('2 hours ago')
      expect(wrapper.text()).toContain('5')
      expect(wrapper.text()).toContain('project/repo!42')
    })

    it('should render multiple merge requests', () => {
      const mockMRs = [
        { ...mockMR, id: 1, iid: 1, title: 'First MR' },
        { ...mockMR, id: 2, iid: 2, title: 'Second MR' },
        { ...mockMR, id: 3, iid: 3, title: 'Third MR' }
      ]

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: mockMRs
        }
      })

      expect(wrapper.text()).toContain('First MR')
      expect(wrapper.text()).toContain('Second MR')
      expect(wrapper.text()).toContain('Third MR')
      expect(wrapper.findAll('.v-card').length).toBe(3)
    })

    it('should render external link button with correct URL', () => {
      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mockMR]
        }
      })

      const externalLink = wrapper.find('a[target="_blank"]')
      expect(externalLink.exists()).toBe(true)
      expect(externalLink.attributes('href')).toBe(mockMR.web_url)
    })

    it('should render MR reference with link', () => {
      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mockMR]
        }
      })

      const referenceLink = wrapper.find('a[rel="noopener noreferrer"]')
      expect(referenceLink.exists()).toBe(true)
      expect(referenceLink.text()).toBe('project/repo!42')
    })
  })

  describe('Draft Status', () => {
    it('should display Draft chip when draft is true', () => {
      const draftMR = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Draft: Work in progress',
        draft: true,
        work_in_progress: false,
        source_branch: 'feature/wip',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [draftMR]
        }
      })

      expect(wrapper.text()).toContain('Draft')
    })

    it('should display Draft chip when work_in_progress is true', () => {
      const wipMR = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'WIP: Work in progress',
        draft: false,
        work_in_progress: true,
        source_branch: 'feature/wip',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [wipMR]
        }
      })

      expect(wrapper.text()).toContain('Draft')
    })

    it('should not display Draft chip when both draft and work_in_progress are false', () => {
      const normalMR = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Regular MR',
        draft: false,
        work_in_progress: false,
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [normalMR]
        }
      })

      const draftChips = wrapper.findAll('.v-chip').filter(chip =>
        chip.text().includes('Draft')
      )
      expect(draftChips.length).toBe(0)
    })
  })

  describe('Labels', () => {
    it('should render labels when present', () => {
      const mrWithLabels = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR with labels',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: ['bug', 'security', 'high-priority'],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mrWithLabels]
        }
      })

      expect(wrapper.text()).toContain('bug')
      expect(wrapper.text()).toContain('security')
      expect(wrapper.text()).toContain('high-priority')
    })

    it('should not render label section when no labels', () => {
      const mrWithoutLabels = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR without labels',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mrWithoutLabels]
        }
      })

      const labelChips = wrapper.findAll('.v-chip').filter(chip =>
        chip.text() !== 'No approval required'
      )
      expect(labelChips.length).toBe(0)
    })

    it('should render multiple labels correctly', () => {
      const mrWithManyLabels = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR with many labels',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: ['label1', 'label2', 'label3', 'label4', 'label5'],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mrWithManyLabels]
        }
      })

      mrWithManyLabels.labels.forEach(label => {
        expect(wrapper.text()).toContain(label)
      })
    })
  })

  describe('Approval Status', () => {
    it('should show "No approval required" when approvals_required is 0', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR without approval requirement',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('No approval required')
    })

    it('should show "No approval required" when approvals_required is null', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR without approval requirement',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: null
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('No approval required')
    })

    it('should show "Approved" when all required approvals are met', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Approved MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 2,
        approved_by: [
          { username: 'reviewer1' },
          { username: 'reviewer2' }
        ]
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('Approved')
    })

    it('should show "Approved" when approvals exceed requirement', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Over-approved MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 2,
        approved_by: [
          { username: 'reviewer1' },
          { username: 'reviewer2' },
          { username: 'reviewer3' }
        ]
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('Approved')
    })

    it('should show approval count when partially approved', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Partially approved MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 3,
        approved_by: [
          { username: 'reviewer1' }
        ]
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('1/3 approvals')
    })

    it('should show 0 approvals when no approvers', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Unapproved MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 2,
        approved_by: []
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('0/2 approvals')
    })

    it('should handle missing approved_by field', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR without approved_by',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 2
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('0/2 approvals')
    })
  })

  describe('Navigation', () => {
    it('should navigate to MR details when card is clicked', async () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Test MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      const card = wrapper.find('.v-card')
      expect(card.exists()).toBe(true)

      await card.trigger('click')
      await wrapper.vm.$router.isReady()

      expect(wrapper.vm.$router.currentRoute.value.path).toBe('/mr/100/42')
    })

    it('should have pointer cursor on cards', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Test MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      const card = wrapper.find('.v-card')
      expect(card.attributes('style')).toContain('cursor: pointer')
    })
  })

  describe('Props', () => {
    it('should use default empty array when mergeRequests prop not provided', () => {
      const wrapper = mountWithPlugins(MergeRequestList)

      expect(wrapper.text()).toContain('No merge requests found')
    })

    it('should accept mergeRequests as prop', () => {
      const mockMRs = [
        {
          id: 1,
          iid: 1,
          project_id: 100,
          title: 'Test MR',
          source_branch: 'feature/test',
          target_branch: 'main',
          web_url: 'https://gitlab.com/test',
          author: { username: 'testuser' },
          created_at: '2024-01-15T12:00:00Z',
          user_notes_count: 0,
          labels: [],
          references: { full: 'test!1' },
          draft: false,
          work_in_progress: false,
          approvals_required: 0
        }
      ]

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: mockMRs
        }
      })

      expect(wrapper.text()).toContain('Test MR')
    })
  })

  describe('Date Formatting', () => {
    it('should call formatDistanceToNow with created_at date', async () => {
      const { formatDistanceToNow } = await import('../../src/utils/dateUtils.js')

      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'Test MR',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(formatDistanceToNow).toHaveBeenCalledWith('2024-01-15T12:00:00Z')
      expect(wrapper.text()).toContain('2 hours ago')
    })
  })

  describe('Comments Count', () => {
    it('should display comments count', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR with comments',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 15,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('15')
    })

    it('should display 0 when no comments', () => {
      const mr = {
        id: 1,
        iid: 42,
        project_id: 100,
        title: 'MR without comments',
        source_branch: 'feature/fix',
        target_branch: 'main',
        web_url: 'https://gitlab.com/project/repo/-/merge_requests/42',
        author: { username: 'johndoe' },
        created_at: '2024-01-15T12:00:00Z',
        user_notes_count: 0,
        labels: [],
        references: { full: 'project/repo!42' },
        draft: false,
        work_in_progress: false,
        approvals_required: 0
      }

      const wrapper = mountWithPlugins(MergeRequestList, {
        props: {
          mergeRequests: [mr]
        }
      })

      expect(wrapper.text()).toContain('0')
    })
  })
})
