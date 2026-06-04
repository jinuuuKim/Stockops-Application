/**
 * React Query hooks for notification management.
 * Provides hooks for fetching notifications, unread counts, and marking as read.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { AppNotification } from '@/types/notification'

/**
 * Fetches notifications with optional read filter.
 *
 * @param includeRead - Whether to include already read notifications
 * @returns React Query result with notification array
 * @example
 * const { data: notifications } = useNotifications(true)
 */
export function useNotifications(includeRead = true): UseQueryResult<AppNotification[], AxiosError> {
  return useQuery({
    queryKey: ['notifications', 'list', includeRead],
    queryFn: async () => {
      const response = await api.get<AppNotification[]>('/v1/notifications', {
        params: { includeRead },
      })
      return response.data
    },
  })
}

/**
 * Fetches the unread notification count.
 *
 * @returns React Query result with unread count
 * @example
 * const { data: unreadCount } = useUnreadNotificationCount()
 */
export function useUnreadNotificationCount(): UseQueryResult<number, AxiosError> {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get<{ unreadCount: number }>('/v1/notifications/unread-count')
      return response.data.unreadCount
    },
  })
}

/**
 * Marks a single notification as read.
 *
 * @returns Mutation result for marking one notification read
 * @example
 * const markAsRead = useMarkAsRead()
 * markAsRead.mutate(1)
 */
export function useMarkAsRead(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/v1/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/**
 * Marks all notifications as read.
 *
 * @returns Mutation result for bulk read operation
 * @example
 * const markAllAsRead = useMarkAllAsRead()
 * markAllAsRead.mutate()
 */
export function useMarkAllAsRead(): UseMutationResult<void, AxiosError, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/v1/notifications/read-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
