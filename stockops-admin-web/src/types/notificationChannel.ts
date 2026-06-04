/**
 * Notification channel configuration domain types for StockOps frontend.
 * Mirrors backend DTO field names and enum values.
 *
 * @author StockOps Team
 * @since 2.0
 */

export type ChannelType = 'SMS' | 'EMAIL' | 'WEBHOOK'

export type WebhookProviderType = 'SLACK' | 'NOTION' | 'DISCORD' | 'TEAMS' | 'GENERIC'

export interface ChannelEntry {
  type: ChannelType
  enabled: boolean
  webhookProvider: string | null
}

export interface NotificationChannelConfig {
  id: number
  centerId: number
  warehouseId: number | null
  alertType: string
  channels: ChannelEntry[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationChannelConfigRequest {
  centerId: number
  warehouseId: number | null
  alertType: string
  channels: ChannelEntryRequest[]
  active: boolean
}

export interface ChannelEntryRequest {
  type: string
  enabled: boolean
  webhookProvider: string | null
}

export interface WebhookTestResult {
  success: boolean
  message: string
  providerType: string | null
}