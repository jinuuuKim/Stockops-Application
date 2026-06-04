import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/api'
import { executeSuggestion, listSuggestions } from './aiSuggestion'
import type { AISuggestion } from '@/types/aiSuggestion'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

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
      sourceType: 'AI_AGENT',
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
    sourceType: 'AI_AGENT',
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

describe('aiSuggestion API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('listSuggestions sends backend target scope filter params', async () => {
    const suggestions = [buildSuggestion()]
    vi.mocked(api.get).mockResolvedValue({ data: suggestions })

    const result = await listSuggestions({
      status: 'PENDING',
      targetScopeType: 'WAREHOUSE',
      targetScopeId: 7,
      page: 1,
      size: 20,
    })

    expect(api.get).toHaveBeenCalledWith('/v1/ai/suggestions', {
      params: {
        status: 'PENDING',
        targetScopeType: 'WAREHOUSE',
        targetScopeId: 7,
        page: 1,
        size: 20,
      },
    })
    expect(result).toEqual(suggestions)
  })

  it('listSuggestions sends ADMIN scope filter param', async () => {
    const suggestions = [buildSuggestion()]
    vi.mocked(api.get).mockResolvedValue({ data: suggestions })

    const result = await listSuggestions({
      targetScopeType: 'ADMIN',
      page: 0,
      size: 10,
    })

    expect(api.get).toHaveBeenCalledWith('/v1/ai/suggestions', {
      params: {
        targetScopeType: 'ADMIN',
        page: 0,
        size: 10,
      },
    })
    expect(result).toEqual(suggestions)
  })

  it('listSuggestions sends STORE scope filter param', async () => {
    const suggestions = [buildSuggestion()]
    vi.mocked(api.get).mockResolvedValue({ data: suggestions })

    const result = await listSuggestions({
      targetScopeType: 'STORE',
      targetScopeId: 5,
      page: 0,
      size: 10,
    })

    expect(api.get).toHaveBeenCalledWith('/v1/ai/suggestions', {
      params: {
        targetScopeType: 'STORE',
        targetScopeId: 5,
        page: 0,
        size: 10,
      },
    })
    expect(result).toEqual(suggestions)
  })

  it('executeSuggestion posts an empty body by default', async () => {
    const suggestion = buildSuggestion({ status: 'EXECUTED', allowedActions: [] })
    vi.mocked(api.post).mockResolvedValue({ data: suggestion })

    const result = await executeSuggestion(1)

    expect(api.post).toHaveBeenCalledWith('/v1/ai/suggestions/1/execute', {})
    expect(result).toEqual(suggestion)
  })
})
