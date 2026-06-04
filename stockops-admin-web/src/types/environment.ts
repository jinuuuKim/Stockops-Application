/**
 * Environment monitoring domain types for StockOps frontend.
 * Mirrors backend DTO field names and enum values.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Generic Spring page response.
 */
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export type SensorType =
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'DOOR'
  | 'AIR_QUALITY'
  | 'CO2'
  | 'TVOC'
  | 'PRESSURE'
  | 'MOTION'

export type ControllerType =
  | 'COOLING'
  | 'HEATING'
  | 'HUMIDIFYING'
  | 'DEHUMIDIFYING'
  | 'VENTILATION'
  | 'AIR_PURIFIER'

export type ControllerStatus = 'INACTIVE' | 'READY' | 'RUNNING' | 'ERROR'

export type EnvironmentAxis = 'TEMPERATURE' | 'HUMIDITY' | 'AIR_QUALITY'

export type ControllerCommandResultStatus = 'PENDING' | 'FORWARDED' | 'APPLIED' | 'FAILED_RETRYABLE'

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface SensorDevice {
  id: number
  name: string
  siteId: string
  sensorId: string
  sensorType: SensorType
  location: string
  mqttTopic: string
  sourceChannel: string
  active: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface SensorDeviceRequest {
  siteId: string
  sensorId: string
  sensorType: SensorType
  location: string
  mqttTopic: string
  sourceChannel: string
}

export interface EnvironmentController {
  id: number
  name: string
  siteId: string | null
  controllerId: string
  controllerType: ControllerType
  targetAxis: EnvironmentAxis
  status: ControllerStatus
  outputLevel: number
  mqttTopic: string
  active: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface EnvironmentControllerRequest {
  siteId: string
  controllerId: string
  name: string
  controllerType: ControllerType
  status: ControllerStatus
  outputLevel: number
}

export interface DashboardLatestReading {
  sensorId: number
  sensorName: string | null
  sensorType: SensorType | null
  location: string | null
  value: number | null
  valueKind: string | null
  unit: string | null
  status: string | null
  recordedAt: string | null
}

export interface DashboardResponse {
  totalSensors: number
  activeSensors: number
  normalCount: number
  warningCount: number
  dangerCount: number
  latestReadings: DashboardLatestReading[]
}

export interface SensorAlert {
  id: number
  sensorId: number | null
  sensorName: string | null
  alertType: string
  severity: AlertSeverity
  message: string
  acknowledged: boolean
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  createdAt: string
}

export interface SensorHistory {
  sensorId: number
  value: number
  valueKind: string
  unit: string | null
  status: string
  sequenceId: number | null
  recordedAt: string
}

export interface ControllerCommand {
  id: number
  controllerId: number
  requestedStatus: string
  requestedOutputLevel: number | null
  resultStatus: ControllerCommandResultStatus
  resultMessage: string | null
  sensimulResponseCode: string | null
  createdAt: string
}

export interface ControllerCommandRequest {
  status: 'on' | 'off'
  outputLevel: number
}
