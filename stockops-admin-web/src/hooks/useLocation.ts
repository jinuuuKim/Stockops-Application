/**
 * React Query hooks for location data fetching.
 * Provides hooks for fetching location list and single location.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { Location, LocationRequest } from '@/types/location'

function normalizeArrayResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: T[] }).content
  }

  return []
}

/**
 * Fetches all locations.
 *
 * @param type - Optional location type filter
 * @returns React Query result with location array
 * @example
 * const { data: locations, isLoading } = useLocations()
 */
export function useLocations(type?: string): UseQueryResult<Location[], AxiosError> {
  return useQuery({
    queryKey: ['locations', type],
    queryFn: async () => {
      const params = type ? `?type=${type}` : ''
      const response = await api.get<Location[]>(`/v1/locations${params}`)
      return normalizeArrayResponse<Location>(response.data)
    },
  })
}

/**
 * Fetches single location by ID.
 *
 * @param id - Location identifier
 * @returns React Query result with single location
 * @example
 * const { data: location } = useLocationById(1)
 */
export function useLocationById(id: number | null): UseQueryResult<Location, AxiosError> {
  return useQuery({
    queryKey: ['location', id],
    queryFn: async () => {
      if (!id) throw new Error('Location ID is required')
      const response = await api.get<Location>(`/v1/locations/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

export function useCreateLocation(): UseMutationResult<Location, AxiosError, LocationRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request) => {
      const response = await api.post<Location>('/v1/locations', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useUpdateLocation(): UseMutationResult<
  Location,
  AxiosError,
  { id: number; data: LocationRequest }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<Location>(`/v1/locations/${id}`, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['location', variables.id] })
    },
  })
}

export function useDeleteLocation(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/v1/locations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}
