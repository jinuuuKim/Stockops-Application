/**
 * React Query hooks for controller command history and command forwarding.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { getErrorMessage, showErrorToast } from '@/lib/httpError'
import { getControllerCommands, sendControllerCommand } from '@/api/environment'
import type { ControllerCommand, ControllerCommandRequest } from '@/types/environment'

function getMutationErrorMessage(error: AxiosError): string {
  const networkMessage = getErrorMessage(error)
  if (networkMessage) {
    return networkMessage
  }

  const responseMessage = error.response?.data
  if (typeof responseMessage === 'object' && responseMessage !== null && 'message' in responseMessage) {
    const message = responseMessage.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return '제어 명령 전송에 실패했습니다.'
}

export function useControllerCommands(
  controllerId: number | null,
  size = 20,
): UseQueryResult<ControllerCommand[], AxiosError> {
  return useQuery({
    queryKey: ['environment', 'controllers', controllerId, 'commands', size],
    queryFn: () => {
      if (controllerId === null) {
        throw new Error('Controller ID is required')
      }
      return getControllerCommands(controllerId, size)
    },
    enabled: controllerId !== null,
    staleTime: 30000,
  })
}

export function useControllerCommand(
  controllerId: number,
): UseMutationResult<ControllerCommand, AxiosError, ControllerCommandRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request) => sendControllerCommand(controllerId, request),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ['environment', 'controllers', controllerId, 'commands'] })

      const snapshots = queryClient.getQueriesData<ControllerCommand[]>({
        queryKey: ['environment', 'controllers', controllerId, 'commands'],
      })

      const optimisticCommand: ControllerCommand = {
        id: -Date.now(),
        controllerId,
        requestedStatus: request.status,
        requestedOutputLevel: request.outputLevel,
        resultStatus: 'FORWARDED',
        resultMessage: '명령을 전송 중입니다.',
        sensimulResponseCode: 'PENDING',
        createdAt: new Date().toISOString(),
      }

      for (const [queryKey, existing] of snapshots) {
        queryClient.setQueryData<ControllerCommand[]>(queryKey, [optimisticCommand, ...(existing ?? [])])
      }

      return { snapshots }
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
      showErrorToast(getMutationErrorMessage(error))
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers', controllerId, 'commands'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers', controllerId] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'controllers'] }),
        queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      ])
    },
  })
}
