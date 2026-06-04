/**
 * React Query hooks for escalation policy CRUD and active alert management.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { EscalationPolicy, EscalationPolicyRequest, PendingAlert } from '@/types/escalation'

/**
 * Fetches escalation policies for a center with optional warehouse and alert type filters.
 *
 * @param centerId - Center identifier (required)
 * @param warehouseId - Optional warehouse filter
 * @param alertType - Optional alert type filter
 * @returns React Query result with escalation policy array
 * @example
 * const { data: policies } = useEscalationPolicies(1)
 */
export function useEscalationPolicies(
  centerId: number | null,
  warehouseId?: number | null,
  alertType?: string
): UseQueryResult<EscalationPolicy[], AxiosError> {
  return useQuery({
    queryKey: ['escalation-policies', centerId, warehouseId, alertType],
    queryFn: async () => {
      if (!centerId) throw new Error('Center ID is required')
      const response = await api.get<EscalationPolicy[]>('/v1/escalation-policies', {
        params: { centerId, warehouseId, alertType },
      })
      return response.data
    },
    enabled: centerId !== null,
  })
}

/**
 * Creates a new escalation policy.
 *
 * @returns React Query mutation for creating escalation policies
 * @example
 * const createMutation = useCreateEscalationPolicy()
 * createMutation.mutate({ centerId: 1, alertType: 'TEMPERATURE', active: true, rules: [...] })
 */
export function useCreateEscalationPolicy(): UseMutationResult<
  EscalationPolicy,
  AxiosError,
  EscalationPolicyRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request) => {
      const response = await api.post<EscalationPolicy>('/v1/escalation-policies', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] })
    },
  })
}

/**
 * Updates an existing escalation policy.
 *
 * @returns React Query mutation for updating escalation policies
 * @example
 * const updateMutation = useUpdateEscalationPolicy()
 * updateMutation.mutate({ id: 1, data: { centerId: 1, alertType: 'TEMPERATURE', ... } })
 */
export function useUpdateEscalationPolicy(): UseMutationResult<
  EscalationPolicy,
  AxiosError,
  { id: number; data: EscalationPolicyRequest }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<EscalationPolicy>(`/v1/escalation-policies/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] })
    },
  })
}

/**
 * Deletes (soft-deletes) an escalation policy.
 *
 * @returns React Query mutation for deleting escalation policies
 * @example
 * const deleteMutation = useDeleteEscalationPolicy()
 * deleteMutation.mutate(1)
 */
export function useDeleteEscalationPolicy(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/v1/escalation-policies/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] })
    },
  })
}

/**
 * Fetches active (pending) alerts.
 *
 * @returns React Query result with pending alert array
 * @example
 * const { data: alerts } = useActiveAlerts()
 */
export function useActiveAlerts(): UseQueryResult<PendingAlert[], AxiosError> {
  return useQuery({
    queryKey: ['pending-alerts', 'PENDING'],
    queryFn: async () => {
      const response = await api.get<PendingAlert[]>('/v1/pending-alerts', {
        params: { status: 'PENDING' },
      })
      return response.data
    },
  })
}

/**
 * Acknowledges a pending alert, stopping further escalation.
 *
 * @returns React Query mutation for acknowledging alerts
 * @example
 * const ackMutation = useAcknowledgeAlert()
 * ackMutation.mutate(1)
 */
export function useAcknowledgeAlert(): UseMutationResult<PendingAlert, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (alertId) => {
      const response = await api.post<PendingAlert>(`/v1/pending-alerts/${alertId}/acknowledge`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-alerts'] })
    },
  })
}
