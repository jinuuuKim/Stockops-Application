/**
 * Outbound management page component.
 * Displays outbound list with filtering, creation, and confirmation capabilities.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, CheckCircle, X, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import type { OutboundDTO, OutboundItemDTO, OutboundStatus } from '@/types/outbound'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CreateOutboundModal } from '@/components/outbound/CreateOutboundModal'

const OUTBOUND_STATUS_LABELS: Record<OutboundStatus, string> = {
  DRAFT: '피킹 대기',
  CONFIRMED: '출고 확정',
}

function getOutboundStatusLabel(status: OutboundStatus): string {
  return OUTBOUND_STATUS_LABELS[status] ?? status
}

/**
 * Outbound management page with table, filtering, and CRUD operations.
 *
 * @returns Outbound page JSX element
 */
export function OutboundPage() {
  const [statusFilter, setStatusFilter] = useState<OutboundStatus | ''>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOutbound, setSelectedOutbound] = useState<OutboundDTO | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10
  const queryClient = useQueryClient()

  const { data: outbounds = [], isLoading } = useQuery({
    queryKey: ['outbounds', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const response = await api.get<OutboundDTO[]>(`/v1/outbounds${params}`)
      return Array.isArray(response.data) ? response.data : []
    },
  })

  const paginatedOutbounds = useMemo(() => {
    const start = currentPage * pageSize
    return outbounds.slice(start, start + pageSize)
  }, [outbounds, currentPage])

  const totalPages = Math.ceil(outbounds.length / pageSize)

  const confirmMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<OutboundDTO>(`/v1/outbounds/${id}/confirm`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbounds'] })
    },
  })

  const handleConfirm = (id: number) => {
    setConfirmDialog({ open: true, id })
  }

  const executeConfirm = async () => {
    if (confirmDialog.id !== null) {
      confirmMutation.mutate(confirmDialog.id)
    }
    setConfirmDialog({ open: false, id: null })
  }

  const handleViewDetails = (outbound: OutboundDTO) => {
    setSelectedOutbound(outbound)
    setIsDetailModalOpen(true)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">출고 관리</h1>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          신규 출고 등록
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-neutral-700">상태 필터</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OutboundStatus | '')}
          className="w-full sm:w-auto p-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">전체</option>
          <option value="DRAFT">피킹 대기</option>
          <option value="CONFIRMED">출고 확정</option>
        </select>
      </div>

      {isLoading ? (
        <EmptyState
          title="출고 로딩 중"
          description="출고 요청과 피킹 상태를 불러오는 중입니다."
          variant="empty"
        />
      ) : outbounds.length === 0 ? (
        <EmptyState
          title="표시할 출고 건이 없습니다"
          description="출고 등록 후 FEFO 기준으로 LOT 피킹을 확정할 수 있습니다."
          actionLabel="출고 등록"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">일자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">고객</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">총 수량</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {paginatedOutbounds.map((outbound) => (
                    <tr key={outbound.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{outbound.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{outbound.outboundDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{outbound.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          outbound.status === 'CONFIRMED'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {getOutboundStatusLabel(outbound.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{outbound.totalQuantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(outbound)}
                            className="text-primary-600 hover:text-primary-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="상세 보기"
                            aria-label={`출고 ${outbound.id} 상세 보기`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {outbound.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleConfirm(outbound.id)}
                              className="text-green-600 hover:text-green-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="출고 확정"
                              aria-label={`출고 ${outbound.id} 확정`}
                              disabled={confirmMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-neutral-200">
              {paginatedOutbounds.map((outbound) => (
                <div key={outbound.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-500">#{outbound.id}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      outbound.status === 'CONFIRMED'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {getOutboundStatusLabel(outbound.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-neutral-500 block">일자</span>
                      <span className="text-neutral-900">{outbound.outboundDate}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">고객</span>
                      <span className="text-neutral-900">{outbound.customer}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">총 수량</span>
                      <span className="text-neutral-900">{outbound.totalQuantity}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(outbound)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      상세
                    </button>
                    {outbound.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handleConfirm(outbound.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4" />
                        확정
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200">
              <div className="text-sm text-neutral-500">
                총 {outbounds.length}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, outbounds.length)}개 표시
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
        </>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null })}
        onConfirm={() => void executeConfirm()}
        title="출고 확정"
        description="출고를 확정하시겠습니까? FEFO 방식으로 LOT이 할당되고 재고가 차감됩니다."
        confirmLabel="확정"
      />

      {isCreateModalOpen && (
        <CreateOutboundModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['outbounds'] })
          }}
        />
      )}

      {isDetailModalOpen && selectedOutbound && (
        <OutboundDetailModal
          outbound={selectedOutbound}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedOutbound(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Outbound detail modal showing items and lot allocations.
 *
 * @param outbound - Outbound data to display
 * @param onClose - Callback when modal is closed
 */
function OutboundDetailModal({ outbound, onClose }: { outbound: OutboundDTO; onClose: () => void }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['outbound-items', outbound.id],
    queryFn: async () => {
      const response = await api.get<OutboundItemDTO[]>(`/v1/outbounds/${outbound.id}/items`)
      return Array.isArray(response.data) ? response.data : []
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">출고 #{outbound.id} 상세</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-neutral-500">일자</span>
            <p className="text-neutral-900">{outbound.outboundDate}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-neutral-500">고객</span>
            <p className="text-neutral-900">{outbound.customer}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-neutral-500">상태</span>
            <p>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                outbound.status === 'CONFIRMED' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-warning/10 text-warning'
              }`}>
              {getOutboundStatusLabel(outbound.status)}
              </span>
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-neutral-500">총 수량</span>
            <p className="text-neutral-900">{outbound.totalQuantity}</p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2 text-neutral-700">항목</h3>
          {isLoading ? (
            <div className="text-neutral-600">품목을 불러오는 중입니다...</div>
          ) : items.length === 0 ? (
            <div className="text-neutral-500 text-sm">추가된 출고 품목이 없습니다.</div>
          ) : (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">상품</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">LOT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">수량</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-neutral-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-neutral-400" />
                          {item.productName}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-neutral-900">
                        {item.lotNumber || <span className="text-neutral-400 italic">FEFO 배정 대기</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-neutral-900">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 min-h-[44px] border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
