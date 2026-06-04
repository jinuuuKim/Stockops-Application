/**
 * Stock adjustment management page component.
 * Displays pending adjustments with approval/rejection and creation capabilities.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useMemo } from 'react'
import { Plus, Check, X, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import {
  useAdjustmentReasonCodes,
  useAdjustInventory,
  usePendingAdjustments,
  useApproveAdjustment,
} from '@/hooks/useAdjustInventory'
import { useInventory } from '@/hooks/useInventory'
import { EmptyState } from '@/components/common/EmptyState'
import type { StockAdjustment } from '@/types/stockAdjustment'
import type { Inventory } from '@/types/inventory'

/**
 * Stock adjustment page with pending list and creation modal.
 *
 * @returns Stock adjustment page JSX element
 */
export function StockAdjustmentPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  const {
    data: pendingAdjustments,
    isLoading,
    error,
    refetch,
  } = usePendingAdjustments()

  const paginatedAdjustments = useMemo(() => {
    const start = currentPage * pageSize
    return (pendingAdjustments ?? []).slice(start, start + pageSize)
  }, [pendingAdjustments, currentPage])

  const totalPages = Math.ceil((pendingAdjustments?.length ?? 0) / pageSize)

  if (isLoading) {
    return (
      <EmptyState
        title="로딩 중..."
        description="재고 조정 데이터를 불러오는 중입니다"
        variant="empty"
      />
    )
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
        <h1 className="text-2xl font-bold text-neutral-900">재고 조정 관리</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          조정 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {pendingAdjustments && pendingAdjustments.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  재고 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  현재 → 신규
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  차이
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  사유
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  요청자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  요청일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedAdjustments.map((adjustment) => (
                <tr key={adjustment.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {adjustment.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {adjustment.inventoryInfo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {adjustment.beforeQuantity} → {adjustment.afterQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    <span
                      className={`font-medium ${
                        adjustment.difference > 0 ? 'text-success' : adjustment.difference < 0 ? 'text-error' : 'text-neutral-600'
                      }`}
                    >
                      {adjustment.difference > 0 ? '+' : ''}
                      {adjustment.difference}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {adjustment.reasonCodeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {adjustment.createdByName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {adjustment.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <ApproveButton adjustment={adjustment} />
                      <RejectButton adjustment={adjustment} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="대기 중인 조정 요청이 없습니다"
            description="새로운 재고 조정을 등록할 수 있습니다"
      actionLabel="조정 등록"
      onAction={() => setShowCreateModal(true)}
      icon={ClipboardList}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200">
          <div className="text-sm text-neutral-500">
            총 {(pendingAdjustments ?? []).length}개 중 {currentPage * pageSize + 1}-
            {Math.min(
              (currentPage + 1) * pageSize,
              (pendingAdjustments ?? []).length
            )}
            개 표시
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
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateAdjustmentModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}

/**
 * Approve button for a pending adjustment.
 *
 * @param adjustment - The adjustment to approve
 */
function ApproveButton({ adjustment }: { adjustment: StockAdjustment }) {
  const approveMutation = useApproveAdjustment()

  const handleApprove = () => {
    approveMutation.mutate(
      { adjustmentId: adjustment.id, approved: true },
      {
        onSuccess: () => {
        },
      }
    )
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={approveMutation.isPending}
      className="text-success hover:text-green-700 disabled:opacity-50"
      title="승인"
    >
      <Check className="w-5 h-5" />
    </button>
  )
}

/**
 * Reject button for a pending adjustment.
 *
 * @param adjustment - The adjustment to reject
 */
function RejectButton({ adjustment }: { adjustment: StockAdjustment }) {
  const approveMutation = useApproveAdjustment()

  const handleReject = () => {
    approveMutation.mutate(
      { adjustmentId: adjustment.id, approved: false },
      {
        onSuccess: () => {
        },
      }
    )
  }

  return (
    <button
      type="button"
      onClick={handleReject}
      disabled={approveMutation.isPending}
      className="text-error hover:text-red-700 disabled:opacity-50"
      title="거절"
    >
      <X className="w-5 h-5" />
    </button>
  )
}

/**
 * Create adjustment modal component.
 *
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function CreateAdjustmentModal({ onClose }: { onClose: () => void }) {
  const { data: inventoryItems, isLoading: inventoryLoading } = useInventory()
  const { data: reasonCodes, isLoading: reasonCodesLoading } =
    useAdjustmentReasonCodes()
  const adjustMutation = useAdjustInventory()

  const [inventoryId, setInventoryId] = useState<number | ''>('')
  const [newQuantity, setNewQuantity] = useState('')
  const [reasonCodeId, setReasonCodeId] = useState<number | ''>('')
  const [note, setNote] = useState('')

  const selectedInventory = inventoryItems?.find(
    (item: Inventory) => item.id === Number(inventoryId)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedInventoryId = Number(inventoryId)
    const parsedNewQuantity = Number(newQuantity)
    const parsedReasonCodeId = Number(reasonCodeId)

    if (
      !inventoryId ||
      Number.isNaN(parsedInventoryId) ||
      !newQuantity.trim() ||
      Number.isNaN(parsedNewQuantity) ||
      parsedNewQuantity < 0 ||
      !reasonCodeId ||
      Number.isNaN(parsedReasonCodeId)
    ) {
      return
    }

    adjustMutation.mutate(
      {
        inventoryId: parsedInventoryId,
        newQuantity: parsedNewQuantity,
        reasonCodeId: parsedReasonCodeId,
        note: note.trim() || undefined,
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
        <h2 className="text-xl font-bold text-neutral-900 mb-4">재고 조정 등록</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="inventory-select"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              재고 항목
            </label>
            <select
              id="inventory-select"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              disabled={inventoryLoading}
            >
              <option value="">재고 항목 선택</option>
              {inventoryItems?.map((item: Inventory) => (
                <option key={item.id} value={item.id}>
                  {item.productName} ({item.locationCode}) - LOT: {item.lotNumber} - 현재: {item.quantity}
                </option>
              ))}
            </select>
            {inventoryLoading && (
              <p className="mt-1 text-sm text-neutral-500">재고 목록 로딩 중...</p>
            )}
            {selectedInventory && (
              <p className="mt-1 text-sm text-neutral-600">
                현재 수량: {selectedInventory.quantity}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="new-quantity"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              신규 수량
            </label>
            <input
              id="new-quantity"
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="조정 후 수량을 입력하세요"
              min="0"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="reason-code"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              조정 사유
            </label>
            <select
              id="reason-code"
              value={reasonCodeId}
              onChange={(e) =>
                setReasonCodeId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              disabled={reasonCodesLoading}
            >
              <option value="">사유 선택</option>
              {reasonCodes?.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
            {reasonCodesLoading && (
              <p className="mt-1 text-sm text-neutral-500">사유 코드 로딩 중...</p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="note"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              비고
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="조정 사유를 상세히 입력하세요 (선택)"
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
              disabled={adjustMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {adjustMutation.isPending ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
