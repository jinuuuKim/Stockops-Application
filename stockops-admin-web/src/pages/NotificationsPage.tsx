/**
 * Notifications page component.
 * Displays all notifications with filtering and read management.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState } from 'react'
import { Bell, Check, TriangleAlert, Info, PackageCheck } from 'lucide-react'
import { useNotifications, useUnreadNotificationCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotification'
import type { NotificationType } from '@/types/notification'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * Notifications page with list view, unread filter, and read controls.
 *
 * @returns NotificationsPage JSX element
 */
export function NotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const { data: notifications, isLoading, error, refetch } = useNotifications(!showUnreadOnly)
  const { data: unreadCount } = useUnreadNotificationCount()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const filteredNotifications = showUnreadOnly
    ? (notifications ?? []).filter((n) => !n.read)
    : (notifications ?? [])

  if (isLoading) {
    return <EmptyState title="로딩 중..." description="알림을 불러오는 중입니다" variant="empty" />
  }

  if (error) {
    return (
      <EmptyState
        title="데이터 로딩 실패"
        description={error.message}
        variant="error"
        actionLabel="다시 시도"
        onAction={() => void refetch()}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">알림 센터</h1>
          <p className="text-sm text-neutral-500 mt-1">
            읽지 않은 알림 {unreadCount ?? 0}건
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700">읽지 않은 알림만 보기</span>
          </label>
          {(unreadCount ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              모두 읽음 처리
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            title="알림이 없습니다"
            description={showUnreadOnly ? '새로운 알림이 없습니다' : '알림 목록이 비어 있습니다'}
            icon={Bell}
          />
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow p-4 transition-colors ${
                notification.read ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-0.5 p-2 rounded-lg shrink-0 ${getNotificationColorClass(notification.type)}`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-base font-medium ${notification.read ? 'text-neutral-500' : 'text-neutral-900'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-neutral-600 mt-1 break-words">{notification.message}</p>
                    </div>

                    {!notification.read && (
                      <span className="mt-1.5 w-2.5 h-2.5 bg-primary-600 rounded-full shrink-0" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <span className="text-xs text-neutral-400">{formatRelativeTime(notification.createdAt)}</span>
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead.mutate(notification.id)}
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'LOW_STOCK':
      return <TriangleAlert className="w-5 h-5" />
    case 'EXPIRY_APPROACHING':
      return <Info className="w-5 h-5" />
    case 'PURCHASE_ORDER_STATUS_CHANGED':
      return <PackageCheck className="w-5 h-5" />
    default:
      return <Bell className="w-5 h-5" />
  }
}

function getNotificationColorClass(type: NotificationType): string {
  switch (type) {
    case 'LOW_STOCK':
      return 'text-amber-600 bg-amber-50'
    case 'EXPIRY_APPROACHING':
      return 'text-rose-600 bg-rose-50'
    case 'PURCHASE_ORDER_STATUS_CHANGED':
      return 'text-emerald-600 bg-emerald-50'
    default:
      return 'text-primary-600 bg-primary-50'
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
  if (diffDays < 30) {
    return `${diffDays}일 전`
  }

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return `${diffMonths}개월 전`
  }

  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears}년 전`
}
