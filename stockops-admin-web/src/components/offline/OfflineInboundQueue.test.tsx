import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OfflineInboundQueue } from './OfflineInboundQueue'
import type { PendingInbound } from '@/lib/offlineStorage'

const mockOnClose = vi.fn()
const mockOnSyncAll = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useLocation', () => ({
  useLocations: vi.fn(),
}))

vi.mock('@/lib/offlineStorage', () => ({
  getPendingInbounds: vi.fn(),
  removeInbound: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}))

import { useLocations } from '@/hooks/useLocation'
import { getPendingInbounds, removeInbound } from '@/lib/offlineStorage'

function createPendingItems(): PendingInbound[] {
  return [
    {
      id: 1,
      productBarcode: '8801234567890',
      quantity: 100,
      lotNumber: 'LOT001',
      expiryDate: '2025-12-31',
      locationId: 1,
      warehouseId: 2,
      centerId: 3,
      createdAt: '2024-01-15T10:30:00Z',
      synced: 0,
    },
    {
      id: 2,
      productBarcode: '8809999888888',
      quantity: 50,
      lotNumber: 'LOT002',
      locationId: 2,
      warehouseId: 2,
      centerId: 3,
      createdAt: '2024-01-15T11:00:00Z',
      synced: 0,
    },
  ]
}

describe('OfflineInboundQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLocations).mockReturnValue({
      data: [
        { id: 1, code: 'LOC01', name: '입고대' },
        { id: 2, code: 'LOC02', name: '적치장A' },
      ],
    } as ReturnType<typeof useLocations>)
    vi.mocked(getPendingInbounds).mockResolvedValue(createPendingItems())
    vi.mocked(removeInbound).mockResolvedValue(undefined)
  })

  it('does not render when isOpen is false', () => {
    render(
      <OfflineInboundQueue
        isOpen={false}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    expect(screen.queryByText('오프라인 입고 대기열')).not.toBeInTheDocument()
  })

  it('renders pending items when isOpen is true', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('오프라인 입고 대기열')).toBeInTheDocument()
      expect(screen.getByText('8801234567890')).toBeInTheDocument()
      expect(screen.getByText('8809999888888')).toBeInTheDocument()
    })
  })

  it('shows empty state when no pending items', async () => {
    vi.mocked(getPendingInbounds).mockResolvedValue([])
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('대기 중인 입고 데이터가 없습니다')).toBeInTheDocument()
    })
  })

  it('shows online status message when connected', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('네트워크 연결됨 — 동기화 가능')).toBeInTheDocument()
    })
  })

  it('shows offline status message when disconnected', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={false}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('오프라인 — 데이터가 로컬에 저장됨')).toBeInTheDocument()
    })
  })

  it('disables sync button when offline', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={false}
      />
    )
    await waitFor(() => {
      const syncBtn = screen.getByText('전체 동기화')
      expect(syncBtn).toBeDisabled()
    })
  })

  it('shows syncing spinner when isSyncing is true', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={true}
        isOnline={true}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('동기화 중...')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    await waitFor(() => screen.getByLabelText('닫기'))
    fireEvent.click(screen.getByLabelText('닫기'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onSyncAll when sync button is clicked', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    await waitFor(() => screen.getByText('전체 동기화'))
    fireEvent.click(screen.getByText('전체 동기화'))
    await waitFor(() => {
      expect(mockOnSyncAll).toHaveBeenCalled()
    })
  })

  it('calls removeInbound and reloads when delete button is clicked', async () => {
    render(
      <OfflineInboundQueue
        isOpen={true}
        onClose={mockOnClose}
        onSyncAll={mockOnSyncAll}
        isSyncing={false}
        isOnline={true}
      />
    )
    await waitFor(() => screen.getAllByLabelText('대기 항목 삭제'))
    const deleteBtns = screen.getAllByLabelText('대기 항목 삭제')
    fireEvent.click(deleteBtns[0])
    await waitFor(() => {
      expect(removeInbound).toHaveBeenCalledWith(1)
    })
  })
})
