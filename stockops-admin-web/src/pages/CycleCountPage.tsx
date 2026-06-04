/**
 * Cycle count (재고 실사) management page.
 * Provides creation, execution, and completion of physical inventory counts.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useMemo } from 'react'
import { Plus, Eye, Play, CheckCircle } from 'lucide-react'
import {
  useCreateCycleCount,
  useCycleCounts,
  useStartCycleCount,
  useCompleteCycleCount,
} from '@/hooks/useCycleCount'
import { useLocations } from '@/hooks/useLocation'
import { useInventory } from '@/hooks/useInventory'
import { EmptyState } from '@/components/common/EmptyState'
import type { CycleCount, CycleCountStatus } from '@/types/cycleCount'

/**
 * Cycle count management page with table, creation, and execution modals.
 *
 * @returns Cycle count page JSX element
 */
export function CycleCountPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCountId, setSelectedCountId] = useState<number | null>(null)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const { data: counts = [], isLoading, error, refetch } = useCycleCounts()

  const selectedCount = useMemo(
    () => counts.find((c) => c.id === selectedCountId) || null,
    [counts, selectedCountId]
  )

  const { data: locations } = useLocations()
  const startMutation = useStartCycleCount()

  const locationMap = useMemo(() => {
    const map = new Map<number, string>()
    if (locations) {
      for (const loc of locations) {
        map.set(loc.id, loc.name)
      }
    }
    return map
  }, [locations])

  const handleStarted = (count: CycleCount) => {
    setSelectedCountId(count.id)
    setShowExecuteModal(true)
  }

  const handleCompleted = (count: CycleCount) => {
    setSelectedCountId(count.id)
  }

  const handleStart = (count: CycleCount) => {
    startMutation.mutate(count.id, {
      onSuccess: handleStarted,
    })
  }

  const getStatusBadge = (status: CycleCountStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-warning/10 text-warning">
            대기중
          </span>
        )
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-700">
            진행중
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-success/10 text-success">
            완료
          </span>
        )
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">재고 실사</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          실사 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {isLoading ? (
          <EmptyState
            title="실사 로딩 중"
            description="등록된 재고 실사 목록을 불러오는 중입니다."
            variant="empty"
          />
        ) : error ? (
          <EmptyState
            title="실사 목록을 불러오지 못했습니다"
            description="서버 연결 상태를 확인한 뒤 다시 시도해주세요."
            variant="error"
            actionLabel="다시 시도"
            onAction={() => void refetch()}
          />
        ) : counts.length > 0 ? (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  실사일자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  항목 수
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {counts.map((count) => (
                <tr key={count.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {count.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {count.countDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {locationMap.get(count.locationId) || `위치 #${count.locationId}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(count.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {count.items.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {count.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleStart(count)}
                          disabled={startMutation.isPending}
                          className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                          title="실사 시작"
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      )}
                      {count.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCountId(count.id)
                            setShowExecuteModal(true)
                          }}
                          className="text-success hover:text-green-700"
                          title="실사 완료"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {count.status === 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCountId(count.id)
                            setShowDetailModal(true)
                          }}
                          className="text-primary-600 hover:text-primary-700"
                          title="상세 보기"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="등록된 실사가 없습니다"
            description="새로운 재고 실사를 등록하여 시작하세요"
            actionLabel="실사 등록"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {showCreateModal && (
        <CreateCycleCountModal
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showExecuteModal && selectedCount && (
        <ExecuteCycleCountModal
          count={selectedCount}
          onClose={() => {
            setShowExecuteModal(false)
            setSelectedCountId(null)
          }}
          onCompleted={handleCompleted}
        />
      )}

      {showDetailModal && selectedCount && (
        <CycleCountDetailModal
          count={selectedCount}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedCountId(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Create cycle count modal component.
 *
 * @param onClose - Close callback
 * @param onCreated - Callback when count is created
 * @returns Modal JSX element
 */
function CreateCycleCountModal({
  onClose,
}: {
  onClose: () => void
}) {
  const [countDate, setCountDate] = useState(() => new Date().toISOString().split('T')[0])
  const [locationId, setLocationId] = useState('')
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<Set<number>>(new Set())

  const { data: locations } = useLocations()
  const { data: inventoryItems, isLoading: inventoryLoading } = useInventory(
    locationId ? { locationId: Number(locationId) } : undefined
  )
  const createMutation = useCreateCycleCount()

  const toggleInventory = (id: number) => {
    setSelectedInventoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (!inventoryItems || inventoryItems.length === 0) return
    if (selectedInventoryIds.size === inventoryItems.length) {
      setSelectedInventoryIds(new Set())
    } else {
      setSelectedInventoryIds(new Set(inventoryItems.map((i) => i.id)))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const locId = Number(locationId)
    if (!locId || selectedInventoryIds.size === 0) return

    createMutation.mutate(
      {
        countDate,
        locationId: locId,
        inventoryIds: Array.from(selectedInventoryIds),
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">재고 실사 등록</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="countDate" className="block text-sm font-medium text-neutral-700 mb-1">
                실사일자
              </label>
              <input
                id="countDate"
                type="date"
                value={countDate}
                onChange={(e) => setCountDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label htmlFor="locationId" className="block text-sm font-medium text-neutral-700 mb-1">
                위치
              </label>
              <select
                id="locationId"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value)
                  setSelectedInventoryIds(new Set())
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">위치 선택</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="block text-sm font-medium text-neutral-700">
                재고 항목 선택
              </span>
              {inventoryItems && inventoryItems.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {selectedInventoryIds.size === inventoryItems.length ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>

            {!locationId && (
              <div className="text-sm text-neutral-500 py-4 text-center border border-dashed border-neutral-300 rounded-lg">
                위치를 선택하면 재고 항목이 표시됩니다
              </div>
            )}

            {locationId && inventoryLoading && (
              <div className="text-sm text-neutral-500 py-4 text-center">재고 항목을 불러오는 중...</div>
            )}

            {locationId && !inventoryLoading && inventoryItems && inventoryItems.length === 0 && (
              <div className="text-sm text-neutral-500 py-4 text-center border border-dashed border-neutral-300 rounded-lg">
                해당 위치에 재고 항목이 없습니다
              </div>
            )}

            {locationId && !inventoryLoading && inventoryItems && inventoryItems.length > 0 && (
              <div className="border border-neutral-200 rounded-lg max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={
                            inventoryItems.length > 0 && selectedInventoryIds.size === inventoryItems.length
                          }
                          onChange={toggleAll}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                        상품
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                        LOT
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">
                        수량
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {inventoryItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-50 cursor-pointer"
                        onClick={() => toggleInventory(item.id)}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedInventoryIds.has(item.id)}
                            onChange={() => toggleInventory(item.id)}
                            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-neutral-900">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-neutral-600">{item.lotNumber}</td>
                        <td className="px-4 py-2 text-sm text-neutral-600 text-right">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {locationId && !inventoryLoading && inventoryItems && (
              <p className="mt-2 text-sm text-neutral-500">
                {selectedInventoryIds.size}개 선택됨
              </p>
            )}
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
              disabled={createMutation.isPending || selectedInventoryIds.size === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Execute cycle count modal component.
 * Allows entering actual quantities for each item.
 *
 * @param count - Cycle count data
 * @param onClose - Close callback
 * @param onCompleted - Callback when count is completed
 * @returns Modal JSX element
 */
function ExecuteCycleCountModal({
  count,
  onClose,
  onCompleted,
}: {
  count: CycleCount
  onClose: () => void
  onCompleted: (count: CycleCount) => void
}) {
  const [actuals, setActuals] = useState<Record<number, { actualQuantity: string; notes: string }>>(
    () => {
      const init: Record<number, { actualQuantity: string; notes: string }> = {}
      count.items.forEach((item) => {
        init[item.id] = {
          actualQuantity: item.actualQuantity?.toString() ?? '',
          notes: item.notes ?? '',
        }
      })
      return init
    }
  )

  const completeMutation = useCompleteCycleCount()

  const updateActual = (itemId: number, field: 'actualQuantity' | 'notes', value: string) => {
    setActuals((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const allFilled = useMemo(() => {
    return count.items.every((item) => {
      const actual = actuals[item.id]
      if (!actual || actual.actualQuantity.trim() === '') return false
      const qty = Number(actual.actualQuantity)
      return !Number.isNaN(qty) && qty >= 0
    })
  }, [count.items, actuals])

  const handleComplete = () => {
    if (!allFilled) return

    const items = count.items.map((item) => {
      const actual = actuals[item.id]
      return {
        itemId: item.id,
        actualQuantity: Number(actual.actualQuantity),
        notes: actual.notes || undefined,
      }
    })

    completeMutation.mutate(
      { id: count.id, request: { items } },
      {
        onSuccess: (data) => {
          onCompleted(data)
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">재고 실사 실행 #{count.id}</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500">실사일자:</span>
            <span className="ml-2 text-neutral-900">{count.countDate}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">항목 수:</span>
            <span className="ml-2 text-neutral-900">{count.items.length}개</span>
          </div>
        </div>

        <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                  재고 ID
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">
                  예상 수량
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">
                  실제 수량
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                  비고
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {count.items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 text-sm text-neutral-900">{item.inventoryId}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600 text-right">
                    {item.expectedQuantity}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={actuals[item.id]?.actualQuantity ?? ''}
                      onChange={(e) => updateActual(item.id, 'actualQuantity', e.target.value)}
                      className="w-24 px-2 py-1 border border-neutral-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={actuals[item.id]?.notes ?? ''}
                      onChange={(e) => updateActual(item.id, 'notes', e.target.value)}
                      className="w-full px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="비고 입력"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <p className={`text-sm ${allFilled ? 'text-success' : 'text-neutral-500'}`}>
            {allFilled
              ? '모든 항목이 입력되었습니다'
              : '모든 항목의 실제 수량을 입력해주세요'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={completeMutation.isPending || !allFilled}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {completeMutation.isPending ? '완료 중...' : '실사 완료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Cycle count detail modal for completed counts.
 *
 * @param count - Cycle count data
 * @param onClose - Close callback
 * @returns Modal JSX element
 */
function CycleCountDetailModal({
  count,
  onClose,
}: {
  count: CycleCount
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-neutral-900">실사 상세 #{count.id}</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            &times;
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500">실사일자:</span>
            <span className="ml-2 text-neutral-900">{count.countDate}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">위치 ID:</span>
            <span className="ml-2 text-neutral-900">{count.locationId}</span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">상태:</span>
            <span className="ml-2 px-2 py-1 text-xs font-medium rounded bg-success/10 text-success">
              완료
            </span>
          </div>
          <div>
            <span className="text-sm text-neutral-500">생성일:</span>
            <span className="ml-2 text-neutral-900">{count.createdAt}</span>
          </div>
          {count.completedAt && (
            <div>
              <span className="text-sm text-neutral-500">완료일:</span>
              <span className="ml-2 text-neutral-900">{count.completedAt}</span>
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-neutral-900 mb-2">실사 항목</h3>
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                  재고 ID
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">
                  예상 수량
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">
                  실제 수량
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">
                  차이
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                  비고
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {count.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-neutral-900">{item.inventoryId}</td>
                  <td className="px-4 py-2 text-sm text-neutral-600 text-right">
                    {item.expectedQuantity}
                  </td>
                  <td className="px-4 py-2 text-sm text-neutral-600 text-right">
                    {item.actualQuantity ?? '-'}
                  </td>
                  <td
                    className={`px-4 py-2 text-sm text-right font-medium ${
                      (item.variance ?? 0) !== 0 ? 'text-error' : 'text-success'
                    }`}
                  >
                    {item.variance ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{item.notes ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
