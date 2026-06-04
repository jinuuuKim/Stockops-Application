/**
 * React Query hooks for inventory adjustment workflows.
 * Provides reason-code lookup and stock-adjustment request creation.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { StockAdjustment, ApproveAdjustmentRequest } from '@/types/stockAdjustment'

/**
 * Reason code option for stock adjustments.
 */
export interface AdjustmentReasonCode {
  id: number
  code: string
  name: string
  description: string | null
  category: string
  createdAt: string
}

/**
 * Stock adjustment creation request payload.
 */
export interface AdjustInventoryRequest {
  inventoryId: number
  newQuantity: number
  reasonCodeId: number
  note?: string
}

/**
 * Stock adjustment response payload.
 */
export interface StockAdjustmentResponse {
  id: number
  inventoryId: number
  inventoryInfo: string | null
  beforeQuantity: number
  afterQuantity: number
  difference: number
  reasonCodeId: number | null
  reasonCodeName: string | null
  note: string | null
  status: string
  createdBy: number | null
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  createdAt: string
  updatedAt: string
}

const INVENTORY_ADJUSTMENT_REASON_CATEGORY = 'ADJUSTMENT'

/**
 * Fetches reason codes that can be used for inventory adjustments.
 *
 * @returns React Query result with adjustment reason code options
 * @example
 * const { data: reasonCodes } = useAdjustmentReasonCodes()
 */
export function useAdjustmentReasonCodes(): UseQueryResult<AdjustmentReasonCode[], AxiosError> {
  return useQuery({
    queryKey: ['reason-codes', INVENTORY_ADJUSTMENT_REASON_CATEGORY],
    queryFn: async () => {
      const response = await api.get<AdjustmentReasonCode[]>('/v1/reason-codes', {
        params: { category: INVENTORY_ADJUSTMENT_REASON_CATEGORY },
      })
      return Array.isArray(response.data) ? response.data : []
    },
  })
}

/**
 * Creates a pending inventory adjustment request and refreshes inventory queries.
 *
 * @returns React Query mutation for submitting stock-adjustment requests
 * @example
 * const adjustInventory = useAdjustInventory()
 * await adjustInventory.mutateAsync({ inventoryId: 1, newQuantity: 12, reasonCodeId: 3 })
 */
export function useAdjustInventory(): UseMutationResult<
  StockAdjustmentResponse,
  AxiosError,
  AdjustInventoryRequest
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: AdjustInventoryRequest) => {
      const response = await api.post<StockAdjustmentResponse>('/v1/inventory/adjustments', request)
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] })
    },
  })
}

/**
 * Fetches pending stock adjustments awaiting approval.
 *
 * @returns React Query result with pending adjustment array
 * @example
 * const { data: pendingAdjustments, isLoading } = usePendingAdjustments()
 */
export function usePendingAdjustments(): UseQueryResult<StockAdjustment[], AxiosError> {
  return useQuery({
    queryKey: ['inventory-adjustments', 'pending'],
    queryFn: async () => {
      const response = await api.get<StockAdjustment[]>('/v1/inventory/adjustments/pending')
      return Array.isArray(response.data) ? response.data : []
    },
  })
}

/**
 * Approves or rejects a pending stock adjustment.
 *
 * @returns React Query mutation for approving/rejecting adjustments
 * @example
 * const approveMutation = useApproveAdjustment()
 * await approveMutation.mutateAsync({ adjustmentId: 1, approved: true })
 */
export function useApproveAdjustment(): UseMutationResult<
  StockAdjustment,
  AxiosError,
  ApproveAdjustmentRequest
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: ApproveAdjustmentRequest) => {
      const response = await api.post<StockAdjustment>(
        `/v1/inventory/adjustments/${request.adjustmentId}/approve`,
        request
      )
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
