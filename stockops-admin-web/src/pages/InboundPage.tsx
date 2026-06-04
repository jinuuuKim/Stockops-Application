/**
 * Inbound management page component.
 * Displays inbound list with filtering, creation, and confirmation capabilities.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Check, Package, ScanBarcode, Download, Upload, ChevronLeft, ChevronRight, WifiOff, RefreshCw, Database } from 'lucide-react'
import { useInbounds, useInboundItems, useAddInboundItem, useConfirmInbound } from '@/hooks/useInbound'
import { useProducts } from '@/hooks/useProduct'
import { useLocations } from '@/hooks/useLocation'
import { useCenters } from '@/hooks/useCenter'
import { useWarehousesByCenter } from '@/hooks/useWarehouse'
import { useOfflineInbound } from '@/hooks/useOfflineInbound'
import { ProductSelectDropdown } from '@/components/products/ProductSelectDropdown'
import { BarcodeScanner } from '@/components/common/BarcodeScanner'
import { ExcelUploadModal } from '@/components/common/ExcelUploadModal'
import { OfflineInboundQueue } from '@/components/offline/OfflineInboundQueue'
import { downloadExcelTemplate } from '@/api/excel'
import type { Inbound, InboundStatus } from '@/types/inbound'
import type { Location } from '@/types/location'
import { EmptyState } from '@/components/common/EmptyState'
import { CreateInboundModal } from '@/components/inbound/CreateInboundModal'

const INBOUND_STATUS_LABELS: Record<InboundStatus, string> = {
  DRAFT: '검수 대기',
  CONFIRMED: '입고 확정',
}

function getInboundStatusLabel(status: InboundStatus): string {
  return INBOUND_STATUS_LABELS[status] ?? status
}

/**
 * Inbound management page with table, filters, and modals.
 *
 * @returns Inbound page JSX element
 */
