/**
 * React Query hooks for notification inbox data and browser permission handling.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { AppNotification } from '@/types/notification'

const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list'] as const

/**
 * Browser notification permission state with unsupported fallback.
 */
export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

/**
 * Fetches the current user's notification inbox.
 * Polls periodically so header badge and dropdown stay fresh.
 *
 * @returns notification query result plus unread convenience values
 */
export function useNotifications() {
  const query = useQuery<AppNotification[], AxiosError>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<AppNotification[]>('/v1/notifications', {
        params: { includeRead: true },
      })
      return response.data
    },
    staleTime: 10000,
    refetchInterval: 30000,
  })

  const unreadNotifications = useMemo(
    () => (query.data ?? []).filter((notification) => !notification.read),
    [query.data],
  )

  return {
    ...query,
    unreadNotifications,
    unreadCount: unreadNotifications.length,
  }
}

/**
 * Marks a single notification as read.
 *
 * @returns mutation result for marking one notification read
 */
export function useMarkNotificationAsRead(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: number) => {
      await api.post(`/v1/notifications/${notificationId}/read`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })
}

/**
 * Marks every notification in the inbox as read.
 *
 * @returns mutation result for bulk read operation
 */
export function useMarkAllNotificationsAsRead(): UseMutationResult<void, AxiosError, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post('/v1/notifications/read-all')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })
}

/**
 * Tracks browser notification permission and exposes a request action.
 *
 * @returns permission state and async permission request helper
 */
export function useNotificationPermission(): {
  permission: BrowserNotificationPermission
  requestPermission: () => Promise<BrowserNotificationPermission>
} {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() => getNotificationPermission())

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(getNotificationPermission())
  }, [])

  async function requestPermission(): Promise<BrowserNotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported'
    }

    const nextPermission = await window.Notification.requestPermission()
    setPermission(nextPermission)
    return nextPermission
  }

  return { permission, requestPermission }
}

function getNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return window.Notification.permission
}
