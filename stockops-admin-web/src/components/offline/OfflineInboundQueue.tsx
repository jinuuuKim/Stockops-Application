/**
 * Offline inbound queue viewer component.
 * Displays pending inbound items stored in IndexedDB,
 * allows individual deletion, and provides a sync-all action.
 *
 * @author StockOps Team
 * @since 1.0
 * @see useOfflineInbound
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, RefreshCw, WifiOff, Package } from 'lucide-react'
import { getPendingInbounds, removeInbound, type PendingInbound } from '@/lib/offlineStorage'
import { useLocations } from '@/hooks/useLocation'
import { showToast } from '@/lib/toast'

/**
 * Props for the offline inbound queue modal.
 */
interface OfflineInboundQueueProps {
  /** Controls modal visibility. */
  isOpen: boolean
  /** Callback to close the modal. */
  onClose: () => void
  /** Callback to trigger sync of all pending items. */
  onSyncAll: () => Promise<void>
  /** Whether a sync is currently in progress. */
  isSyncing: boolean
  /** Current online state. */
  isOnline: boolean
}

/**
 * Modal component showing the offline inbound queue.
 *
 * @param props - Component props
 * @returns Modal JSX element or null when closed
 */
export function OfflineInboundQueue({
  isOpen,
  onClose,
  onSyncAll,
  isSyncing,
  isOnline,
}: OfflineInboundQueueProps) {
  const [items, setItems] = useState<PendingInbound[]>([])
  const [loading, setLoading] = useState(false)
  const { data: locations } = useLocations()

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const pending = await getPendingInbounds()
      setItems(pending)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- opening the queue modal loads persisted offline rows into local view state. */
      void loadItems()
    }
  }, [isOpen, loadItems])

  const handleDelete = useCallback(
    async (id: number) => {
      await removeInbound(id)
      await loadItems()
      showToast({ message: '항목이 삭제되었습니다.', variant: 'success' })
    },
    [loadItems]
  )

  const handleSyncAll = useCallback(async () => {
    await onSyncAll()
    await loadItems()
  }, [onSyncAll, loadItems])

  const getLocationName = useCallback(
    (locationId: number) => {
      const loc = locations?.find((l) => l.id === locationId)
      return loc ? `${loc.code} - ${loc.name}` : `Location #${locationId}`
    },
    [locations]
  )

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <WifiOff className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">오프라인 입고 대기열</h2>
              <p className="text-sm text-neutral-500">
                {isOnline
                  ? '네트워크 연결됨 — 동기화 가능'
                  : '오프라인 — 데이터가 로컬에 저장됨'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-neutral-500 py-8">로딩 중...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium">대기 중인 입고 데이터가 없습니다</p>
              <p className="text-sm text-neutral-400 mt-1">
                오프라인 상태에서 입고를 등록하면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-neutral-900 truncate">
                          {item.productBarcode}
                        </span>
                        <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded">
                          {item.quantity}개
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-600">
                        <div>
                          <span className="text-neutral-400">LOT:</span>{' '}
                          {item.lotNumber}
                        </div>
                        <div>
                          <span className="text-neutral-400">위치:</span>{' '}
                          {getLocationName(item.locationId)}
                        </div>
                        {item.expiryDate && (
                          <div>
                            <span className="text-neutral-400">유통기한:</span>{' '}
                            {item.expiryDate}
                          </div>
                        )}
                        <div>
                          <span className="text-neutral-400">저장일:</span>{' '}
                          {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.id !== undefined) {
                          void handleDelete(item.id)
                        }
                      }}
                      className="ml-3 p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="삭제"
                      aria-label="대기 항목 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-neutral-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-700 transition-colors"
          >
            닫기
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void handleSyncAll()}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '동기화 중...' : '전체 동기화'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
