/**
 * Notification domain types used by the in-app notification center.
 *
 * @author StockOps Team
 * @since 1.0
 */

export type NotificationType = 'LOW_STOCK' | 'EXPIRY_APPROACHING' | 'PURCHASE_ORDER_STATUS_CHANGED' | 'STOCK_CHANGE'

/**
 * Notification payload returned by the backend API.
 */
export interface AppNotification {
  id: number
  userId: number
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}
