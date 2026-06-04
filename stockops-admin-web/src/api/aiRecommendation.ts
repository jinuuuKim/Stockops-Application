/**
 * API client functions for AI reorder recommendations.
 * Provides data fetching and approval actions for the recommendation workspace.
 *
 * @author StockOps Team
 * @since 2.0
 */

import api from '@/lib/api'
import type { AIRecommendation, AIRecommendationFilter } from '@/types/aiRecommendation'

/**
 * Fetch scoped AI recommendation snapshots.
 * @param filter - Optional query filter parameters
 * @returns Array of recommendation payloads
 */
export async function getAIRecommendations(filter: AIRecommendationFilter = {}): Promise<AIRecommendation[]> {
  const params: Record<string, string | number> = {}
  if (filter.businessDate) params.businessDate = filter.businessDate
  if (filter.centerId != null) params.centerId = filter.centerId
  if (filter.warehouseId != null) params.warehouseId = filter.warehouseId
  if (filter.productId != null) params.productId = filter.productId
  if (filter.model) params.model = filter.model

  const response = await api.get<AIRecommendation[]>('/v1/ai/recommendations', { params })
  return response.data
}

/**
 * Approve a recommendation into a draft purchase order.
 * Only READY_FOR_APPROVAL recommendations can be approved.
 * @param recommendationId - Recommendation identifier
 * @returns Approved recommendation with linked draft purchase order
 */
export async function approveAIRecommendation(recommendationId: number): Promise<AIRecommendation> {
  const response = await api.post<AIRecommendation>(`/v1/ai/recommendations/${recommendationId}/approve`)
  return response.data
}

export async function generateAIRecommendations(businessDate: string, model?: string): Promise<void> {
  const params: Record<string, string> = { businessDate }
  if (model) params.model = model
  await api.post('/v1/ai/recommendations/generate', null, { params })
}