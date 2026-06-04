import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOfflineInbound } from './useOfflineInbound'
import * as offlineStorage from '@/lib/offlineStorage'
import api from '@/lib/api'
import type { PendingInbound } from '@/lib/offlineStorage'

vi.mock('@/lib/offlineStorage', () => ({
  saveInbound: vi.fn(),
  getPendingInbounds: vi.fn(),
  removeInbound: vi.fn(),
  countPending: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useOfflineInbound', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    })
  })

  it('saves inbound data offline and updates pending count', async () => {
    vi.mocked(offlineStorage.saveInbound).mockResolvedValue({ id: 1, productBarcode: '123', quantity: 10, lotNumber: 'LOT1', locationId: 1, warehouseId: 1, centerId: 1, createdAt: '2024-01-01T00:00:00Z', synced: 0 })
    vi.mocked(offlineStorage.countPending).mockResolvedValue(1)

    const { result } = renderHook(() => useOfflineInbound(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.saveOffline({ productBarcode: '123', quantity: 10, lotNumber: 'LOT1', locationId: 1, warehouseId: 1, centerId: 1 })
    })

    expect(offlineStorage.saveInbound).toHaveBeenCalledWith({ productBarcode: '123', quantity: 10, lotNumber: 'LOT1', locationId: 1, warehouseId: 1, centerId: 1 })
    expect(result.current.pendingCount).toBe(1)
  })

  it('syncs pending records and clears them on success', async () => {
    const pending: PendingInbound[] = [
      { id: 1, productBarcode: '123', quantity: 10, lotNumber: 'LOT1', locationId: 1, warehouseId: 1, centerId: 1, createdAt: '2024-01-01T00:00:00Z', synced: 0 },
    ]
    vi.mocked(offlineStorage.getPendingInbounds).mockResolvedValue(pending)
    vi.mocked(api.post).mockResolvedValue({})
    vi.mocked(offlineStorage.removeInbound).mockResolvedValue(undefined)
    vi.mocked(offlineStorage.countPending).mockResolvedValue(0)

    const { result } = renderHook(() => useOfflineInbound(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.syncPending()
    })

    expect(offlineStorage.getPendingInbounds).toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledWith('/v1/inbounds/offline', expect.objectContaining({ productBarcode: '123' }))
    expect(offlineStorage.removeInbound).toHaveBeenCalledWith(1)
    expect(result.current.isSyncing).toBe(false)
  })

  it('tracks pending count on mount', async () => {
    vi.mocked(offlineStorage.countPending).mockResolvedValue(3)

    const { result } = renderHook(() => useOfflineInbound(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.pendingCount).toBe(3))
  })

  it('does not sync when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true, configurable: true })
    vi.mocked(offlineStorage.countPending).mockResolvedValue(0)

    const { result } = renderHook(() => useOfflineInbound(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.syncPending()
    })

    expect(offlineStorage.getPendingInbounds).not.toHaveBeenCalled()
    expect(result.current.isSyncing).toBe(false)
  })

  it('handles sync failures gracefully', async () => {
    const pending: PendingInbound[] = [
      { id: 1, productBarcode: '123', quantity: 10, lotNumber: 'LOT1', locationId: 1, warehouseId: 1, centerId: 1, createdAt: '2024-01-01T00:00:00Z', synced: 0 },
    ]
    vi.mocked(offlineStorage.getPendingInbounds).mockResolvedValue(pending)
    vi.mocked(api.post).mockRejectedValue(new Error('Network error'))
    vi.mocked(offlineStorage.countPending).mockResolvedValue(1)

    const { result } = renderHook(() => useOfflineInbound(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.syncPending()
    })

    expect(result.current.isSyncing).toBe(false)
    expect(offlineStorage.removeInbound).not.toHaveBeenCalled()
  })

  it('refreshPendingCount updates the count', async () => {
    vi.mocked(offlineStorage.countPending).mockResolvedValue(2)

    const { result } = renderHook(() => useOfflineInbound(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.pendingCount).toBe(2))

    vi.mocked(offlineStorage.countPending).mockResolvedValue(5)

    await act(async () => {
      await result.current.refreshPendingCount()
    })

    expect(result.current.pendingCount).toBe(5)
  })
})
