import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  approveSuggestion,
  executeSuggestion,
  getSuggestion,
  listSuggestions,
  rejectSuggestion,
} from '@/api/aiSuggestion'
import type {
  AISuggestion,
  AISuggestionApiErrorResponse,
  AISuggestionListFilter,
  AISuggestionExecuteRequest,
  AISuggestionRejectRequest,
  AISuggestionStatus,
} from '@/types/aiSuggestion'

const AI_SUGGESTION_QUERY_KEY = ['ai', 'suggestions'] as const

export const suggestionQueryKeys = {
  all: AI_SUGGESTION_QUERY_KEY,
  list: (filter: AISuggestionListFilter = {}) => [...AI_SUGGESTION_QUERY_KEY, 'list', filter] as const,
  detail: (id: number) => [...AI_SUGGESTION_QUERY_KEY, 'detail', id] as const,
}

export function useSuggestions(filter: AISuggestionListFilter = {}): UseQueryResult<AISuggestion[], AxiosError<AISuggestionApiErrorResponse>> {
  return useQuery({
    queryKey: suggestionQueryKeys.list(filter),
    queryFn: () => listSuggestions(filter),
    staleTime: 60_000,
  })
}

export function useSuggestion(id: number | null): UseQueryResult<AISuggestion, AxiosError<AISuggestionApiErrorResponse>> {
  return useQuery({
    queryKey: suggestionQueryKeys.detail(id ?? -1),
    queryFn: () => {
      if (id == null) {
        throw new Error('Suggestion id is required')
      }
      return getSuggestion(id)
    },
    enabled: id != null,
    staleTime: 60_000,
  })
}

function invalidateSuggestionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: AI_SUGGESTION_QUERY_KEY })
}

export function useApproveSuggestion(): UseMutationResult<AISuggestion, AxiosError<AISuggestionApiErrorResponse>, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => approveSuggestion(id),
    onSuccess: () => {
      invalidateSuggestionQueries(queryClient)
    },
  })
}

export function useRejectSuggestion(): UseMutationResult<AISuggestion, AxiosError<AISuggestionApiErrorResponse>, { id: number; request: AISuggestionRejectRequest }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }) => rejectSuggestion(id, request),
    onSuccess: () => {
      invalidateSuggestionQueries(queryClient)
    },
  })
}

export function useExecuteSuggestion(): UseMutationResult<AISuggestion, AxiosError<AISuggestionApiErrorResponse>, { id: number; request?: AISuggestionExecuteRequest }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }) => executeSuggestion(id, request),
    onSuccess: () => {
      invalidateSuggestionQueries(queryClient)
    },
  })
}

export type { AISuggestionStatus }
