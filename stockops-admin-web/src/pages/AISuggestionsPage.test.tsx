import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AISuggestionsPage } from './AISuggestionsPage'
import type { AISuggestion, AISuggestionStatus, AISuggestionAction, AISuggestionSeverity } from '@/types/aiSuggestion'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('@/hooks/useAISuggestion', () => ({
  useSuggestions: vi.fn(),
  useSuggestion: vi.fn(),
  useApproveSuggestion: vi.fn(),
  useRejectSuggestion: vi.fn(),
  useExecuteSuggestion: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  useSuggestions,
  useSuggestion,
  useApproveSuggestion,
  useRejectSuggestion,
  useExecuteSuggestion,
} from '@/hooks/useAISuggestion'
import { showToast } from '@/lib/toast'

function buildSuggestion(overrides: Partial<AISuggestion> = {}): AISuggestion {
  return {
    id: 1,
    type: 'REORDER_STOCK',
    severity: 'HIGH',
    title: 'Reorder milk',
    summary: 'Milk stock is low.',
    reason: 'Demand is above the safety stock threshold.',
    recommendedAction: 'Approve replenishment',
    targetType: 'PRODUCT',
    targetId: 42,
    status: 'PENDING',
    allowedActions: ['APPROVE', 'REJECT'],
    scopeMetadata: {
      targetScopeType: 'WAREHOUSE',
      targetScopeId: 7,
      requestedScopeType: 'WAREHOUSE',
      requestedScopeId: 7,
      visibleToApp: 'ADMIN_WEB',
      approvalMode: 'MANUAL',
      sourceType: 'FORECAST',
    },
    auditSummary: {
      createdByUserId: 100,
      createdAt: '2026-05-30T00:00:00Z',
      updatedAt: '2026-05-30T00:00:00Z',
      reviewedByUserId: null,
      reviewedAt: null,
      approvedByUserId: null,
      approvedAt: null,
      executedAt: null,
      version: 1,
      source: 'AI',
      createdFromApp: 'admin-web',
    },
    payloadJson: '{"productId":42}',
    confidenceScore: 0.88,
    source: 'AI',
    sourceType: 'FORECAST',
    createdByUserId: 100,
    createdFromApp: 'admin-web',
    forecastSourceType: 'REORDER_FORECAST',
    forecastSourceId: 200,
    forecastModelVersion: 'v1',
    forecastGeneratedAt: '2026-05-30T00:00:00Z',
    forecastSourcePayloadJson: '{"forecast":true}',
    visibleToApp: 'ADMIN_WEB',
    approvalMode: 'MANUAL',
    requestedOnBehalfUserId: null,
    requestedScopeType: 'WAREHOUSE',
    requestedScopeId: 7,
    expiresAt: null,
    errorMessage: null,
    ...overrides,
  }
}

function createMockMutation() {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
    mutate: vi.fn(),
    reset: vi.fn(),
    data: undefined,
    error: null,
    isError: false,
    isSuccess: false,
    isIdle: true,
    status: 'idle' as const,
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
  }
}

describe('AISuggestionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOnlineStatus).mockReturnValue(true)
    vi.mocked(useSuggestions).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isPending: false,
      isFetching: false,
      isLoadingError: false,
      isRefetchError: false,
      isPlaceholderData: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      fetchNextPage: vi.fn(),
      fetchPreviousPage: vi.fn(),
      hasNextPage: false,
      hasPreviousPage: false,
      isFetchNextPageError: false,
      isFetchPreviousPageError: false,
      isFetchingNextPage: false,
      isFetchingPreviousPage: false,
      refetch: vi.fn(),
      remove: vi.fn(),
      promise: Promise.resolve([]),
    } as unknown as ReturnType<typeof useSuggestions>)
    vi.mocked(useSuggestion).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
      isPending: true,
      isFetching: false,
      isLoadingError: false,
      isRefetchError: false,
      isPlaceholderData: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isRefetching: false,
      isStale: false,
      status: 'pending' as const,
      fetchStatus: 'idle' as const,
      refetch: vi.fn(),
      remove: vi.fn(),
      promise: Promise.resolve(undefined),
    } as unknown as ReturnType<typeof useSuggestion>)
    vi.mocked(useApproveSuggestion).mockReturnValue(createMockMutation() as unknown as ReturnType<typeof useApproveSuggestion>)
    vi.mocked(useRejectSuggestion).mockReturnValue(createMockMutation() as unknown as ReturnType<typeof useRejectSuggestion>)
    vi.mocked(useExecuteSuggestion).mockReturnValue(createMockMutation() as unknown as ReturnType<typeof useExecuteSuggestion>)
  })

  it('renders the page title and description', () => {
    render(<AISuggestionsPage />)
    expect(screen.getByText('AI 제안 관리')).toBeInTheDocument()
    expect(screen.getByText('AI 생성 제안을 검토하고 승인, 거부, 또는 실행하세요')).toBeInTheDocument()
  })

  it('renders offline banner and disables suggestion actions when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    const suggestion = buildSuggestion({ id: 8, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-refresh')).toBeDisabled()
    expect(screen.getByTestId('suggestion-approve-btn-8')).toBeDisabled()
    expect(screen.getByTestId('suggestion-reject-btn-8')).toBeDisabled()
  })

  it('renders filter controls', () => {
    render(<AISuggestionsPage />)
    expect(screen.getByTestId('suggestion-filters')).toBeInTheDocument()
    expect(screen.getByLabelText('상태')).toBeInTheDocument()
    expect(screen.getByLabelText('스코프 유형')).toBeInTheDocument()
    expect(screen.getByLabelText('스코프 ID')).toBeInTheDocument()
  })

  it('renders pending suggestions with approve and reject buttons', () => {
    const pendingSuggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([pendingSuggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-approve-btn-1')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-reject-btn-1')).toBeInTheDocument()
  })

  it('renders approved suggestions with execute button', () => {
    const approvedSuggestion = buildSuggestion({ id: 2, status: 'APPROVED', allowedActions: ['EXECUTE'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([approvedSuggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-row-2')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-execute-btn-2')).toBeInTheDocument()
  })

  it('opens the detail panel when a suggestion title is clicked', () => {
    const suggestion = buildSuggestion({ id: 9, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)
    vi.mocked(useSuggestion).mockImplementation((id: number | null) => {
      if (id === 9) {
        return createMockSuggestionDetailState(suggestion)
      }

      return createMockSuggestionDetailState(undefined)
    })

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Reorder milk' }))

    expect(screen.getByTestId('suggestion-detail-panel')).toBeInTheDocument()
    expect(screen.getByTestId('detail-approve-btn')).toBeInTheDocument()
    expect(screen.getByTestId('detail-reject-btn')).toBeInTheDocument()
  })

  it('expands a row to show reason, payload, and error details', () => {
    const suggestion = buildSuggestion({
      id: 10,
      status: 'FAILED',
      allowedActions: [],
      errorMessage: 'Execution timed out',
    })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Reorder milk' }))

    expect(screen.getByTestId('suggestion-expanded-10')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-reason-10')).toHaveTextContent('Demand is above the safety stock threshold.')
    expect(screen.getByTestId('suggestion-payload-10')).toHaveTextContent('productId: 42')
    expect(screen.getByTestId('suggestion-error-10')).toHaveTextContent('Execution timed out')
  })

  it('hides action buttons when allowedActions is empty for terminal states', () => {
    const executedSuggestion = buildSuggestion({ id: 3, status: 'EXECUTED', allowedActions: [] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([executedSuggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-no-actions-3')).toBeInTheDocument()
    expect(screen.queryByTestId('suggestion-approve-btn-3')).not.toBeInTheDocument()
    expect(screen.queryByTestId('suggestion-reject-btn-3')).not.toBeInTheDocument()
    expect(screen.queryByTestId('suggestion-execute-btn-3')).not.toBeInTheDocument()
  })

  it('hides approve button when APPROVE is not in allowedActions', () => {
    const suggestion = buildSuggestion({ id: 4, status: 'PENDING', allowedActions: ['REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.queryByTestId('suggestion-approve-btn-4')).not.toBeInTheDocument()
    expect(screen.getByTestId('suggestion-reject-btn-4')).toBeInTheDocument()
  })

  it('shows status badges for each status type', () => {
    const statuses: AISuggestionStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED']
    const suggestions = statuses.map((status, i) =>
      buildSuggestion({ id: i + 10, status, allowedActions: getAllowedActionsForStatus(status) })
    )
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState(suggestions),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-status-10')).toHaveTextContent('대기')
    expect(screen.getByTestId('suggestion-status-11')).toHaveTextContent('승인')
    expect(screen.getByTestId('suggestion-status-12')).toHaveTextContent('거부')
    expect(screen.getByTestId('suggestion-status-13')).toHaveTextContent('실행 완료')
    expect(screen.getByTestId('suggestion-status-14')).toHaveTextContent('실행 실패')
  })

  it('shows summary cards with correct counts', () => {
    const suggestions = [
      buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] }),
      buildSuggestion({ id: 2, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] }),
      buildSuggestion({ id: 3, status: 'APPROVED', allowedActions: ['EXECUTE'] }),
      buildSuggestion({ id: 4, status: 'REJECTED', allowedActions: [] }),
      buildSuggestion({ id: 5, status: 'EXECUTED', allowedActions: [] }),
      buildSuggestion({ id: 6, status: 'FAILED', allowedActions: [] }),
    ]
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState(suggestions),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-pending-count')).toHaveTextContent('2')
    expect(screen.getByTestId('suggestion-approved-count')).toHaveTextContent('1')
    expect(screen.getByTestId('suggestion-rejected-count')).toHaveTextContent('1')
    expect(screen.getByTestId('suggestion-executed-count')).toHaveTextContent('1')
    expect(screen.getByTestId('suggestion-failed-count')).toHaveTextContent('1')
  })

  it('opens approve confirmation dialog when approve button clicked', () => {
    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-approve-btn-1'))

    expect(screen.getByText('제안 승인')).toBeInTheDocument()
    expect(screen.getByText('이 AI 제안을 승인하시겠습니까? 승인 후 실행 가능합니다.')).toBeInTheDocument()
  })

  it('opens reject dialog with reason input when reject button clicked', () => {
    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))

    expect(screen.getByTestId('reject-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('reject-reason-input')).toBeInTheDocument()
  })

  it('disables reject confirm button when reason is empty', () => {
    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))

    expect(screen.getByTestId('reject-confirm-btn')).toBeDisabled()
  })

  it('enables reject confirm button when reason is provided', () => {
    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Not enough stock' } })

    expect(screen.getByTestId('reject-confirm-btn')).not.toBeDisabled()
  })

  it('calls approve mutation and shows success toast', async () => {
    const approveMock = vi.fn().mockResolvedValue(buildSuggestion({ id: 1, status: 'APPROVED' }))
    vi.mocked(useApproveSuggestion).mockReturnValue({
      ...createMockMutation(),
      mutateAsync: approveMock,
    } as unknown as ReturnType<typeof useApproveSuggestion>)

    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-approve-btn-1'))
    const confirmButtons = screen.getAllByText('승인')
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith(1)
      expect(showToast).toHaveBeenCalledWith({ message: '제안이 승인되었습니다.', variant: 'success' })
    })
  })

  it('shows conflict error toast on 409 response', async () => {
    const conflictError = {
      response: { status: 409, data: { message: 'Conflict' } },
    }
    const approveMock = vi.fn().mockRejectedValue(conflictError)
    vi.mocked(useApproveSuggestion).mockReturnValue({
      ...createMockMutation(),
      mutateAsync: approveMock,
    } as unknown as ReturnType<typeof useApproveSuggestion>)

    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-approve-btn-1'))
    const confirmButtons = screen.getAllByText('승인')
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        message: '제안 상태가 변경되었습니다. 새로고침 후 다시 시도하세요.',
        variant: 'error',
      })
    })
  })

  it('shows generic error toast on non-409 error', async () => {
    const error500 = {
      response: { status: 500, data: { message: 'Internal Server Error' } },
    }
    const approveMock = vi.fn().mockRejectedValue(error500)
    vi.mocked(useApproveSuggestion).mockReturnValue({
      ...createMockMutation(),
      mutateAsync: approveMock,
    } as unknown as ReturnType<typeof useApproveSuggestion>)

    const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-approve-btn-1'))
    const confirmButtons = screen.getAllByText('승인')
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        message: 'Internal Server Error',
        variant: 'error',
      })
    })
  })

  it('renders error state when suggestions query fails', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      isSuccess: false,
      isPending: false,
      isFetching: false,
      isLoadingError: true,
      isRefetchError: false,
      isPlaceholderData: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: null,
      errorUpdateCount: 1,
      isFetched: true,
      isFetchedAfterMount: true,
      isRefetching: false,
      isStale: false,
      status: 'error' as const,
      fetchStatus: 'idle' as const,
      refetch: vi.fn(),
      remove: vi.fn(),
      promise: Promise.resolve(undefined),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByText('제안 데이터를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('renders empty state when no suggestions exist', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByText('제안 데이터가 없습니다')).toBeInTheDocument()
  })

  it('renders error message for failed suggestions', () => {
    const failedSuggestion = buildSuggestion({
      id: 5,
      status: 'FAILED',
      allowedActions: [],
      errorMessage: 'Execution timed out',
    })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([failedSuggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-row-5')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-no-actions-5')).toBeInTheDocument()
  })

  it('renders severity badges correctly', () => {
    const criticalSuggestion = buildSuggestion({ id: 1, severity: 'CRITICAL', allowedActions: ['APPROVE', 'REJECT'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([criticalSuggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-severity-1')).toHaveTextContent('긴급')
  })

  it('renders confidence score as percentage', () => {
    const suggestion = buildSuggestion({ id: 1, confidenceScore: 0.75 })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([suggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    expect(screen.getByTestId('suggestion-confidence-1')).toHaveTextContent('75%')
  })

  it('opens execute confirmation dialog when execute button clicked', () => {
    const approvedSuggestion = buildSuggestion({ id: 2, status: 'APPROVED', allowedActions: ['EXECUTE'] })
    vi.mocked(useSuggestions).mockReturnValue({
      ...createMockQueryState([approvedSuggestion]),
    } as unknown as ReturnType<typeof useSuggestions>)

    render(<AISuggestionsPage />)

    fireEvent.click(screen.getByTestId('suggestion-execute-btn-2'))

    expect(screen.getByText('제안 실행')).toBeInTheDocument()
    expect(screen.getByText('이 AI 제안을 실행하시겠습니까? 실행 후 되돌릴 수 없습니다.')).toBeInTheDocument()
  })

  describe('scope filter requests', () => {
    it('sends ADMIN scope filter param when ADMIN is selected', () => {
      render(<AISuggestionsPage />)

      const scopeSelect = screen.getByLabelText('스코프 유형')
      fireEvent.change(scopeSelect, { target: { value: 'ADMIN' } })

      expect(scopeSelect).toHaveValue('ADMIN')
    })

    it('sends STORE scope filter param when STORE is selected', () => {
      render(<AISuggestionsPage />)

      const scopeSelect = screen.getByLabelText('스코프 유형')
      fireEvent.change(scopeSelect, { target: { value: 'STORE' } })

      expect(scopeSelect).toHaveValue('STORE')
    })

    it('sends CENTER scope filter param when CENTER is selected', () => {
      render(<AISuggestionsPage />)

      const scopeSelect = screen.getByLabelText('스코프 유형')
      fireEvent.change(scopeSelect, { target: { value: 'CENTER' } })

      expect(scopeSelect).toHaveValue('CENTER')
    })

    it('sends WAREHOUSE scope filter param when WAREHOUSE is selected', () => {
      render(<AISuggestionsPage />)

      const scopeSelect = screen.getByLabelText('스코프 유형')
      fireEvent.change(scopeSelect, { target: { value: 'WAREHOUSE' } })

      expect(scopeSelect).toHaveValue('WAREHOUSE')
    })

    it('does not include GLOBAL as a scope filter option', () => {
      render(<AISuggestionsPage />)

      const scopeSelect = screen.getByLabelText('스코프 유형')
      const options = Array.from(scopeSelect.querySelectorAll('option'))

      expect(options.some((o) => o.value === 'GLOBAL')).toBe(false)
    })

    it('includes ADMIN, CENTER, WAREHOUSE, and STORE as scope filter options', () => {
      render(<AISuggestionsPage />)

      const scopeSelect = screen.getByLabelText('스코프 유형')
      const optionValues = Array.from(scopeSelect.querySelectorAll('option')).map((o) => o.value)

      expect(optionValues).toContain('ADMIN')
      expect(optionValues).toContain('CENTER')
      expect(optionValues).toContain('WAREHOUSE')
      expect(optionValues).toContain('STORE')
    })

    it('renders STORE scope in suggestion row', () => {
      const storeSuggestion = buildSuggestion({
        id: 50,
        scopeMetadata: {
          targetScopeType: 'STORE',
          targetScopeId: 12,
          requestedScopeType: 'STORE',
          requestedScopeId: 12,
          visibleToApp: 'ADMIN_WEB',
          approvalMode: 'MANUAL',
          sourceType: 'FORECAST',
        },
      })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([storeSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      expect(screen.getByTestId('suggestion-scope-50')).toHaveTextContent('STORE#12')
    })
  })

  describe('detail panel loading state', () => {
    it('shows loading skeleton when detail query is loading', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)
      vi.mocked(useSuggestion).mockReturnValue({
        ...createMockSuggestionDetailState(undefined),
        isLoading: true,
        isPending: true,
        status: 'pending' as const,
        fetchStatus: 'fetching' as const,
      } as unknown as ReturnType<typeof useSuggestion>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Reorder milk' }))

      expect(screen.getByTestId('suggestion-detail-loading')).toBeInTheDocument()
    })
  })

  describe('detail panel error state', () => {
    it('shows error state when detail query fails', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)
      const refetchMock = vi.fn()
      vi.mocked(useSuggestion).mockImplementation((id: number | null) => {
        if (id === 1) {
          return {
            ...createMockSuggestionDetailState(undefined),
            isLoading: false,
            isError: true,
            isPending: false,
            error: new Error('Network error'),
            status: 'error' as const,
            fetchStatus: 'idle' as const,
            refetch: refetchMock,
          } as unknown as ReturnType<typeof useSuggestion>
        }
        return createMockSuggestionDetailState(undefined)
      })

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Reorder milk' }))

      expect(screen.getByText('제안 상세를 불러오지 못했습니다')).toBeInTheDocument()
    })

    it('allows retry from detail error state', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)
      const refetchMock = vi.fn()
      vi.mocked(useSuggestion).mockImplementation((id: number | null) => {
        if (id === 1) {
          return {
            ...createMockSuggestionDetailState(undefined),
            isLoading: false,
            isError: true,
            isPending: false,
            error: new Error('Network error'),
            status: 'error' as const,
            fetchStatus: 'idle' as const,
            refetch: refetchMock,
          } as unknown as ReturnType<typeof useSuggestion>
        }
        return createMockSuggestionDetailState(undefined)
      })

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Reorder milk' }))

      const retryButton = screen.getByText('다시 시도')
      expect(retryButton).toBeInTheDocument()
      fireEvent.click(retryButton)
      expect(refetchMock).toHaveBeenCalled()
    })
  })

  describe('reject dialog accessibility', () => {
    it('has dialog role and aria attributes', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))

      const dialog = screen.getByTestId('reject-dialog')
      expect(dialog).toHaveAttribute('role', 'dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'reject-dialog-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'reject-dialog-description')
    })

    it('closes on Escape key', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))
      expect(screen.getByTestId('reject-dialog')).toBeInTheDocument()

      fireEvent.keyDown(screen.getByTestId('reject-dialog'), { key: 'Escape' })
      expect(screen.queryByTestId('reject-dialog')).not.toBeInTheDocument()
    })

    it('does not close on backdrop click', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))
      expect(screen.getByTestId('reject-dialog')).toBeInTheDocument()

      const backdrop = screen.getByTestId('reject-dialog').querySelector('[aria-hidden="true"]')
      expect(backdrop).toBeTruthy()
      if (backdrop) {
        fireEvent.click(backdrop)
      }
      expect(screen.getByTestId('reject-dialog')).toBeInTheDocument()
    })

    it('disables submit for whitespace-only reason', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))
      const input = screen.getByTestId('reject-reason-input')

      fireEvent.change(input, { target: { value: '   ' } })
      expect(screen.getByTestId('reject-confirm-btn')).toBeDisabled()
    })

    it('submits on Ctrl+Enter in textarea', async () => {
      const rejectMock = vi.fn().mockResolvedValue(buildSuggestion({ id: 1, status: 'REJECTED' }))
      vi.mocked(useRejectSuggestion).mockReturnValue({
        ...createMockMutation(),
        mutateAsync: rejectMock,
      } as unknown as ReturnType<typeof useRejectSuggestion>)
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))
      const input = screen.getByTestId('reject-reason-input')
      fireEvent.change(input, { target: { value: 'Valid reason' } })

      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

      await waitFor(() => {
        expect(rejectMock).toHaveBeenCalledWith({ id: 1, request: { rejectionReason: 'Valid reason' } })
      })
    })

    it('does not submit on Ctrl+Enter when reason is empty', () => {
      const suggestion = buildSuggestion({ id: 1, status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([suggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      fireEvent.click(screen.getByTestId('suggestion-reject-btn-1'))
      const input = screen.getByTestId('reject-reason-input')

      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

      expect(showToast).not.toHaveBeenCalled()
    })
  })

  describe('severity rendering', () => {
    it('renders WARNING severity with correct label', () => {
      const warningSuggestion = buildSuggestion({ id: 20, severity: 'WARNING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([warningSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      expect(screen.getByTestId('suggestion-severity-20')).toHaveTextContent('주의')
    })

    it('renders WARNING severity with amber styling', () => {
      const warningSuggestion = buildSuggestion({ id: 21, severity: 'WARNING', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([warningSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      const badge = screen.getByTestId('suggestion-severity-21')
      expect(badge.className).toContain('bg-amber-100')
      expect(badge.className).toContain('text-amber-700')
    })

    it('renders INFO severity with correct label and styling', () => {
      const infoSuggestion = buildSuggestion({ id: 22, severity: 'INFO', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([infoSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      const badge = screen.getByTestId('suggestion-severity-22')
      expect(badge).toHaveTextContent('정보')
      expect(badge.className).toContain('bg-sky-100')
      expect(badge.className).toContain('text-sky-700')
    })

    it('renders CRITICAL severity with correct label and styling', () => {
      const criticalSuggestion = buildSuggestion({ id: 23, severity: 'CRITICAL', allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([criticalSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      const badge = screen.getByTestId('suggestion-severity-23')
      expect(badge).toHaveTextContent('긴급')
      expect(badge.className).toContain('bg-red-100')
      expect(badge.className).toContain('text-red-700')
    })

    it('renders unknown/legacy severity with fallback label instead of MEDIUM semantics', () => {
      const unknownSuggestion = buildSuggestion({ id: 24, severity: 'LEGACY_SEVERITY' as AISuggestionSeverity, allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([unknownSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      const badge = screen.getByTestId('suggestion-severity-24')
      expect(badge).toHaveTextContent('알 수 없음')
      expect(badge.className).toContain('bg-neutral-100')
      expect(badge.className).toContain('text-neutral-500')
    })

    it('does not render unknown severity with MEDIUM label or styling', () => {
      const unknownSuggestion = buildSuggestion({ id: 25, severity: 'OBSOLETE' as AISuggestionSeverity, allowedActions: ['APPROVE', 'REJECT'] })
      vi.mocked(useSuggestions).mockReturnValue({
        ...createMockQueryState([unknownSuggestion]),
      } as unknown as ReturnType<typeof useSuggestions>)

      render(<AISuggestionsPage />)

      const badge = screen.getByTestId('suggestion-severity-25')
      expect(badge).not.toHaveTextContent('보통')
      expect(badge.className).not.toContain('bg-yellow-100')
    })
  })
})

function createMockSuggestionDetailState(data: AISuggestion | undefined) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: data != null,
    isPending: false,
    isFetching: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    dataUpdatedAt: data ? Date.now() : 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: data != null,
    isFetchedAfterMount: data != null,
    isRefetching: false,
    isStale: false,
    status: data ? ('success' as const) : ('pending' as const),
    fetchStatus: 'idle' as const,
    refetch: vi.fn(),
    remove: vi.fn(),
    promise: Promise.resolve(data),
  } as unknown as ReturnType<typeof useSuggestion>
}

function getAllowedActionsForStatus(status: AISuggestionStatus): AISuggestionAction[] {
  switch (status) {
    case 'PENDING': return ['APPROVE', 'REJECT']
    case 'APPROVED': return ['EXECUTE']
    case 'REJECTED': return []
    case 'EXECUTED': return []
    case 'FAILED': return []
    default: return []
  }
}

function createMockQueryState(data: AISuggestion[]) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: true,
    isPending: false,
    isFetching: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isRefetching: false,
    isStale: false,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    refetch: vi.fn(),
    remove: vi.fn(),
    promise: Promise.resolve(data),
  }
}
