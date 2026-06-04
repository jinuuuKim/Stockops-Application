/**
 * React hook for offline inbound operations.
 * Manages saving inbound data to IndexedDB when offline,
 * syncing pending records when the connection is restored,
 * and tracking the pending item count.
 *
 * @author StockOps Team
 * @since 1.0
 * @see offlineStorage
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  saveInbound,
  getPendingInbounds,
  removeInbound,
  countPending,
  type PendingInbound,
} from '@/lib/offlineStorage'
import { showToast } from '@/lib/toast'
import api from '@/lib/api'

/**
 * Hook return type for offline inbound management.
 */
export interface UseOfflineInboundReturn {
  /** Saves inbound data to IndexedDB when offline. */
  saveOffline: (data: Omit<PendingInbound, 'id' | 'createdAt' | 'synced'>) => Promise<void>
  /** Manually triggers sync of all pending records. */
  syncPending: () => Promise<void>
  /** Whether a sync operation is currently in progress. */
  isSyncing: boolean
  /** Current count of unsynced pending items. */
  pendingCount: number
  /** Whether the browser reports an online connection. */
  isOnline: boolean
  /** Refresh the pending count manually. */
  refreshPendingCount: () => Promise<void>
}

/**
 * React hook for offline inbound storage and sync.
 *
 * @returns Offline inbound management utilities
 * @example
 * const { saveOffline, syncPending, pendingCount, isOnline, isSyncing } = useOfflineInbound()
 */
export function useOfflineInbound(): UseOfflineInboundReturn {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine
  })
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncInProgress = useRef(false)

  const refreshPendingCount = useCallback(async () => {
    const count = await countPending()
    setPendingCount(count)
  }, [])

  const syncPendingInternal = useCallback(async () => {
    if (syncInProgress.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    syncInProgress.current = true
    setIsSyncing(true)

    try {
      const pending = await getPendingInbounds()
      if (pending.length === 0) {
        setIsSyncing(false)
        syncInProgress.current = false
        return
      }

      let successCount = 0
      let failCount = 0

      for (const item of pending) {
        try {
          await api.post('/v1/inbounds/offline', {
            productBarcode: item.productBarcode,
            quantity: item.quantity,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
            locationId: item.locationId,
            warehouseId: item.warehouseId,
            centerId: item.centerId,
            createdAt: item.createdAt,
          })

          if (item.id !== undefined) {
            await removeInbound(item.id)
          }
          successCount++
        } catch {
          failCount++
        }
      }

      await refreshPendingCount()

      if (successCount > 0) {
        showToast({
          message: `${successCount}개의 입고 데이터가 동기화되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`,
          variant: 'success',
        })
        queryClient.invalidateQueries({ queryKey: ['inbounds'] })
      } else if (failCount > 0) {
        showToast({ message: `${failCount}개의 데이터 동기화에 실패했습니다.`, variant: 'error' })
      }
    } finally {
      setIsSyncing(false)
      syncInProgress.current = false
    }
  }, [queryClient, refreshPendingCount])

  const saveOffline = useCallback(
    async (data: Omit<PendingInbound, 'id' | 'createdAt' | 'synced'>) => {
      await saveInbound(data)
      await refreshPendingCount()
      showToast({ message: '오프라인 상태: 데이터가 로컬에 저장되었습니다.', variant: 'success' })
    },
    [refreshPendingCount]
  )

  const syncPending = useCallback(async () => {
    if (!navigator.onLine) {
      showToast({ message: '오프라인 상태입니다. 동기화할 수 없습니다.', variant: 'error' })
      return
    }
    await syncPendingInternal()
  }, [syncPendingInternal])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- initial pending count is read from IndexedDB-backed offline storage. */
    refreshPendingCount()
  }, [refreshPendingCount])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast({ message: '네트워크 연결이 복원되었습니다. 동기화를 시작합니다.', variant: 'success' })
      void syncPendingInternal()
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast({ message: '오프라인 모드로 전환되었습니다. 데이터가 로컬에 저장됩니다.', variant: 'error' })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncPendingInternal])

  return {
    saveOffline,
    syncPending,
    isSyncing,
    pendingCount,
    isOnline,
    refreshPendingCount,
  }
}
