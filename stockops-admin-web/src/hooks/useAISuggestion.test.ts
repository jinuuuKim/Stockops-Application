import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveSuggestion,
  executeSuggestion,
  getSuggestion,
  listSuggestions,
  rejectSuggestion,
} from '@/api/aiSuggestion'
import {
  useApproveSuggestion,
  useExecuteSuggestion,
  useSuggestion,
  useSuggestions,
  useRejectSuggestion,
} from './useAISuggestion'
import type { AISuggestion, AISuggestionApiErrorResponse } from '@/types/aiSuggestion'

vi.mock('@/api/aiSuggestion', () => ({
  approveSuggestion: vi.fn(),
  executeSuggestion: vi.fn(),
  getSuggestion: vi.fn(),
  listSuggestions: vi.fn(),
  rejectSuggestion: vi.fn(),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function createWrapper() {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function createAxiosError(status: 400 | 401 | 403 | 409, message: string) {
  const response = {
    data: { status, message, error: message },
    status,
    statusText: message,
    headers: {},
    config: {} as never,
  }

  return new AxiosError(message, undefined, {} as never, undefined, response as never) as AxiosError<AISuggestionApiErrorResponse>
}

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

describe('useAISuggestion hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads the suggestion list with filters', async () => {
    const suggestions = [buildSuggestion({ id: 11, title: 'Reorder rice' })]
    vi.mocked(listSuggestions).mockResolvedValue(suggestions)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSuggestions({ status: 'PENDING', page: 1, size: 10 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listSuggestions).toHaveBeenCalledWith({ status: 'PENDING', page: 1, size: 10 })
    expect(result.current.data).toEqual(suggestions)
  })

  it('loads a single suggestion detail', async () => {
    const suggestion = buildSuggestion({ id: 22, status: 'APPROVED', allowedActions: ['EXECUTE'] })
    vi.mocked(getSuggestion).mockResolvedValue(suggestion)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSuggestion(22), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getSuggestion).toHaveBeenCalledWith(22)
    expect(result.current.data).toEqual(suggestion)
  })

  it('surfaces forbidden suggestion list errors', async () => {
    vi.mocked(listSuggestions).mockRejectedValue(createAxiosError(403, 'Forbidden'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSuggestions({ status: 'PENDING' }), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(listSuggestions).toHaveBeenCalledWith({ status: 'PENDING' })
    expect(result.current.error?.response?.status).toBe(403)
  })

  it('surfaces unauthorized suggestion detail errors', async () => {
    vi.mocked(getSuggestion).mockRejectedValue(createAxiosError(401, 'Unauthorized'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSuggestion(23), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.response?.status).toBe(401)
  })

  it('surfaces conflict errors from approve mutation', async () => {
    vi.mocked(approveSuggestion).mockRejectedValue(createAxiosError(409, 'Conflict'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useApproveSuggestion(), { wrapper })

    result.current.mutate(24)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(approveSuggestion).toHaveBeenCalledWith(24)
    expect(result.current.error?.response?.status).toBe(409)
  })

  it('approves a suggestion successfully', async () => {
    const suggestion = buildSuggestion({ id: 24, status: 'APPROVED', allowedActions: ['EXECUTE'] })
    vi.mocked(approveSuggestion).mockResolvedValue(suggestion)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useApproveSuggestion(), { wrapper })

    await result.current.mutateAsync(24)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(approveSuggestion).toHaveBeenCalledWith(24)
    expect(result.current.data).toEqual(suggestion)
  })

  it('surfaces bad request errors from reject mutation', async () => {
    vi.mocked(rejectSuggestion).mockRejectedValue(createAxiosError(400, 'Bad Request'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useRejectSuggestion(), { wrapper })

    result.current.mutate({ id: 25, request: { rejectionReason: 'Missing supporting detail' } })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(rejectSuggestion).toHaveBeenCalledWith(25, { rejectionReason: 'Missing supporting detail' })
    expect(result.current.error?.response?.status).toBe(400)
  })

  it('rejects a suggestion successfully', async () => {
    const suggestion = buildSuggestion({ id: 25, status: 'REJECTED', allowedActions: [] })
    vi.mocked(rejectSuggestion).mockResolvedValue(suggestion)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useRejectSuggestion(), { wrapper })

    await result.current.mutateAsync({ id: 25, request: { rejectionReason: 'Missing supporting detail' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(rejectSuggestion).toHaveBeenCalledWith(25, { rejectionReason: 'Missing supporting detail' })
    expect(result.current.data).toEqual(suggestion)
  })

  it('surfaces forbidden errors from execute mutation', async () => {
    vi.mocked(executeSuggestion).mockRejectedValue(createAxiosError(403, 'Forbidden'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useExecuteSuggestion(), { wrapper })

    result.current.mutate({ id: 26, request: { executionResult: 'Execution blocked' } })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(executeSuggestion).toHaveBeenCalledWith(26, { executionResult: 'Execution blocked' })
    expect(result.current.error?.response?.status).toBe(403)
  })

  it('executes a suggestion successfully', async () => {
    const suggestion = buildSuggestion({ id: 26, status: 'EXECUTED', allowedActions: [] })
    vi.mocked(executeSuggestion).mockResolvedValue(suggestion)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useExecuteSuggestion(), { wrapper })

    await result.current.mutateAsync({ id: 26, request: { executionResult: 'Execution complete' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(executeSuggestion).toHaveBeenCalledWith(26, { executionResult: 'Execution complete' })
    expect(result.current.data).toEqual(suggestion)
  })
})
