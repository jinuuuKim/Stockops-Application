/**
 * Purchase order type definitions.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 2.0
 */

/**
 * Purchase order status enumeration.
 */
export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PARTIALLY_ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'SHIPMENT_CREATED'
  | 'INBOUND_PENDING'
  | 'COMPLETED'

/**
 * Purchase order shipment status enumeration.
 */
export type PurchaseOrderShipmentStatus =
  | 'CREATED'
  | 'READY'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'

/**
 * Purchase order item response from API.
 */
export interface PurchaseOrderItem {
  id: number
  product: { id: number; name: string; barcode: string }
  requestedQuantity: number
  acceptedQuantity: number
  cancelledQuantity: number
  unitPrice: string | null
  totalPrice: string | null
  note: string | null
}

/**
 * Purchase order shipment response from API.
 */
export interface PurchaseOrderShipment {
  id: number
  shipmentNumber: string
  carrier: string | null
  trackingNumber: string | null
  status: PurchaseOrderShipmentStatus
  shippedAt: string | null
  etaDate: string | null
  deliveredAt: string | null
  notes: string | null
}

/**
 * Purchase order response from API.
 */
export interface PurchaseOrder {
  id: number
  poNumber: string
  requestingCenter: { id: number; name: string }
  targetWarehouse: { id: number; name: string } | null
  supplierName: string | null
  supplierCode: string | null
  status: PurchaseOrderStatus
  erpReference: string | null
  requestedBy: { id: number; name: string } | null
  requestedAt: string | null
  erpRespondedAt: string | null
  cancelReason: string | null
  totalRequestedAmount: string
  totalAcceptedAmount: string
  notes: string | null
  items: PurchaseOrderItem[]
  shipments: PurchaseOrderShipment[]
  inboundIds?: number[]
  createdAt: string
  updatedAt: string
}

/**
 * Create purchase order request payload.
 */
export interface CreatePurchaseOrderRequest {
  centerId: number
  warehouseId?: number
}

/**
 * Add purchase order item request payload.
 */
export interface AddPurchaseOrderItemRequest {
  productId: number
  quantity: number
}

/**
 * Create shipment request payload.
 */
export interface CreateShipmentRequest {
  shipmentNumber: string
  carrier?: string
  trackingNumber?: string
}

/**
 * Accept purchase order request payload.
 */
export interface AcceptPurchaseOrderRequest {
  id: number
  erpReference: string
}

/**
 * Reject purchase order request payload.
 */
export interface RejectPurchaseOrderRequest {
  id: number
  reason: string
}

/**
 * Cancel purchase order request payload.
 */
export interface CancelPurchaseOrderRequest {
  id: number
  reason: string
}

/**
 * Partial acceptance item payload.
 */
export interface PartialAcceptItem {
  poItemId: number
  acceptedQuantity: number
}

/**
 * Partial accept purchase order request payload.
 */
export interface PartialAcceptRequest {
  id: number
  items: PartialAcceptItem[]
}

/**
 * Receive shipment request payload.
 */
export interface ReceiveShipmentRequest {
  id: number
  shipmentId: number
}