export function InboundPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InboundStatus | ''>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInbound, setSelectedInbound] = useState<Inbound | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showQueueModal, setShowQueueModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  const { data: inbounds, isLoading, error, refetch } = useInbounds(statusFilter || undefined)
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineInbound()

  const paginatedInbounds = useMemo(() => {
    const start = currentPage * pageSize
    return (inbounds ?? []).slice(start, start + pageSize)
  }, [inbounds, currentPage])

  const totalPages = Math.ceil((inbounds?.length ?? 0) / pageSize)

  if (isLoading) {
    return <EmptyState title="로딩 중..." description="입고 데이터를 불러오는 중입니다" variant="empty" />
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">입고 관리</h1>
          {!isOnline && (
            <span className="flex items-center gap-1 px-2 py-1 bg-error/10 text-error text-xs font-medium rounded">
              <WifiOff className="w-3 h-3" />
              오프라인
            </span>
          )}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setShowQueueModal(true)}
              className="flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded hover:bg-warning/20 transition-colors"
            >
              <Database className="w-3 h-3" />
              대기 {pendingCount}개
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {pendingCount > 0 && isOnline && (
            <button
              type="button"
              onClick={() => void syncPending()}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 sm:px-4 py-2 text-sm text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? '동기화 중...' : '동기화'}</span>
              <span className="sm:hidden">{isSyncing ? '동기화 중...' : '동기화'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void downloadExcelTemplate('inbounds')}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 sm:px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">템플릿 다운로드</span>
            <span className="sm:hidden">템플릿</span>
          </button>
          <button
            type="button"
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 sm:px-4 py-2 text-sm text-primary-700 hover:bg-primary-100 transition-colors min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">엑셀 업로드</span>
            <span className="sm:hidden">업로드</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors min-h-[44px] text-sm"
          >
            <Plus className="w-5 h-5" />
            입고 등록
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 mb-1">상태 필터</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InboundStatus | '')}
          className="w-full sm:w-auto px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">전체 상태</option>
          <option value="DRAFT">검수 대기</option>
          <option value="CONFIRMED">입고 확정</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {inbounds && inbounds.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">일자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">공급처</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">총 수량</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {paginatedInbounds.map((inbound) => (
                    <tr key={inbound.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{inbound.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{inbound.inboundDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{inbound.supplier || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          inbound.status === 'CONFIRMED'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {getInboundStatusLabel(inbound.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{inbound.totalQuantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInbound(inbound)
                              setShowDetailModal(true)
                            }}
                            className="text-primary-600 hover:text-primary-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="상세 보기"
                            aria-label={`입고 ${inbound.id} 상세 보기`}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {inbound.status === 'DRAFT' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInbound(inbound)
                                  setShowAddItemModal(true)
                                }}
                                className="text-primary-600 hover:text-primary-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="품목 추가"
                                aria-label={`입고 ${inbound.id} 품목 추가`}
                              >
                                <Package className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInbound(inbound)
                                  setShowDetailModal(true)
                                }}
                                className="text-success hover:text-green-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="입고 확정"
                                aria-label={`입고 ${inbound.id} 확정`}
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-neutral-200">
              {paginatedInbounds.map((inbound) => (
                <div key={inbound.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-500">#{inbound.id}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      inbound.status === 'CONFIRMED'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {getInboundStatusLabel(inbound.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-neutral-500 block">일자</span>
                      <span className="text-neutral-900">{inbound.inboundDate}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">공급처</span>
                      <span className="text-neutral-900">{inbound.supplier || '-'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">총 수량</span>
                      <span className="text-neutral-900">{inbound.totalQuantity}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInbound(inbound)
                        setShowDetailModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      상세
                    </button>
                    {inbound.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInbound(inbound)
                            setShowAddItemModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          추가
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInbound(inbound)
                            setShowDetailModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-white bg-success rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          확정
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="표시할 입고 건이 없습니다"
            description="입고 등록 후 검수 품목, LOT, 유통기한, 적치 위치를 추가할 수 있습니다."
            actionLabel="입고 등록"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

       {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200">
          <div className="text-sm text-neutral-500">
            총 {(inbounds ?? []).length}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, (inbounds ?? []).length)}개 표시
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
        <CreateInboundModal onClose={() => setShowCreateModal(false)} />
      )}

      {showDetailModal && selectedInbound && (
        <InboundDetailModal
          inbound={selectedInbound}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedInbound(null)
          }}
        />
      )}

      {showAddItemModal && selectedInbound && (
        <AddItemModal
          inboundId={selectedInbound.id}
          onClose={() => {
            setShowAddItemModal(false)
            setSelectedInbound(null)
          }}
        />
      )}

      <ExcelUploadModal
        isOpen={showExcelModal}
        entityType="inbounds"
        entityLabel="입고"
        onClose={() => setShowExcelModal(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['inbounds'] })}
      />

      <OfflineInboundQueue
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        onSyncAll={syncPending}
        isSyncing={isSyncing}
        isOnline={isOnline}
      />
    </div>
  )
}

/**
 * Inbound detail modal component.
 *
 * @param inbound - Inbound data
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function InboundDetailModal({ inbound, onClose }: { inbound: Inbound; onClose: () => void }) {
  const { data: items, isLoading } = useInboundItems(inbound.id)
  const confirmMutation = useConfirmInbound()
  const queryClient = useQueryClient()

  const handleConfirm = () => {
    confirmMutation.mutate(inbound.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inbounds'] })
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">입고 #{inbound.id}</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500">입고일:</span>
            <span className="ml-2 text-neutral-900">{inbound.inboundDate}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">공급처:</span>
            <span className="ml-2 text-neutral-900">{inbound.supplier || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">상태:</span>
            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
              inbound.status === 'CONFIRMED' 
                ? 'bg-success/10 text-success' 
                : 'bg-warning/10 text-warning'
            }`}>
              {getInboundStatusLabel(inbound.status)}
            </span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">총 수량:</span>
            <span className="ml-2 text-neutral-900">{inbound.totalQuantity}</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-neutral-900 mb-2">검수 품목</h3>
        {isLoading ? (
          <div className="text-neutral-600">품목을 불러오는 중입니다...</div>
        ) : items && items.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">상품</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">LOT</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">유통기한</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">수량</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">위치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-neutral-900">{item.productName}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{item.lotNumber}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{item.expiryDate || '-'}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{item.locationCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-neutral-500">아직 추가된 품목이 없습니다.</div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
          >
            닫기
          </button>
          {inbound.status === 'DRAFT' && items && items.length > 0 && (
            <button
              onClick={handleConfirm}
              type="button"
              disabled={confirmMutation.isPending}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {confirmMutation.isPending ? '확정 중...' : '입고 확정'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Add item modal component.
 *
 * @param inboundId - Inbound identifier
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function AddItemModal({ inboundId, onClose }: { inboundId: number; onClose: () => void }) {
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: locations } = useLocations()
  const { data: centers } = useCenters()
  const addItemMutation = useAddInboundItem(inboundId)
  const { saveOffline, isOnline } = useOfflineInbound()

  const [productId, setProductId] = useState<number | null>(null)
  const [lotNumber, setLotNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [locationId, setLocationId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')

  const selectedCenterId = centerId ? Number(centerId) : null
  const { data: warehouses } = useWarehousesByCenter(selectedCenterId)

  const handleBarcodeScan = (barcode: string) => {
    const product = products?.find((p) => p.barcode === barcode)
    if (product) {
      setProductId(product.id)
      setScanError('')
      setShowScanner(false)
    } else {
      setScanError(`바코드 '${barcode}'에 해당하는 상품을 찾을 수 없습니다.`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) return

    const parsedQuantity = Number(quantity)
    const parsedLocationId = Number(locationId)

    if (!quantity.trim() || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return
    }

    if (!locationId.trim() || Number.isNaN(parsedLocationId)) {
      return
    }

    if (!isOnline) {
      const product = products?.find((p) => p.id === productId)
      if (!product) return
      if (!centerId.trim() || !warehouseId.trim()) return

      void saveOffline({
        productBarcode: product.barcode,
        quantity: parsedQuantity,
        lotNumber,
        expiryDate: expiryDate || undefined,
        locationId: parsedLocationId,
        warehouseId: Number(warehouseId),
        centerId: Number(centerId),
      })

      setProductId(null)
      setLotNumber('')
      setExpiryDate('')
      setQuantity('')
      setLocationId('')
      setCenterId('')
      setWarehouseId('')
      onClose()
      return
    }

    addItemMutation.mutate(
      {
        productId,
        lotNumber,
        expiryDate: expiryDate || undefined,
        quantity: parsedQuantity,
        locationId: parsedLocationId,
      },
      {
        onSuccess: () => {
          setProductId(null)
          setLotNumber('')
          setExpiryDate('')
          setQuantity('')
          setLocationId('')
          setCenterId('')
          setWarehouseId('')
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-900">입고 품목 추가</h2>
          {!isOnline && (
            <span className="flex items-center gap-1 px-2 py-1 bg-error/10 text-error text-xs font-medium rounded">
              <WifiOff className="w-3 h-3" />
              오프라인 저장 모드
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">상품</label>
            {!showScanner ? (
              <>
                <ProductSelectDropdown
                  value={productId}
                  onChange={setProductId}
                  products={products}
                  loading={productsLoading}
                  placeholder="상품명 또는 바코드로 검색"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-3 min-h-[48px] text-base font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <ScanBarcode className="w-5 h-5" />
                  바코드 스캔
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  placeholder="상품 바코드를 스캔하세요"
                  onSuccess={() => setScanError('')}
                  onError={(err) => setScanError(err)}
                />
                {scanError && (
                  <p className="text-sm text-error">{scanError}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(false)
                    setScanError('')
                  }}
                  className="text-sm text-neutral-600 hover:text-neutral-700"
                >
                  수동 선택으로 돌아가기
                </button>
              </div>
            )}
            {productId && !showScanner && products && (
              <p className="mt-1 text-sm text-success">
                선택됨: {products.find((p) => p.id === productId)?.name}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">LOT 번호</label>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="LOT 번호를 입력하세요"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">유통기한</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">수량</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="수량을 입력하세요"
              min="1"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">센터</label>
            <select
              value={centerId}
              onChange={(e) => {
                setCenterId(e.target.value)
                setWarehouseId('')
              }}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required={!isOnline}
            >
              <option value="">센터 선택</option>
              {centers?.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.code} - {center.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">창고</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required={!isOnline}
              disabled={!centerId}
            >
              <option value="">창고 선택</option>
              {warehouses?.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">적치 위치</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">위치 선택</option>
              {locations?.map((location: Location) => (
                <option key={location.id} value={location.id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] text-neutral-600 hover:text-neutral-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={addItemMutation.isPending}
              className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {addItemMutation.isPending ? '추가 중...' : '품목 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
