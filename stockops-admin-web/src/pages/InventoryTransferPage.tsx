/**
 * Inventory transfer management page component.
 * Displays transfer list with creation, completion, and cancellation capabilities.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Check, X, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useInventoryTransfers,
  useCreateInventoryTransfer,
  useCompleteInventoryTransfer,
  useCancelInventoryTransfer,
} from '@/hooks/useInventoryTransfer'
import { useProducts } from '@/hooks/useProduct'
import { useLocations } from '@/hooks/useLocation'
import { ProductSelectDropdown } from '@/components/products/ProductSelectDropdown'
import type { ProductDTO } from '@/types/product'
import type { Location } from '@/types/location'
import { EmptyState } from '@/components/common/EmptyState'
import type { InventoryTransferStatus } from '@/types/inventoryTransfer'

/**
 * Returns Korean label and Tailwind classes for a transfer status.
 *
 * @param status - Transfer status
 * @returns Label and style classes
 */
function getStatusDisplay(status: InventoryTransferStatus) {
  switch (status) {
    case 'REQUESTED':
      return { label: '요청됨', className: 'bg-primary-50 text-primary-700' }
    case 'COMPLETED':
      return { label: '완료', className: 'bg-success/10 text-success' }
    case 'CANCELLED':
      return { label: '취소됨', className: 'bg-neutral-100 text-neutral-600' }
    default:
      return { label: status, className: 'bg-neutral-100 text-neutral-600' }
  }
}

/**
 * Inventory transfer management page with table, filters, and modals.
 *
 * @returns InventoryTransfer page JSX element
 */
export function InventoryTransferPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  const { data: transfers, isLoading, error, refetch } = useInventoryTransfers()
  const { data: products } = useProducts()
  const { data: locations } = useLocations()

  const productMap = useMemo(() => {
    const map = new Map<number, string>()
    products?.forEach((p) => {
      map.set(p.id, p.name)
    })
    return map
  }, [products])

  const locationMap = useMemo(() => {
    const map = new Map<number, string>()
    locations?.forEach((l) => {
      map.set(l.id, `${l.code} - ${l.name}`)
    })
    return map
  }, [locations])

  const paginatedTransfers = useMemo(() => {
    const start = currentPage * pageSize
    return (transfers ?? []).slice(start, start + pageSize)
  }, [transfers, currentPage])

  const totalPages = Math.ceil((transfers?.length ?? 0) / pageSize)

  if (isLoading) {
    return <EmptyState title="로딩 중..." description="재고 이동 데이터를 불러오는 중입니다" variant="empty" />
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
        <h1 className="text-2xl font-bold text-neutral-900">재고 이동 관리</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          재고 이동 요청
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {transfers && transfers.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">상품</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">출발 위치</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">도착 위치</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">요청일</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedTransfers.map((transfer) => {
                const statusDisplay = getStatusDisplay(transfer.status)
                return (
                  <tr key={transfer.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{transfer.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {productMap.get(transfer.productId) || `상품 #${transfer.productId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {locationMap.get(transfer.fromLocationId) || `위치 #${transfer.fromLocationId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {locationMap.get(transfer.toLocationId) || `위치 #${transfer.toLocationId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{transfer.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${statusDisplay.className}`}>
                        {statusDisplay.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {new Date(transfer.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {transfer.status === 'REQUESTED' && (
                          <>
                            <CompleteButton
                              transferId={transfer.id}
                              onCompleted={() => queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] })}
                            />
                            <CancelButton
                              transferId={transfer.id}
                              onCancelled={() => queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] })}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="재고 이동 내역이 없습니다"
            description="새로운 재고 이동을 요청하여 시작하세요"
            actionLabel="재고 이동 요청"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200">
          <div className="text-sm text-neutral-500">
            총 {(transfers ?? []).length}개 중 {currentPage * pageSize + 1}-
            {Math.min((currentPage + 1) * pageSize, (transfers ?? []).length)}개 표시
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
                      currentPage === pageNum ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'
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
        <CreateTransferModal
          onClose={() => setShowCreateModal(false)}
          products={products}
          locations={locations}
        />
      )}
    </div>
  )
}

/**
 * Complete action button for a transfer.
 *
 * @param transferId - Transfer identifier
 * @param onCompleted - Callback on success
 * @returns Button JSX element
 */
function CompleteButton({ transferId, onCompleted }: { transferId: number; onCompleted: () => void }) {
  const mutation = useCompleteInventoryTransfer()

  return (
    <button
      type="button"
      onClick={() =>
        mutation.mutate(transferId, {
          onSuccess: onCompleted,
        })
      }
      disabled={mutation.isPending}
      className="text-success hover:text-green-700 disabled:opacity-50"
      title="완료"
    >
      <Check className="w-5 h-5" />
    </button>
  )
}

/**
 * Cancel action button for a transfer.
 *
 * @param transferId - Transfer identifier
 * @param onCancelled - Callback on success
 * @returns Button JSX element
 */
function CancelButton({ transferId, onCancelled }: { transferId: number; onCancelled: () => void }) {
  const mutation = useCancelInventoryTransfer()

  return (
    <button
      type="button"
      onClick={() =>
        mutation.mutate(transferId, {
          onSuccess: onCancelled,
        })
      }
      disabled={mutation.isPending}
      className="text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
      title="취소"
    >
      <X className="w-5 h-5" />
    </button>
  )
}

/**
 * Create transfer modal component.
 *
 * @param onClose - Close callback
 * @param products - Available products
 * @param locations - Available locations
 * @returns Modal JSX element
 */
function CreateTransferModal({
  onClose,
  products,
  locations,
}: {
  onClose: () => void
  products: ProductDTO[] | undefined
  locations: Location[] | undefined
}) {
  const [productId, setProductId] = useState<number | null>(null)
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const createMutation = useCreateInventoryTransfer()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) return

    const parsedQuantity = Number(quantity)
    const parsedFromLocationId = Number(fromLocationId)
    const parsedToLocationId = Number(toLocationId)

    if (!quantity.trim() || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return
    }
    if (!fromLocationId.trim() || Number.isNaN(parsedFromLocationId)) {
      return
    }
    if (!toLocationId.trim() || Number.isNaN(parsedToLocationId)) {
      return
    }
    if (parsedFromLocationId === parsedToLocationId) {
      return
    }

    createMutation.mutate(
      {
        productId,
        fromLocationId: parsedFromLocationId,
        toLocationId: parsedToLocationId,
        quantity: parsedQuantity,
        notes: notes.trim() || undefined,
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-bold text-neutral-900">재고 이동 요청</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="product" className="block text-sm font-medium text-neutral-700 mb-1">
              상품
            </label>
            <ProductSelectDropdown
              value={productId}
              onChange={setProductId}
              products={products}
              loading={false}
              placeholder="상품을 선택하세요"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="from-location" className="block text-sm font-medium text-neutral-700 mb-1">
              출발 위치
            </label>
            <select
              id="from-location"
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">출발 위치 선택</option>
              {locations?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="to-location" className="block text-sm font-medium text-neutral-700 mb-1">
              도착 위치
            </label>
            <select
              id="to-location"
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">도착 위치 선택</option>
              {locations?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-neutral-700 mb-1">
              수량
            </label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="이동할 수량을 입력하세요"
              min="1"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
              비고
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="선택 사항"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
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
              {createMutation.isPending ? '요청 중...' : '요청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
