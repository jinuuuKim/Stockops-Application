/**
 * API client functions for environment monitoring domain operations.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { api } from '@/lib/api'
import type {
  ControllerCommand,
  ControllerCommandRequest,
  DashboardResponse,
  EnvironmentController,
  EnvironmentControllerRequest,
  PageResponse,
  SensorAlert,
  SensorDevice,
  SensorDeviceRequest,
  SensorHistory,
} from '@/types/environment'

function emptyPageResponse<T>(page = 0, size = 20): PageResponse<T> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size,
    number: page,
  }
}

function normalizePageResponse<T>(data: PageResponse<T>, page = 0, size = 20): PageResponse<T> {
  if (!data || !Array.isArray(data.content)) {
    return emptyPageResponse<T>(page, size)
  }

  return {
    ...data,
    content: data.content,
    totalElements: data.totalElements ?? data.content.length,
    totalPages: data.totalPages ?? 1,
    size: data.size ?? size,
    number: data.number ?? page,
  }
}

export async function getSensors(page = 0, size = 20): Promise<PageResponse<SensorDevice>> {
  const response = await api.get<PageResponse<SensorDevice>>('/v1/environment/sensors', {
    params: { page, size },
  })
  return normalizePageResponse(response.data, page, size)
}

export async function getSensorById(id: number): Promise<SensorDevice> {
  const response = await api.get<SensorDevice>(`/v1/environment/sensors/${id}`)
  return response.data
}

export async function getSensorByExternalIds(siteId: string, sensorId: string): Promise<SensorDevice> {
  const response = await api.get<SensorDevice>(`/v1/environment/sensors/external/${siteId}/${sensorId}`)
  return response.data
}

export async function createSensor(data: SensorDeviceRequest): Promise<SensorDevice> {
  const response = await api.post<SensorDevice>('/v1/environment/sensors', data)
  return response.data
}

export async function updateSensor(id: number, data: SensorDeviceRequest): Promise<SensorDevice> {
  const response = await api.put<SensorDevice>(`/v1/environment/sensors/${id}`, data)
  return response.data
}

export async function deleteSensor(id: number): Promise<void> {
  await api.delete(`/v1/environment/sensors/${id}`)
}

export async function reactivateSensor(id: number): Promise<SensorDevice> {
  const response = await api.post<SensorDevice>(`/v1/environment/sensors/${id}/reactivate`)
  return response.data
}

export async function getControllers(page = 0, size = 20): Promise<PageResponse<EnvironmentController>> {
  const response = await api.get<PageResponse<EnvironmentController>>('/v1/environment/controllers', {
    params: { page, size },
  })
  return normalizePageResponse(response.data, page, size)
}

export async function getControllerById(id: number): Promise<EnvironmentController> {
  const response = await api.get<EnvironmentController>(`/v1/environment/controllers/${id}`)
  return response.data
}

export async function getControllerByExternalIds(
  siteId: string,
  controllerId: string,
): Promise<EnvironmentController> {
  const response = await api.get<EnvironmentController>(
    `/v1/environment/controllers/external/${siteId}/${controllerId}`,
  )
  return response.data
}

export async function createController(data: EnvironmentControllerRequest): Promise<EnvironmentController> {
  const response = await api.post<EnvironmentController>('/v1/environment/controllers', data)
  return response.data
}

export async function updateController(
  id: number,
  data: EnvironmentControllerRequest,
): Promise<EnvironmentController> {
  const response = await api.put<EnvironmentController>(`/v1/environment/controllers/${id}`, data)
  return response.data
}

export async function deleteController(id: number): Promise<void> {
  await api.delete(`/v1/environment/controllers/${id}`)
}

export async function reactivateController(id: number): Promise<EnvironmentController> {
  const response = await api.post<EnvironmentController>(`/v1/environment/controllers/${id}/reactivate`)
  return response.data
}

export async function getControllerCommands(controllerId: number, size = 20): Promise<ControllerCommand[]> {
  const response = await api.get<ControllerCommand[]>(`/v1/environment/controllers/${controllerId}/commands`, {
    params: { size },
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function sendControllerCommand(
  controllerId: number,
  data: ControllerCommandRequest,
): Promise<ControllerCommand> {
  const response = await api.post<ControllerCommand>(`/v1/environment/controllers/${controllerId}/commands`, data)
  return response.data
}

export async function getEnvironmentDashboard(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>('/v1/environment/dashboard')
  return {
    totalSensors: response.data?.totalSensors ?? 0,
    activeSensors: response.data?.activeSensors ?? 0,
    normalCount: response.data?.normalCount ?? 0,
    warningCount: response.data?.warningCount ?? 0,
    dangerCount: response.data?.dangerCount ?? 0,
    latestReadings: Array.isArray(response.data?.latestReadings) ? response.data.latestReadings : [],
  }
}

export async function getEnvironmentAlerts(days = 30): Promise<SensorAlert[]> {
  const response = await api.get<SensorAlert[]>('/v1/environment/alerts', {
    params: { days },
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function getSensorHistory(sensorId: number, days = 30): Promise<SensorHistory[]> {
  const response = await api.get<SensorHistory[]>('/v1/environment/history', {
    params: { sensorId, days },
  })
  return Array.isArray(response.data) ? response.data : []
}
