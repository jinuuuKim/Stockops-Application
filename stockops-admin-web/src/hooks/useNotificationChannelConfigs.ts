/**
 * React Query hooks for notification channel configuration CRUD and webhook testing.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type {
  NotificationChannelConfig,
  NotificationChannelConfigRequest,
  WebhookTestResult,
} from '@/types/notificationChannel'

export function useNotificationChannelConfigs(
  centerId: number | null,
  warehouseId?: number | null,
  alertType?: string
): UseQueryResult<NotificationChannelConfig[], AxiosError> {
  return useQuery({
    queryKey: ['notification-channel-configs', centerId, warehouseId, alertType],
    queryFn: async () => {
      if (!centerId) throw new Error('Center ID is required')
      const response = await api.get<NotificationChannelConfig[]>('/v1/notification-channel-configs', {
        params: { centerId, warehouseId, alertType },
      })
      return response.data
    },
    enabled: centerId !== null,
  })
}

export function useCreateNotificationChannelConfig(): UseMutationResult<
  NotificationChannelConfig,
  AxiosError,
  NotificationChannelConfigRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request) => {
      const response = await api.post<NotificationChannelConfig>('/v1/notification-channel-configs', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channel-configs'] })
    },
  })
}

export function useUpdateNotificationChannelConfig(): UseMutationResult<
  NotificationChannelConfig,
  AxiosError,
  { id: number; data: NotificationChannelConfigRequest }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<NotificationChannelConfig>(`/v1/notification-channel-configs/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channel-configs'] })
    },
  })
}

export function useDeleteNotificationChannelConfig(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/v1/notification-channel-configs/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channel-configs'] })
    },
  })
}

export function useTestWebhook(): UseMutationResult<WebhookTestResult, AxiosError, number> {
  return useMutation({
    mutationFn: async (configId) => {
      const response = await api.post<WebhookTestResult>(`/v1/notification-channel-configs/${configId}/test-webhook`)
      return response.data
    },
  })
}