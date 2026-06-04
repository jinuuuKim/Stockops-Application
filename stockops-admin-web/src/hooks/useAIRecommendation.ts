/**
 * React Query hooks for AI reorder recommendations.
 * Follows the same query-key and stale-time conventions as useAnalytics.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  getAIRecommendations,
  approveAIRecommendation,
} from '@/api/aiRecommendation'
import type { AIRecommendation, AIRecommendationFilter } from '@/types/aiRecommendation'

const AI_STALE_TIME = 60000

const AI_RECOMMENDATION_KEY = ['ai', 'recommendations'] as const

/**
 * Fetch AI recommendation snapshots with optional scope filters.
 * @param filter - Optional query filter parameters
 * @returns Query result with recommendation array
 */
export function useAIRecommendations(filter: AIRecommendationFilter = {}): UseQueryResult<AIRecommendation[], AxiosError> {
  return useQuery({
    queryKey: [...AI_RECOMMENDATION_KEY, filter],
    queryFn: () => getAIRecommendations(filter),
    staleTime: AI_STALE_TIME,
  })
}

/**
 * Approve a recommendation into a draft purchase order.
 * Invalidates the recommendations query cache on success.
 * @returns Mutation result for approval action
 */
export function useApproveRecommendation(): UseMutationResult<AIRecommendation, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recommendationId: number) => approveAIRecommendation(recommendationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AI_RECOMMENDATION_KEY })
    },
  })
}