/**
 * Escalation policy domain types for StockOps frontend.
 * Mirrors backend DTO field names and enum values.
 *
 * @author StockOps Team
 * @since 2.0
 */

export type AlertType =
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'AIR_QUALITY'
  | 'DOOR'
  | 'MOTION'
  | 'CO2'
  | 'TVOC'
  | 'PRESSURE'

export type NotificationChannel = 'SMS' | 'EMAIL' | 'SLACK'

export type NotifyRole = 'ROLE_ADMIN' | 'ROLE_CENTER_MANAGER' | 'ROLE_WAREHOUSE_MANAGER' | 'ROLE_USER'

export interface EscalationRule {
  id?: number
  level: number
  delayMinutes: number
  notifyRoles: string[]
  channels: string[]
}

export interface EscalationPolicy {
  id: number
  centerId: number
  warehouseId: number | null
  alertType: string
  active: boolean
  rules: EscalationRule[]
  createdAt: string
  updatedAt: string
}

export interface EscalationPolicyRequest {
  centerId: number
  warehouseId: number | null
  alertType: string
  active: boolean
  rules: EscalationRuleRequest[]
}

export interface EscalationRuleRequest {
  level: number
  delayMinutes: number
  notifyRoles: string[]
  channels: string[]
}

export type PendingAlertStatus = 'PENDING' | 'ESCALATED' | 'ACKNOWLEDGED'

export interface PendingAlert {
  id: number
  alertType: string
  centerId: number
  warehouseId: number | null
  sensorId: number | null
  message: string
  severity: string
  status: PendingAlertStatus
  currentLevel: number
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  createdAt: string
  updatedAt: string
}
