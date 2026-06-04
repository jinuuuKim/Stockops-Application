/**
 * Purchase order management page component.
 * Displays purchase order list with status-based actions, creation, and detail modals.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus, Eye, Send, PackagePlus, CheckCircle, XCircle, Truck, PackageCheck,
  ChevronLeft, ChevronRight, Split, ClipboardCheck, ArrowRight
} from 'lucide-react'
import {
  usePurchaseOrders,
  usePurchaseOrderById,
  useCreatePurchaseOrder,
  useAddPurchaseOrderItem,
  useSubmitPurchaseOrder,
  useAcceptPurchaseOrder,
  useRejectPurchaseOrder,
  useCancelPurchaseOrder,
  useCreateShipment,
  useCompletePurchaseOrder,
  usePartialAcceptPurchaseOrder,
  useReceivePurchaseOrderShipment,
} from '@/hooks/usePurchaseOrder'
import { useCenters } from '@/hooks/useCenter'
import { useWarehousesByCenter } from '@/hooks/useWarehouse'
import { useProducts } from '@/hooks/useProduct'
import { ProductSelectDropdown } from '@/components/products/ProductSelectDropdown'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchaseOrder'
import { EmptyState } from '@/components/common/EmptyState'

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  REQUESTED: 'border-blue-200 bg-blue-50 text-blue-700',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PARTIALLY_ACCEPTED: 'border-amber-200 bg-amber-50 text-amber-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
  SHIPMENT_CREATED: 'border-violet-200 bg-violet-50 text-violet-700',
  INBOUND_PENDING: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  COMPLETED: 'border-emerald-200 bg-emerald-100 text-emerald-800',
}

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: '초안',
  REQUESTED: '요청됨',
  ACCEPTED: '수락됨',
  PARTIALLY_ACCEPTED: '부분수락',
  REJECTED: '거절됨',
  CANCELLED: '취소됨',
  SHIPMENT_CREATED: '발송등록',
  INBOUND_PENDING: '입고대기',
  COMPLETED: '완료',
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return value
  return parsedDate.toLocaleString('ko-KR')
}

/**
 * Purchase order management page with table, modals, and status transitions.
 *
 * @returns Purchase order page JSX element
 */
