/**
 * React Query hooks for environment monitoring reads and CRUD mutations.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  createController,
  createSensor,
  deleteController,
  deleteSensor,
  getControllerByExternalIds,
  getControllerById,
  getControllers,
  getEnvironmentAlerts,
  getEnvironmentDashboard,
  getSensorByExternalIds,
  getSensorById,
  getSensorHistory,
  getSensors,
  reactivateController,
  reactivateSensor,
  updateController,
  updateSensor,
} from '@/api/environment'
import type {
  DashboardResponse,
  EnvironmentController,
  EnvironmentControllerRequest,
  PageResponse,
  SensorAlert,
  SensorDevice,
  SensorDeviceRequest,
  SensorHistory,
} from '@/types/environment'

const DASHBOARD_STALE_TIME = 30000
const ALERTS_STALE_TIME = 30000
const HISTORY_STALE_TIME = 60000

export function useEnvironmentDashboard(): UseQueryResult<DashboardResponse, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'dashboard'],
    queryFn: getEnvironmentDashboard,
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: 10000,
  })
}

export function useEnvironmentAlerts(days = 30): UseQueryResult<SensorAlert[], AxiosError> {
  return useQuery({
    queryKey: ['environment', 'alerts', days],
    queryFn: () => getEnvironmentAlerts(days),
    staleTime: ALERTS_STALE_TIME,
  })
}

export function useSensorHistory(
  sensorId: number | null,
  days = 30,
): UseQueryResult<SensorHistory[], AxiosError> {
  return useQuery({
    queryKey: ['environment', 'history', sensorId, days],
    queryFn: () => {
      if (sensorId === null) {
        throw new Error('Sensor ID is required')
      }
      return getSensorHistory(sensorId, days)
    },
    enabled: sensorId !== null,
    staleTime: HISTORY_STALE_TIME,
  })
}

export function useSensors(
  page = 0,
  size = 20,
): UseQueryResult<PageResponse<SensorDevice>, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'sensors', page, size],
    queryFn: () => getSensors(page, size),
  })
}

export function useSensor(id: number | null): UseQueryResult<SensorDevice, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'sensors', id],
    queryFn: () => {
      if (id === null) {
        throw new Error('Sensor ID is required')
      }
      return getSensorById(id)
    },
    enabled: id !== null,
  })
}

export function useSensorByExternalIds(
  siteId: string | null,
  sensorId: string | null,
): UseQueryResult<SensorDevice, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'sensors', 'external', siteId, sensorId],
    queryFn: () => {
      if (!siteId || !sensorId) {
        throw new Error('siteId and sensorId are required')
      }
      return getSensorByExternalIds(siteId, sensorId)
    },
    enabled: Boolean(siteId && sensorId),
  })
}

export function useCreateSensor(): UseMutationResult<SensorDevice, AxiosError, SensorDeviceRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSensor,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      ])
    },
  })
}

export function useUpdateSensor(): UseMutationResult<
  SensorDevice,
  AxiosError,
  { id: number; data: SensorDeviceRequest }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => updateSensor(id, data),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      ])
    },
  })
}

export function useDeleteSensor(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSensor,
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors', id] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      ])
    },
  })
}

export function useReactivateSensor(): UseMutationResult<SensorDevice, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reactivateSensor,
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'sensors', id] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      ])
    },
  })
}

export function useControllers(
  page = 0,
  size = 20,
): UseQueryResult<PageResponse<EnvironmentController>, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'controllers', page, size],
    queryFn: () => getControllers(page, size),
  })
}

export function useEnvironmentController(id: number | null): UseQueryResult<EnvironmentController, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'controllers', id],
    queryFn: () => {
      if (id === null) {
        throw new Error('Controller ID is required')
      }
      return getControllerById(id)
    },
    enabled: id !== null,
  })
}

export function useControllerByExternalIds(
  siteId: string | null,
  controllerId: string | null,
): UseQueryResult<EnvironmentController, AxiosError> {
  return useQuery({
    queryKey: ['environment', 'controllers', 'external', siteId, controllerId],
    queryFn: () => {
      if (!siteId || !controllerId) {
        throw new Error('siteId and controllerId are required')
      }
      return getControllerByExternalIds(siteId, controllerId)
    },
    enabled: Boolean(siteId && controllerId),
  })
}

export function useCreateController(): UseMutationResult<
  EnvironmentController,
  AxiosError,
  EnvironmentControllerRequest
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createController,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['environment', 'controllers'] })
    },
  })
}

export function useUpdateController(): UseMutationResult<
  EnvironmentController,
  AxiosError,
  { id: number; data: EnvironmentControllerRequest }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => updateController(id, data),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers', variables.id] }),
      ])
    },
  })
}

export function useDeleteController(): UseMutationResult<void, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteController,
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers', id] }),
      ])
    },
  })
}

export function useReactivateController(): UseMutationResult<EnvironmentController, AxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reactivateController,
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers', id] }),
      ])
    },
  })
}
