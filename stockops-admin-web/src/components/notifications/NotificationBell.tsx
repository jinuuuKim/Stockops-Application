/**
 * Header notification bell with inbox dropdown and browser notification support.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import {
  Bell,
  BellRing,
  Check,
  Info,
  PackageCheck,
  TriangleAlert,
} from 'lucide-react'
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotificationPermission,
  useNotifications,
} from '@/hooks/useNotifications'
import { useWebSocket } from '@/hooks/useWebSocket'
import { showToast } from '@/lib/toast'
import type { NotificationType } from '@/types/notification'

const BROWSER_NOTIFICATION_STORAGE_KEY = 'stockops-browser-notification-ids'
const MAX_REALTIME_NOTIFICATIONS = 50

interface RealtimeNotification {
  id: string
  userId: number
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}

/**
 * Notification bell button and dropdown inbox.
 * Shows unread badge, browser-permission CTA, and read controls.
 *
 * @returns Notification bell JSX element
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const shownBrowserNotifications = useRef<Set<number>>(loadShownNotificationIds())
  const [realtimeNotifications, setRealtimeNotifications] = useState<RealtimeNotification[]>([])
  const { data: notifications = [], unreadNotifications, unreadCount, refetch, isFetching } = useNotifications()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const { permission, requestPermission } = useNotificationPermission()
  const { lastMessage } = useWebSocket('/topic/stock')

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    void refetch()
  }, [isOpen, refetch])

  useEffect(() => {
    if (permission !== 'granted' || typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    const allUnread = [...realtimeNotifications.filter((n) => !n.read), ...unreadNotifications]

    allUnread.forEach((notification) => {
      if (typeof notification.id !== 'number') {
        return
      }
      if (shownBrowserNotifications.current.has(notification.id)) {
        return
      }

      const browserNotification = new window.Notification(notification.title, {
        body: notification.message,
        tag: `stockops-notification-${notification.id}`,
      })

      browserNotification.onclick = () => {
        window.focus()
      }

      shownBrowserNotifications.current.add(notification.id)
      persistShownNotificationIds(shownBrowserNotifications.current)
    })
  }, [permission, unreadNotifications, realtimeNotifications])

  useEffect(() => {
    if (lastMessage?.eventType !== 'STOCK_CHANGE') {
      return
    }

    const payload = lastMessage as {
      eventType: string
      changeType: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT'
      productId: number
      locationId: number
      quantity: number
      newTotal: number
      timestamp: string
    }

    const titleMap: Record<string, string> = {
      INBOUND: '입고 완료',
      OUTBOUND: '출고 완료',
      ADJUSTMENT: '재고 조정',
    }

    const title = titleMap[payload.changeType] ?? '재고 변경'
    const message = `productId: ${payload.productId}, quantity: ${payload.quantity}, newTotal: ${payload.newTotal}`

    const notification: RealtimeNotification = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 0,
      type: 'STOCK_CHANGE',
      title,
      message,
      read: false,
      createdAt: payload.timestamp ?? new Date().toISOString(),
    }

    /* eslint-disable react-hooks/set-state-in-effect -- websocket notification payloads are appended to the in-memory realtime feed. */
    setRealtimeNotifications((prev) => {
      const next = [notification, ...prev]
      if (next.length > MAX_REALTIME_NOTIFICATIONS) {
        next.pop()
      }
      return next
    })
    /* eslint-enable react-hooks/set-state-in-effect */

    showToast({ message: `${title}: ${message}`, variant: 'success' })
  }, [lastMessage])

  const allNotifications = useMemo(
    () => [...realtimeNotifications, ...(notifications || [])],
    [realtimeNotifications, notifications]
  )

  const allUnreadCount = unreadCount + realtimeNotifications.filter((n) => !n.read).length

  const permissionLabel = useMemo(() => {
    switch (permission) {
      case 'granted':
        return '브라우저 알림 사용 중'
      case 'denied':
        return '브라우저 알림 차단됨'
      case 'default':
        return '브라우저 알림 꺼짐'
      default:
        return '브라우저 알림 미지원'
    }
  }, [permission])

  async function handleRequestPermission(event: ReactMouseEvent<HTMLButtonElement>): Promise<void> {
    event.stopPropagation()
    await requestPermission()
  }

  async function handleMarkAllAsRead(event: ReactMouseEvent<HTMLButtonElement>): Promise<void> {
    event.stopPropagation()
    setRealtimeNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await markAllAsRead.mutateAsync()
  }

  async function handleMarkAsRead(notificationId: number | string): Promise<void> {
    if (typeof notificationId === 'string') {
      setRealtimeNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      return
    }
    await markAsRead.mutateAsync(notificationId)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="p-2 hover:bg-neutral-100 rounded-lg relative transition-colors"
        aria-label="알림 센터 열기"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {allUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {allUnreadCount > 99 ? '99+' : allUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-text-primary">알림 센터</h2>
              <p className="text-xs text-text-secondary mt-1">{permissionLabel}</p>
            </div>

            {allUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
              >
                모두 읽음
              </button>
            )}
          </div>

          {permission === 'default' && (
            <div className="px-4 py-3 bg-primary-50 border-b border-primary-100 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <BellRing className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                <p className="text-xs text-primary-900">새 알림을 브라우저 팝업으로 받으려면 권한을 허용하세요.</p>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 shrink-0"
              >
                허용
              </button>
            </div>
          )}

          {permission === 'denied' && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-xs text-amber-900">브라우저 알림이 차단되어 있습니다. 앱 내 알림은 계속 표시됩니다.</p>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-secondary">
                {isFetching ? '알림을 불러오는 중...' : '새로운 알림이 없습니다.'}
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {allNotifications.map((notification) => (
                  <li key={notification.id} className="px-4 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${notification.read ? 'text-neutral-400' : getNotificationAccentClass(notification.type)}`}>
                        {renderNotificationIcon(notification.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-medium ${notification.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-text-secondary mt-1 break-words">{notification.message}</p>
                          </div>

                          {!notification.read && (
                            <span className="mt-1 w-2.5 h-2.5 bg-primary-600 rounded-full shrink-0" aria-hidden="true" />
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-3">
                          <span className="text-xs text-text-light">{formatRelativeTime(notification.createdAt)}</span>
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => void handleMarkAsRead(notification.id)}
                              disabled={markAsRead.isPending}
                              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              읽음 처리
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-neutral-200 bg-neutral-50 text-xs text-text-secondary flex items-center justify-between">
            <span>총 {allNotifications.length}건</span>
            <span>읽지 않음 {allUnreadCount}건</span>
          </div>
        </div>
      )}
    </div>
  )
}

function renderNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'LOW_STOCK':
      return <TriangleAlert className="w-4 h-4" />
    case 'EXPIRY_APPROACHING':
      return <Info className="w-4 h-4" />
    case 'PURCHASE_ORDER_STATUS_CHANGED':
      return <PackageCheck className="w-4 h-4" />
    case 'STOCK_CHANGE':
      return <PackageCheck className="w-4 h-4" />
    default:
      return <Bell className="w-4 h-4" />
  }
}

function getNotificationAccentClass(type: NotificationType): string {
  switch (type) {
    case 'LOW_STOCK':
      return 'text-amber-600'
    case 'EXPIRY_APPROACHING':
      return 'text-rose-600'
    case 'PURCHASE_ORDER_STATUS_CHANGED':
      return 'text-emerald-600'
    case 'STOCK_CHANGE':
      return 'text-emerald-600'
    default:
      return 'text-primary-600'
  }
}

function formatRelativeTime(createdAt: string): string {
  const createdTime = new Date(createdAt).getTime()
  const diffMs = Date.now() - createdTime
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}일 전`
}

function loadShownNotificationIds(): Set<number> {
  if (typeof window === 'undefined') {
    return new Set<number>()
  }

  try {
    const stored = window.localStorage.getItem(BROWSER_NOTIFICATION_STORAGE_KEY)
    if (!stored) {
      return new Set<number>()
    }

    const ids = JSON.parse(stored) as unknown
    if (!Array.isArray(ids)) {
      return new Set<number>()
    }

    return new Set(ids.filter((value): value is number => typeof value === 'number'))
  } catch {
    return new Set<number>()
  }
}

function persistShownNotificationIds(ids: Set<number>): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(BROWSER_NOTIFICATION_STORAGE_KEY, JSON.stringify([...ids]))
}
