/**
 * React Query hooks for purchase order management.
 * Provides hooks for fetching, creating, and transitioning purchase orders.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderShipment,
  CreatePurchaseOrderRequest,
  AddPurchaseOrderItemRequest,
  CreateShipmentRequest,
  AcceptPurchaseOrderRequest,
  RejectPurchaseOrderRequest,
  CancelPurchaseOrderRequest,
  PartialAcceptRequest,
  ReceiveShipmentRequest,
} from '@/types/purchaseOrder'

/**
 * Fetches all purchase orders.
 *
 * @returns React Query result with purchase order array
 * @example
 * const { data: purchaseOrders, isLoading } = usePurchaseOrders()
 */
export function usePurchaseOrders(): UseQueryResult<PurchaseOrder[], AxiosError> {
  return useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      const response = await api.get<PurchaseOrder[]>('/v1/purchase-orders')
      return response.data
    },
  })
}

/**
 * Fetches single purchase order by ID.
 *
 * @param id - Purchase order identifier
 * @returns React Query result with single purchase order
 * @example
 * const { data: purchaseOrder } = usePurchaseOrderById(1)
 */
export function usePurchaseOrderById(id: number | null): UseQueryResult<PurchaseOrder, AxiosError> {
  return useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: async () => {
      if (!id) throw new Error('Purchase Order ID is required')
      const response = await api.get<PurchaseOrder>(`/v1/purchase-orders/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Creates a new draft purchase order.
 *
 * @returns Mutation result for creating purchase order
 * @example
 * const createMutation = useCreatePurchaseOrder()
 * createMutation.mutate({ centerId: 1, warehouseId: 2 })
 */
export function useCreatePurchaseOrder(): UseMutationResult<PurchaseOrder, AxiosError, CreatePurchaseOrderRequest> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CreatePurchaseOrderRequest) => {
      const response = await api.post<PurchaseOrder>('/v1/purchase-orders', null, {
        params: request,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

/**
 * Adds an item to an existing draft purchase order.
 *
 * @param id - Purchase order identifier
 * @returns Mutation result for adding item
 * @example
 * const addItemMutation = useAddPurchaseOrderItem(1)
 * addItemMutation.mutate({ productId: 1, quantity: 100 })
 */
export function useAddPurchaseOrderItem(
  id: number
): UseMutationResult<PurchaseOrderItem, AxiosError, AddPurchaseOrderItemRequest> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: AddPurchaseOrderItemRequest) => {
      const response = await api.post<PurchaseOrderItem>(`/v1/purchase-orders/${id}/items`, null, {
        params: request,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', id] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

/**
 * Submits a draft purchase order (DRAFT → REQUESTED).
 *
 * @returns Mutation result for submitting purchase order
 * @example
 * const submitMutation = useSubmitPurchaseOrder()
 * submitMutation.mutate(1)
 */
export function useSubmitPurchaseOrder(): UseMutationResult<PurchaseOrder, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/submit`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Accepts a requested purchase order.
 *
 * @returns Mutation result for accepting purchase order
 * @example
 * const acceptMutation = useAcceptPurchaseOrder()
 * acceptMutation.mutate({ id: 1, erpReference: 'ERP-001' })
 */
export function useAcceptPurchaseOrder(): UseMutationResult<
  PurchaseOrder,
  AxiosError,
  AcceptPurchaseOrderRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, erpReference }: AcceptPurchaseOrderRequest) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/accept`, null, {
        params: { erpReference },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Rejects a requested purchase order.
 *
 * @returns Mutation result for rejecting purchase order
 * @example
 * const rejectMutation = useRejectPurchaseOrder()
 * rejectMutation.mutate({ id: 1, reason: '재고 부족' })
 */
export function useRejectPurchaseOrder(): UseMutationResult<
  PurchaseOrder,
  AxiosError,
  RejectPurchaseOrderRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: RejectPurchaseOrderRequest) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/reject`, null, {
        params: { reason },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Cancels a purchase order.
 *
 * @returns Mutation result for cancelling purchase order
 * @example
 * const cancelMutation = useCancelPurchaseOrder()
 * cancelMutation.mutate({ id: 1, reason: '요청 변경' })
 */
export function useCancelPurchaseOrder(): UseMutationResult<
  PurchaseOrder,
  AxiosError,
  CancelPurchaseOrderRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: CancelPurchaseOrderRequest) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/cancel`, null, {
        params: { reason },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Creates a shipment for an accepted purchase order.
 *
 * @returns Mutation result for creating shipment
 * @example
 * const shipmentMutation = useCreateShipment()
 * shipmentMutation.mutate({ id: 1, request: { shipmentNumber: 'SHIP-001', carrier: 'CJ' } })
 */
export function useCreateShipment(): UseMutationResult<
  PurchaseOrderShipment,
  AxiosError,
  { id: number; request: CreateShipmentRequest }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id: number; request: CreateShipmentRequest }) => {
      const response = await api.post<PurchaseOrderShipment>(`/v1/purchase-orders/${id}/shipments`, request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Partially accepts a purchase order with per-item quantities.
 *
 * @returns Mutation result for partial acceptance
 * @example
 * const partialAcceptMutation = usePartialAcceptPurchaseOrder()
 * partialAcceptMutation.mutate({ id: 1, items: [{ poItemId: 1, acceptedQuantity: 50 }] })
 */
export function usePartialAcceptPurchaseOrder(): UseMutationResult<
  PurchaseOrder,
  AxiosError,
  PartialAcceptRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, items }: PartialAcceptRequest) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/partial-accept`, {
        items,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Receives a shipment for a purchase order.
 *
 * @returns Mutation result for receiving shipment
 * @example
 * const receiveMutation = useReceivePurchaseOrderShipment()
 * receiveMutation.mutate({ id: 1, shipmentId: 2 })
 */
export function useReceivePurchaseOrderShipment(): UseMutationResult<
  PurchaseOrder,
  AxiosError,
  ReceiveShipmentRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, shipmentId }: ReceiveShipmentRequest) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/receive`, null, {
        params: { shipmentId },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}

/**
 * Completes a purchase order (SHIPMENT_CREATED → COMPLETED).
 *
 * @returns Mutation result for completing purchase order
 * @example
 * const completeMutation = useCompletePurchaseOrder()
 * completeMutation.mutate(1)
 */
export function useCompletePurchaseOrder(): UseMutationResult<PurchaseOrder, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<PurchaseOrder>(`/v1/purchase-orders/${id}/complete`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] })
    },
  })
}
