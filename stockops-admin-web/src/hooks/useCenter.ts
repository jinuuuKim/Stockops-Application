/**
 * React Query hooks for center data fetching.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'

/**
 * Center response from API.
 */
export interface Center {
  id: number
  code: string
  name: string
  address?: string
  phone?: string
  status?: string
}

/**
 * Fetches all centers.
 *
 * @returns React Query result with center array
 * @example
 * const { data: centers, isLoading } = useCenters()
 */
export function useCenters(): UseQueryResult<Center[], AxiosError> {
  return useQuery({
    queryKey: ['centers'],
    queryFn: async () => {
      const response = await api.get<Center[]>('/v1/centers')
      return response.data
    },
  })
}
