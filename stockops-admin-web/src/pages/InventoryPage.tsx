/**
 * Inventory management page component.
 * Displays inventory list with search, filters, and pagination.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { InventoryAdjustModal } from '@/components/inventory/InventoryAdjustModal'
import { useInventory } from '@/hooks/useInventory'
import { useCategories } from '@/hooks/useCategories'
import { useProducts } from '@/hooks/useProduct'
import type { Inventory } from '@/types/inventory'
import type { Category } from '@/types/category'
import { Search, Filter, Eye, History, Package, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

const INVENTORY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '보관 중',
  RESERVED: '예약됨',
  QUARANTINE: '격리',
  EXPIRED: '만료',
  EXPIRING_SOON: '임박',
  OUT_OF_STOCK: '품절',
}

/**
 * Inventory page with table, search, filters, and pagination.
 *
 * @returns Inventory page JSX element
 */
export function InventoryPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const pageSize = 10

  const { data: inventory = [], isLoading, error, refetch } = useInventory()
  const { data: categories = [] } = useCategories()
  const { data: products = [] } = useProducts()

  const selectedInventory = useMemo(
    () => inventory.find((item: Inventory) => item.id === selectedInventoryId) ?? null,
    [inventory, selectedInventoryId],
  )

  const productCategoryMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const product of products) {
      if (product.categoryId) {
        map.set(product.id, product.categoryId)
      }
    }
    return map
  }, [products])

  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>()
    function traverse(list: Category[]) {
      for (const c of list) {
        map.set(c.id, c)
        if (c.children && c.children.length > 0) traverse(c.children)
      }
    }
    traverse(categories)
    return map
  }, [categories])

  const categorySummaries = useMemo(() => {
    const summaryMap = new Map<number, { quantity: number; productIds: Set<number> }>()
    for (const item of inventory) {
      const categoryId = productCategoryMap.get(item.productId)
      if (!categoryId) continue
      const existing = summaryMap.get(categoryId) ?? { quantity: 0, productIds: new Set<number>() }
      existing.quantity += item.quantity
      existing.productIds.add(item.productId)
      summaryMap.set(categoryId, existing)
    }
    return Array.from(summaryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId)?.name ?? 'Unknown',
        totalQuantity: data.quantity,
        productCount: data.productIds.size,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
  }, [inventory, productCategoryMap, categoryMap])

  const filteredInventory = useMemo(() => {
    return inventory.filter((item: Inventory) => {
      const matchesSearch =
        searchTerm === '' ||
        item.productBarcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || getInventoryStatus(item) === statusFilter

      const matchesCategory =
        categoryFilter === null || productCategoryMap.get(item.productId) === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [inventory, searchTerm, statusFilter, categoryFilter, productCategoryMap])

  const paginatedInventory = useMemo(() => {
    const start = currentPage * pageSize
    return filteredInventory.slice(start, start + pageSize)
  }, [filteredInventory, currentPage])

  const totalPages = Math.ceil(filteredInventory.length / pageSize)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">재고 관리</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => selectedInventory && setIsAdjustModalOpen(true)}
            disabled={!selectedInventory}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 min-h-[44px] text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">{selectedInventory ? '선택 재고 조정' : '재고를 선택하세요'}</span>
            <span className="sm:hidden">조정</span>
          </button>
        </div>
      </div>

      {categorySummaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter(null)
              setCurrentPage(0)
            }}
            className={`p-4 rounded-xl border transition-all text-left ${
              categoryFilter === null
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                : 'border-neutral-200 bg-white hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-neutral-700">전체</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {categorySummaries.reduce((sum, c) => sum + c.totalQuantity, 0)}
            </p>
            <p className="text-xs text-neutral-500">총 수량</p>
          </button>
          {categorySummaries.map((summary) => (
            <button
              key={summary.categoryId}
              type="button"
              onClick={() => {
                setCategoryFilter(summary.categoryId)
                setCurrentPage(0)
              }}
              className={`p-4 rounded-xl border transition-all text-left ${
                categoryFilter === summary.categoryId
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-neutral-200 bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-neutral-700">{summary.categoryName}</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{summary.totalQuantity}</p>
              <p className="text-xs text-neutral-500">{summary.productCount}개 품목</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b border-neutral-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="바코드 또는 상품명으로 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full pl-10 pr-4 py-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-neutral-500 hidden sm:block" />
              <select
                value={categoryFilter ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setCategoryFilter(val ? Number(val) : null)
                  setCurrentPage(0)
                }}
                className="w-full sm:w-auto px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">전체 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {'  '.repeat(cat.level - 1)}{cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-500 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full sm:w-auto px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="all">전체 상태</option>
                <option value="ACTIVE">보관 중</option>
                <option value="RESERVED">예약됨</option>
                <option value="QUARANTINE">격리</option>
                <option value="EXPIRED">만료</option>
                <option value="EXPIRING_SOON">유통기한 임박</option>
                <option value="OUT_OF_STOCK">품절</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <EmptyState
            title="재고 로딩 중"
            description="현재고와 LOT 정보를 불러오는 중입니다."
            variant="empty"
          />
        ) : error ? (
          <EmptyState
            title="재고를 불러오지 못했습니다"
            description="서버 연결 상태를 확인한 뒤 다시 시도해주세요."
            variant="error"
            actionLabel="다시 시도"
            onAction={() => void refetch()}
          />
        ) : paginatedInventory.length === 0 ? (
          <EmptyState
            title="표시할 재고가 없습니다"
            description="입고 확정 후 위치와 LOT 단위의 재고가 표시됩니다."
            actionLabel="상품 관리로 이동"
            onAction={() => navigate('/products')}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">상품</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">위치</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">LOT 번호</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">유통기한</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700">수량</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-neutral-700">상태</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-neutral-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {paginatedInventory.map((item: Inventory) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedInventoryId(item.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedInventoryId === item.id ? 'bg-primary-50' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-neutral-900">{item.productName}</div>
                          <div className="text-sm text-neutral-500">{item.productBarcode}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-neutral-900">{item.locationCode}</div>
                          <div className="text-sm text-neutral-500">{item.locationName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{item.lotNumber}</td>
                      <td className="px-4 py-3">
                        <div className="text-neutral-900">{formatDate(item.expiryDate)}</div>
                        {(() => {
                          const status = getExpiryStatus(item.expiryDate)
                          return status ? (
                            <div className={`text-sm ${status.color}`}>
                              {status.label}
                            </div>
                          ) : null
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-neutral-900">{item.quantity}</div>
                        {item.reservedQuantity > 0 && (
                          <div className="text-sm text-neutral-500">
                            예약: {item.reservedQuantity}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(getInventoryStatus(item))}`}>
                          {getInventoryStatusLabel(getInventoryStatus(item))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedInventoryId(item.id)
                              setIsAdjustModalOpen(true)
                            }}
                            className="rounded px-2 py-1 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                            title="재고 조정"
                          >
                            조정
                          </button>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="p-1 hover:bg-neutral-100 rounded transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4 text-neutral-600" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="p-1 hover:bg-neutral-100 rounded transition-colors"
                            title="입출고 이력"
                          >
                            <History className="w-4 h-4 text-neutral-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-neutral-200">
              {paginatedInventory.map((item: Inventory) => (
                <div
                  key={item.id}
                  className={`p-4 space-y-3 transition-colors ${
                    selectedInventoryId === item.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-neutral-900">{item.productName}</div>
                      <div className="text-sm text-neutral-500">{item.productBarcode}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(getInventoryStatus(item))}`}>
                      {getInventoryStatusLabel(getInventoryStatus(item))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-neutral-500 block">위치</span>
                      <span className="text-neutral-900">{item.locationCode}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">LOT</span>
                      <span className="text-neutral-900">{item.lotNumber}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">유통기한</span>
                      <span className="text-neutral-900">{formatDate(item.expiryDate)}</span>
                      {(() => {
                        const status = getExpiryStatus(item.expiryDate)
                        return status ? (
                          <div className={`text-xs ${status.color}`}>
                            {status.label}
                          </div>
                        ) : null
                      })()}
                    </div>
                    <div>
                      <span className="text-neutral-500 block">수량</span>
                      <span className="text-neutral-900">{item.quantity}</span>
                      {item.reservedQuantity > 0 && (
                        <div className="text-xs text-neutral-500">
                          예약: {item.reservedQuantity}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedInventoryId(item.id)
                        setIsAdjustModalOpen(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      조정
                    </button>
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center justify-center px-3 py-2.5 min-h-[44px] min-w-[44px] hover:bg-neutral-100 rounded-lg transition-colors"
                      title="상세 보기"
                    >
                      <Eye className="w-4 h-4 text-neutral-600" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center justify-center px-3 py-2.5 min-h-[44px] min-w-[44px] hover:bg-neutral-100 rounded-lg transition-colors"
                      title="입출고 이력"
                    >
                      <History className="w-4 h-4 text-neutral-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
                <div className="text-sm text-neutral-500">
                  총 {filteredInventory.length}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filteredInventory.length)}개 표시
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
      </div>

      <InventoryAdjustModal
        isOpen={isAdjustModalOpen}
        inventory={selectedInventory}
        onClose={() => setIsAdjustModalOpen(false)}
      />
    </div>
  )
}

/**
 * Determines inventory status based on backend status and expiry date.
 * Backend status takes precedence, but expired items are always shown as EXPIRED.
 */
function getInventoryStatus(item: Inventory): string {
  if (item.status === 'QUARANTINE' || item.status === 'EXPIRED') {
    return item.status
  }

  const today = new Date()
  const expiryDate = new Date(item.expiryDate)

  if (expiryDate < today) {
    return 'EXPIRED'
  }

  if (item.status === 'RESERVED') {
    return 'RESERVED'
  }

  if (item.quantity === 0) {
    return 'OUT_OF_STOCK'
  }

  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilExpiry <= 7) {
    return 'EXPIRING_SOON'
  }

  return 'ACTIVE'
}

/**
 * Returns status badge color classes.
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-success/10 text-success'
    case 'RESERVED':
      return 'bg-info/10 text-info'
    case 'EXPIRING_SOON':
      return 'bg-warning/10 text-warning'
    case 'EXPIRED':
      return 'bg-error/10 text-error'
    case 'QUARANTINE':
      return 'bg-warning/10 text-warning'
    case 'OUT_OF_STOCK':
      return 'bg-neutral-200 text-neutral-600'
    default:
      return 'bg-neutral-100 text-neutral-600'
  }
}

function getInventoryStatusLabel(status: string): string {
  return INVENTORY_STATUS_LABELS[status] ?? status
}

/**
 * Formats ISO date string to locale date string.
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR')
}

/**
 * Returns expiry status label and color if expiring soon.
 */
function getExpiryStatus(dateString: string): { label: string; color: string } | null {
  const today = new Date()
  const expiryDate = new Date(dateString)
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry <= 0) {
    return { label: '만료됨', color: 'text-error' }
  }

  if (daysUntilExpiry <= 7) {
    return { label: `D-${daysUntilExpiry}`, color: 'text-error' }
  }

  if (daysUntilExpiry <= 14) {
    return { label: `D-${daysUntilExpiry}`, color: 'text-warning' }
  }

  if (daysUntilExpiry <= 30) {
    return { label: `D-${daysUntilExpiry}`, color: 'text-info' }
  }

  return null
}