export function PurchaseOrderPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailModalForm, setDetailModalForm] = useState<'none' | 'partialAccept' | 'receive'>('none')
  const [showPartialAcceptModal, setShowPartialAcceptModal] = useState(false)
  const [partialAcceptQuantities, setPartialAcceptQuantities] = useState<Record<number, string>>({})
  const [showReceiveShipmentModal, setShowReceiveShipmentModal] = useState(false)
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  const { data: purchaseOrders, isLoading, error, refetch } = usePurchaseOrders()

  const submitMutation = useSubmitPurchaseOrder()
  const acceptMutation = useAcceptPurchaseOrder()
  const rejectMutation = useRejectPurchaseOrder()
  const cancelMutation = useCancelPurchaseOrder()
  const completeMutation = useCompletePurchaseOrder()
  const partialAcceptMutation = usePartialAcceptPurchaseOrder()
  const receiveShipmentMutation = useReceivePurchaseOrderShipment()

  const paginatedPurchaseOrders = useMemo(() => {
    const start = currentPage * pageSize
    return (purchaseOrders ?? []).slice(start, start + pageSize)
  }, [purchaseOrders, currentPage])

  const totalPages = Math.ceil((purchaseOrders?.length ?? 0) / pageSize)

  const handleSubmit = (po: PurchaseOrder) => {
    submitMutation.mutate(po.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      },
    })
  }

  const handleAccept = (po: PurchaseOrder) => {
    acceptMutation.mutate(
      { id: po.id, erpReference: po.erpReference || `ERP-${po.poNumber}` },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
        },
      }
    )
  }

  const handleReject = (po: PurchaseOrder) => {
    rejectMutation.mutate(
      { id: po.id, reason: '재고 부족' },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
        },
      }
    )
  }

  const handleCancel = (po: PurchaseOrder) => {
    cancelMutation.mutate(
      { id: po.id, reason: '요청 변경' },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
        },
      }
    )
  }

  const handleComplete = (po: PurchaseOrder) => {
    completeMutation.mutate(po.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      },
    })
  }

  if (isLoading) {
    return <EmptyState title="로딩 중..." description="발주 데이터를 불러오는 중입니다" variant="empty" />
  }

  if (error) {
    return (
      <EmptyState
        title="데이터 로딩 실패"
        description={error.message}
        variant="error"
        actionLabel="다시 시도"
        onAction={() => void refetch()}
      />
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">발주 관리</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          새 발주
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {purchaseOrders && purchaseOrders.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">발주번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">센터</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">창고</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">총 품목</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">요청일</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedPurchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-900">{po.poNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{po.requestingCenter?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{po.targetWarehouse?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${STATUS_STYLES[po.status]}`}>
                      {STATUS_LABELS[po.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{po.items?.length ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{formatDateTime(po.requestedAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPO(po)
                          setDetailModalForm('none')
                          setShowDetailModal(true)
                        }}
                        className="text-primary-600 hover:text-primary-700"
                        title="상세 보기"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {po.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPO(po)
                              setDetailModalForm('none')
                              setShowDetailModal(true)
                            }}
                            className="text-primary-600 hover:text-primary-700"
                            title="품목 추가"
                          >
                            <PackagePlus className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmit(po)}
                            disabled={submitMutation.isPending}
                            className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                            title="제출"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {po.status === 'REQUESTED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAccept(po)}
                            disabled={acceptMutation.isPending}
                            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            title="수락"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPO(po)
                              setPartialAcceptQuantities({})
                              setShowPartialAcceptModal(true)
                            }}
                            disabled={partialAcceptMutation.isPending}
                            className="text-amber-600 hover:text-amber-700 disabled:opacity-50"
                            title="부분 수락"
                          >
                            <Split className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(po)}
                            disabled={rejectMutation.isPending}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="거절"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(po)}
                            disabled={cancelMutation.isPending}
                            className="text-slate-600 hover:text-slate-700 disabled:opacity-50"
                            title="취소"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {(po.status === 'ACCEPTED' || po.status === 'PARTIALLY_ACCEPTED') && (
                        <>
                          {po.shipments && po.shipments.some((s) => s.status !== 'DELIVERED') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPO(po)
                                setDetailModalForm('receive')
                                setShowDetailModal(true)
                              }}
                              disabled={receiveShipmentMutation.isPending}
                              className="text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                              title="발송 접수"
                            >
                              <ClipboardCheck className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPO(po)
                              setDetailModalForm('none')
                              setShowDetailModal(true)
                            }}
                            className="text-violet-600 hover:text-violet-700"
                            title="발송 등록"
                          >
                            <Truck className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {po.status === 'SHIPMENT_CREATED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPO(po)
                              setSelectedShipmentId(null)
                              setShowReceiveShipmentModal(true)
                            }}
                            disabled={receiveShipmentMutation.isPending}
                            className="text-cyan-600 hover:text-cyan-700 disabled:opacity-50"
                            title="입고 접수"
                          >
                            <PackageCheck className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleComplete(po)}
                            disabled={completeMutation.isPending}
                            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            title="완료"
                          >
                            <PackageCheck className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="등록된 발주가 없습니다"
            description="첫 번째 발주를 생성해보세요"
            actionLabel="새 발주"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200">
          <div className="text-sm text-neutral-500">
            총 {(purchaseOrders ?? []).length}개 중 {currentPage * pageSize + 1}-
            {Math.min((currentPage + 1) * pageSize, (purchaseOrders ?? []).length)}개 표시
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage < 3 ? i : currentPage - 2 + i
                if (pageNum >= totalPages) return null
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-neutral-100'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreatePurchaseOrderModal onClose={() => setShowCreateModal(false)} />
      )}

      {showDetailModal && selectedPO && (
        <PurchaseOrderDetailModal
          purchaseOrder={selectedPO}
          initialForm={detailModalForm}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedPO(null)
            setDetailModalForm('none')
          }}
        />
      )}

      {showPartialAcceptModal && selectedPO && (
        <PartialAcceptModal
          purchaseOrder={selectedPO}
          quantities={partialAcceptQuantities}
          onQuantitiesChange={setPartialAcceptQuantities}
          onClose={() => {
            setShowPartialAcceptModal(false)
            setSelectedPO(null)
            setPartialAcceptQuantities({})
          }}
        />
      )}

      {showReceiveShipmentModal && selectedPO && (
        <ReceiveShipmentModal
          purchaseOrder={selectedPO}
          selectedShipmentId={selectedShipmentId}
          onSelectedShipmentIdChange={setSelectedShipmentId}
          onClose={() => {
            setShowReceiveShipmentModal(false)
            setSelectedPO(null)
            setSelectedShipmentId(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Create purchase order modal component.
 *
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function CreatePurchaseOrderModal({ onClose }: { onClose: () => void }) {
  const [centerId, setCenterId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const { data: centers } = useCenters()
  const { data: warehouses } = useWarehousesByCenter(centerId ? Number(centerId) : null)
  const createMutation = useCreatePurchaseOrder()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!centerId) return

    createMutation.mutate(
      {
        centerId: Number(centerId),
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">새 발주</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="po-center" className="block text-sm font-medium text-neutral-700 mb-1">
              요청 센터 *
            </label>
            <select
              id="po-center"
              value={centerId}
              onChange={(e) => {
                setCenterId(e.target.value)
                setWarehouseId('')
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">센터 선택</option>
              {centers?.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name} ({center.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="po-warehouse" className="block text-sm font-medium text-neutral-700 mb-1">
              입고 창고
            </label>
            <select
              id="po-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">창고 선택</option>
              {warehouses?.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Renders a visual status flow timeline for purchase orders.
 *
 * @param status - Current purchase order status
 * @returns Timeline JSX element
 */
function StatusFlowTimeline({ status }: { status: PurchaseOrderStatus }) {
  const flow: PurchaseOrderStatus[] = [
    'DRAFT',
    'REQUESTED',
    'ACCEPTED',
    'SHIPMENT_CREATED',
    'INBOUND_PENDING',
    'COMPLETED',
  ]

  const terminalStatuses: PurchaseOrderStatus[] = ['REJECTED', 'CANCELLED']
  const isTerminal = terminalStatuses.includes(status)

  const getStepIndex = (s: PurchaseOrderStatus) => {
    if (s === 'PARTIALLY_ACCEPTED') return flow.indexOf('ACCEPTED')
    return flow.indexOf(s)
  }

  const currentIndex = getStepIndex(status)

  const stepLabel = (s: PurchaseOrderStatus) => {
    if (s === 'ACCEPTED') return '수락'
    return STATUS_LABELS[s]
  }

  const stepStyle = (s: PurchaseOrderStatus, index: number) => {
    if (status === s || (s === 'ACCEPTED' && status === 'PARTIALLY_ACCEPTED')) {
      return 'bg-primary-600 text-white border-primary-600'
    }
    if (index < currentIndex) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-300'
    }
    return 'bg-neutral-100 text-neutral-400 border-neutral-200'
  }

  if (isTerminal) {
    return (
      <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="font-medium text-neutral-900 mb-3">상태 흐름</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-neutral-100 text-neutral-500 border-neutral-200">
            {STATUS_LABELS[status]}
          </span>
          <span className="text-sm text-neutral-500">종료된 발주입니다</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="font-medium text-neutral-900 mb-3">상태 흐름</h3>
      <div className="flex items-center gap-1 overflow-x-auto">
        {flow.map((s, index) => (
          <div key={s} className="flex items-center shrink-0">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${stepStyle(s, index)}`}
            >
              {stepLabel(s)}
            </span>
            {index < flow.length - 1 && (
              <ArrowRight className="w-3 h-3 text-neutral-300 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Purchase order detail modal component.
 *
 * @param purchaseOrder - Purchase order data
 * @param initialForm - Initial active form when modal opens
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function PurchaseOrderDetailModal({
  purchaseOrder,
  initialForm,
  onClose,
}: {
  purchaseOrder: PurchaseOrder
  initialForm: 'none' | 'partialAccept' | 'receive'
  onClose: () => void
}) {
  const { data: detail, isLoading } = usePurchaseOrderById(purchaseOrder.id)
  const { data: products } = useProducts()

  const [activeForm, setActiveForm] = useState<
    'none' | 'item' | 'accept' | 'reject' | 'cancel' | 'shipment' | 'partialAccept' | 'receive'
  >(initialForm)
  const [productId, setProductId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState('')
  const [erpReference, setErpReference] = useState('')
  const [reason, setReason] = useState('')
  const [shipmentNumber, setShipmentNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [partialQuantities, setPartialQuantities] = useState<Record<number, string>>({})
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null)

  const addItemMutation = useAddPurchaseOrderItem(purchaseOrder.id)
  const submitMutation = useSubmitPurchaseOrder()
  const acceptMutation = useAcceptPurchaseOrder()
  const rejectMutation = useRejectPurchaseOrder()
  const cancelMutation = useCancelPurchaseOrder()
  const createShipmentMutation = useCreateShipment()
  const completeMutation = useCompletePurchaseOrder()
  const partialAcceptMutation = usePartialAcceptPurchaseOrder()
  const receiveShipmentMutation = useReceivePurchaseOrderShipment()

  const po = detail ?? purchaseOrder

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) return
    const parsedQty = Number(quantity)
    if (Number.isNaN(parsedQty) || parsedQty <= 0) return

    addItemMutation.mutate(
      { productId, quantity: parsedQty },
      {
        onSuccess: () => {
          setProductId(null)
          setQuantity('')
          setActiveForm('none')
        },
      }
    )
  }

  const handleSubmit = () => {
    submitMutation.mutate(po.id)
  }

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault()
    acceptMutation.mutate({ id: po.id, erpReference: erpReference || `ERP-${po.poNumber}` })
  }

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault()
    rejectMutation.mutate({ id: po.id, reason: reason || '재고 부족' })
  }

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault()
    cancelMutation.mutate({ id: po.id, reason: reason || '요청 변경' })
  }

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!shipmentNumber.trim()) return
    createShipmentMutation.mutate(
      {
        id: po.id,
        request: {
          shipmentNumber,
          carrier: carrier || undefined,
          trackingNumber: trackingNumber || undefined,
        },
      },
      {
        onSuccess: () => {
          setShipmentNumber('')
          setCarrier('')
          setTrackingNumber('')
          setActiveForm('none')
        },
      }
    )
  }

  const handleComplete = () => {
    completeMutation.mutate(po.id)
  }

  const handlePartialAccept = (e: React.FormEvent) => {
    e.preventDefault()
    const items = po.items
      .map((item) => ({
        poItemId: item.id,
        acceptedQuantity: Number(partialQuantities[item.id] ?? item.requestedQuantity),
      }))
      .filter((item) => !Number.isNaN(item.acceptedQuantity))

    if (items.length === 0) return

    partialAcceptMutation.mutate(
      { id: po.id, items },
      {
        onSuccess: () => {
          setPartialQuantities({})
          setActiveForm('none')
        },
      }
    )
  }

  const handleReceiveShipment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShipmentId) return

    receiveShipmentMutation.mutate(
      { id: po.id, shipmentId: selectedShipmentId },
      {
        onSuccess: () => {
          setSelectedShipmentId(null)
          setActiveForm('none')
        },
      }
    )
  }

  const isActionPending =
    submitMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    createShipmentMutation.isPending ||
    completeMutation.isPending ||
    partialAcceptMutation.isPending ||
    receiveShipmentMutation.isPending

  const undeliveredShipments = po.shipments?.filter((s) => s.status !== 'DELIVERED') ?? []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">발주 상세</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>

        {isLoading && (
          <div className="mb-4 text-sm text-neutral-600">상세 정보를 불러오는 중...</div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500">발주번호:</span>
            <span className="ml-2 font-mono text-neutral-900">{po.poNumber}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">상태:</span>
            <span className={`ml-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${STATUS_STYLES[po.status]}`}>
              {STATUS_LABELS[po.status]}
            </span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">센터:</span>
            <span className="ml-2 text-neutral-900">{po.requestingCenter?.name || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">창고:</span>
            <span className="ml-2 text-neutral-900">{po.targetWarehouse?.name || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">요청일:</span>
            <span className="ml-2 text-neutral-900">{formatDateTime(po.requestedAt)}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">ERP 응답:</span>
            <span className="ml-2 text-neutral-900">{formatDateTime(po.erpRespondedAt)}</span>
          </div>
          {po.erpReference && (
            <div>
              <span className="text-sm text-neutral-500">ERP 참조:</span>
              <span className="ml-2 font-mono text-neutral-900">{po.erpReference}</span>
            </div>
          )}
          {po.cancelReason && (
            <div>
              <span className="text-sm text-neutral-500">취소 사유:</span>
              <span className="ml-2 text-neutral-900">{po.cancelReason}</span>
            </div>
          )}
        </div>

        <StatusFlowTimeline status={po.status} />

        {/* Status-specific actions */}
        {po.status === 'DRAFT' && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="font-medium text-neutral-900 mb-3">품목 추가</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label htmlFor="po-item-product" className="block text-sm font-medium text-neutral-700 mb-1">상품</label>
                <ProductSelectDropdown
                  value={productId}
                  onChange={setProductId}
                  products={products}
                  placeholder="상품을 검색하세요"
                />
              </div>
              <div>
                <label htmlFor="po-item-qty" className="block text-sm font-medium text-neutral-700 mb-1">수량</label>
                <input
                  id="po-item-qty"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="수량 입력"
                  min="1"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addItemMutation.isPending || !productId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {addItemMutation.isPending ? '추가 중...' : '품목 추가'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending || isActionPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitMutation.isPending ? '제출 중...' : '발주 제출'}
                </button>
              </div>
            </form>
          </div>
        )}

        {po.status === 'REQUESTED' && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="font-medium text-neutral-900 mb-3">상태 전환</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveForm(activeForm === 'accept' ? 'none' : 'accept')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                수락
              </button>
              <button
                type="button"
                onClick={() => setActiveForm(activeForm === 'partialAccept' ? 'none' : 'partialAccept')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-sm font-medium"
              >
                <Split className="w-4 h-4" />
                부분 수락
              </button>
              <button
                type="button"
                onClick={() => setActiveForm(activeForm === 'reject' ? 'none' : 'reject')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                거절
              </button>
              <button
                type="button"
                onClick={() => setActiveForm(activeForm === 'cancel' ? 'none' : 'cancel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 text-white hover:bg-slate-700 text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                취소
              </button>
            </div>

            {activeForm === 'accept' && (
              <form onSubmit={handleAccept} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label htmlFor="po-erp-ref" className="block text-sm font-medium text-neutral-700 mb-1">ERP 참조번호</label>
                  <input
                    id="po-erp-ref"
                    type="text"
                    value={erpReference}
                    onChange={(e) => setErpReference(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={`ERP-${po.poNumber}`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={acceptMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {acceptMutation.isPending ? '처리 중...' : '수락'}
                </button>
              </form>
            )}

            {activeForm === 'partialAccept' && (
              <form onSubmit={handlePartialAccept} className="space-y-3">
                <p className="text-sm text-neutral-600">각 품목의 수락 수량을 입력하세요. 요청 수량 이하로 설정할 수 있습니다.</p>
                <div className="space-y-2">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-sm text-neutral-900 w-32 truncate">{item.product.name}</span>
                      <span className="text-xs text-neutral-500">요청: {item.requestedQuantity}</span>
                      <input
                        type="number"
                        min="0"
                        max={item.requestedQuantity}
                        value={partialQuantities[item.id] ?? item.requestedQuantity}
                        onChange={(e) =>
                          setPartialQuantities((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="w-24 px-2 py-1 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={partialAcceptMutation.isPending || po.items.length === 0}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {partialAcceptMutation.isPending ? '처리 중...' : '부분 수락 적용'}
                </button>
              </form>
            )}

            {activeForm === 'reject' && (
              <form onSubmit={handleReject} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label htmlFor="po-reject-reason" className="block text-sm font-medium text-neutral-700 mb-1">거절 사유</label>
                  <input
                    id="po-reject-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="거절 사유 입력"
                  />
                </div>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? '처리 중...' : '거절'}
                </button>
              </form>
            )}

            {activeForm === 'cancel' && (
              <form onSubmit={handleCancel} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label htmlFor="po-cancel-reason" className="block text-sm font-medium text-neutral-700 mb-1">취소 사유</label>
                  <input
                    id="po-cancel-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="취소 사유 입력"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? '처리 중...' : '취소'}
                </button>
              </form>
            )}
          </div>
        )}

        {(po.status === 'ACCEPTED' || po.status === 'PARTIALLY_ACCEPTED') && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="font-medium text-neutral-900 mb-3">발송 등록</h3>
            <form onSubmit={handleCreateShipment} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="po-ship-num" className="block text-sm font-medium text-neutral-700 mb-1">발송번호 *</label>
                <input
                  id="po-ship-num"
                  type="text"
                  value={shipmentNumber}
                  onChange={(e) => setShipmentNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="SHIP-001"
                  required
                />
              </div>
              <div>
                <label htmlFor="po-carrier" className="block text-sm font-medium text-neutral-700 mb-1">운송사</label>
                <input
                  id="po-carrier"
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="CJ대한통운"
                />
              </div>
              <div>
                <label htmlFor="po-tracking" className="block text-sm font-medium text-neutral-700 mb-1">운송장번호</label>
                <input
                  id="po-tracking"
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="TRK-001"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={createShipmentMutation.isPending}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {createShipmentMutation.isPending ? '등록 중...' : '발송 등록'}
                </button>
              </div>
            </form>

            {undeliveredShipments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setActiveForm(activeForm === 'receive' ? 'none' : 'receive')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 text-sm font-medium"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  발송 접수
                </button>

                {activeForm === 'receive' && (
                  <form onSubmit={handleReceiveShipment} className="mt-3 space-y-3">
                    <p className="text-sm text-neutral-600">접수할 발송을 선택하세요.</p>
                    <div className="space-y-2">
                      {undeliveredShipments.map((shipment) => (
                        <label
                          key={shipment.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedShipmentId === shipment.id
                              ? 'border-cyan-400 bg-cyan-50'
                              : 'border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipment"
                            value={shipment.id}
                            checked={selectedShipmentId === shipment.id}
                            onChange={() => setSelectedShipmentId(shipment.id)}
                            className="text-cyan-600 focus:ring-cyan-500"
                          />
                          <div className="text-sm">
                            <div className="font-medium text-neutral-900">{shipment.shipmentNumber}</div>
                            <div className="text-neutral-500">
                              {shipment.carrier || '-'} / {shipment.trackingNumber || '-'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={receiveShipmentMutation.isPending || !selectedShipmentId}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {receiveShipmentMutation.isPending ? '처리 중...' : '발송 접수'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {po.status === 'SHIPMENT_CREATED' && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="font-medium text-neutral-900 mb-3">발주 완료</h3>
            <button
              type="button"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
            >
              {completeMutation.isPending ? '처리 중...' : '완료 처리'}
            </button>
          </div>
        )}

        {/* Inbound linkage */}
        {(po.status === 'COMPLETED' || po.status === 'INBOUND_PENDING') && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="font-medium text-neutral-900 mb-3">입고 연결</h3>
            {po.inboundIds && po.inboundIds.length > 0 ? (
              <div className="space-y-2">
                {po.inboundIds.map((inboundId) => (
                  <Link
                    key={inboundId}
                    to="/inbound"
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    입고 #{inboundId} 보기
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">
                {po.status === 'COMPLETED'
                  ? '입고가 완료되었습니다.'
                  : '입고 처리 대기 중입니다.'}
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">품목 목록</h3>
        {po.items && po.items.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200 mb-6">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">상품</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">바코드</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">요청수량</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">수락수량</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">취소수량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {po.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-neutral-900">{item.product.name}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600 font-mono">{item.product.barcode}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600 text-right">{item.requestedQuantity}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600 text-right">{item.acceptedQuantity}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600 text-right">{item.cancelledQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-neutral-500 mb-6">등록된 품목이 없습니다.</div>
        )}

        {/* Shipments */}
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">발송 내역</h3>
        {po.shipments && po.shipments.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200 mb-4">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">발송번호</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">운송사</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">운송장</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {po.shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td className="px-4 py-2 text-sm text-neutral-900 font-mono">{shipment.shipmentNumber}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{shipment.carrier || '-'}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{shipment.trackingNumber || '-'}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{shipment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-neutral-500 mb-4">등록된 발송 내역이 없습니다.</div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Partial accept modal component.
 *
 * @param purchaseOrder - Purchase order data
 * @param quantities - Map of itemId to accepted quantity string
 * @param onQuantitiesChange - Quantities change callback
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function PartialAcceptModal({
  purchaseOrder,
  quantities,
  onQuantitiesChange,
  onClose,
}: {
  purchaseOrder: PurchaseOrder
  quantities: Record<number, string>
  onQuantitiesChange: (q: Record<number, string>) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const partialAcceptMutation = usePartialAcceptPurchaseOrder()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const items = purchaseOrder.items
      .map((item) => ({
        poItemId: item.id,
        acceptedQuantity: Number(quantities[item.id] ?? item.requestedQuantity),
      }))
      .filter((item) => !Number.isNaN(item.acceptedQuantity))

    if (items.length === 0) return

    partialAcceptMutation.mutate(
      { id: purchaseOrder.id, items },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">부분 수락</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>
        <p className="text-sm text-neutral-600 mb-4">각 품목의 수락 수량을 입력하세요. 요청 수량 이하로 설정할 수 있습니다.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {purchaseOrder.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <span className="text-sm text-neutral-900 w-32 truncate">{item.product.name}</span>
              <span className="text-xs text-neutral-500">요청: {item.requestedQuantity}</span>
              <input
                type="number"
                min="0"
                max={item.requestedQuantity}
                value={quantities[item.id] ?? item.requestedQuantity}
                onChange={(e) => onQuantitiesChange({ ...quantities, [item.id]: e.target.value })}
                className="w-24 px-2 py-1 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={partialAcceptMutation.isPending || purchaseOrder.items.length === 0}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {partialAcceptMutation.isPending ? '처리 중...' : '부분 수락 적용'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Receive shipment modal component.
 *
 * @param purchaseOrder - Purchase order data
 * @param selectedShipmentId - Selected shipment ID
 * @param onSelectedShipmentIdChange - Selected shipment change callback
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function ReceiveShipmentModal({
  purchaseOrder,
  selectedShipmentId,
  onSelectedShipmentIdChange,
  onClose,
}: {
  purchaseOrder: PurchaseOrder
  selectedShipmentId: number | null
  onSelectedShipmentIdChange: (id: number | null) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const receiveShipmentMutation = useReceivePurchaseOrderShipment()

  const undeliveredShipments = purchaseOrder.shipments?.filter((s) => s.status !== 'DELIVERED') ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShipmentId) return

    receiveShipmentMutation.mutate(
      { id: purchaseOrder.id, shipmentId: selectedShipmentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">입고 접수</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>
        <p className="text-sm text-neutral-600 mb-4">접수할 발송을 선택하세요.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {undeliveredShipments.length > 0 ? (
            undeliveredShipments.map((shipment) => (
              <label
                key={shipment.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedShipmentId === shipment.id
                    ? 'border-cyan-400 bg-cyan-50'
                    : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <input
                  type="radio"
                  name="shipment"
                  value={shipment.id}
                  checked={selectedShipmentId === shipment.id}
                  onChange={() => onSelectedShipmentIdChange(shipment.id)}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <div className="text-sm">
                  <div className="font-medium text-neutral-900">{shipment.shipmentNumber}</div>
                  <div className="text-neutral-500">
                    {shipment.carrier || '-'} / {shipment.trackingNumber || '-'}
                  </div>
                </div>
              </label>
            ))
          ) : (
            <p className="text-sm text-neutral-500">접수 가능한 발송이 없습니다.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={receiveShipmentMutation.isPending || !selectedShipmentId || undeliveredShipments.length === 0}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
            >
              {receiveShipmentMutation.isPending ? '처리 중...' : '입고 접수'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
