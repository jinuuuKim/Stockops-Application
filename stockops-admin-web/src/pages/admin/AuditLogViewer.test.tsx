import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuditLogViewer } from './AuditLogViewer'
import type { AdminPageResponse, AuditLog } from '@/types/admin'

vi.mock('@/hooks/useAdmin', () => ({
  useAuditLogs: vi.fn(),
}))

import { useAuditLogs } from '@/hooks/useAdmin'

const refetchAuditLogs = vi.fn()

function buildAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 1,
    entityType: 'USER',
    entityId: 33,
    targetIdentifier: 'USER-33',
    action: 'CREATE',
    oldValue: 'old value',
    newValue: 'new value',
    performedBy: 7,
    performedByName: 'Admin User',
    performedByEmail: 'admin@stockops.test',
    performedAt: '2026-06-05T10:00:00Z',
    ipAddress: '10.0.0.5',
    userAgent: 'StockOpsBrowser/1.0',
    ...overrides,
  }
}

function buildAuditLogsPage(logs: AuditLog[], overrides: Partial<AdminPageResponse<AuditLog>> = {}): AdminPageResponse<AuditLog> {
  return {
    content: logs,
    totalElements: logs.length,
    totalPages: logs.length === 0 ? 0 : 1,
    size: 20,
    number: 0,
    ...overrides,
  }
}

function mockAuditLogsQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useAuditLogs).mockReturnValue({
    data: buildAuditLogsPage([buildAuditLog()]),
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchAuditLogs,
    ...overrides,
  } as unknown as ReturnType<typeof useAuditLogs>)
}

describe('AuditLogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogsQuery()
  })

  it('lists audit logs from the API hook and shows selected log details', () => {
    render(<AuditLogViewer />)

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('CREATE')).toBeInTheDocument()
    expect(screen.getByText('USER-33')).toBeInTheDocument()
    expect(screen.getByText('old value → new value')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '상세 보기' }))

    expect(screen.getByText('10.0.0.5')).toBeInTheDocument()
    expect(screen.getByText('StockOpsBrowser/1.0')).toBeInTheDocument()
  })

  it('shows the loading state', () => {
    mockAuditLogsQuery({ data: undefined, isLoading: true })

    render(<AuditLogViewer />)

    expect(screen.getByRole('status')).toHaveTextContent('감사 로그를 불러오는 중입니다.')
  })

  it('shows the error state and supports retry', () => {
    mockAuditLogsQuery({ data: undefined, isLoading: false, isError: true, error: new Error('load failed') })

    render(<AuditLogViewer />)
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(screen.getByRole('alert')).toHaveTextContent('감사 로그를 불러오지 못했습니다.')
    expect(refetchAuditLogs).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state without runtime mock logs', () => {
    mockAuditLogsQuery({ data: buildAuditLogsPage([]) })

    render(<AuditLogViewer />)

    expect(screen.getByText('조건에 맞는 감사 로그가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText(/임시 로그는 표시하지 않습니다/)).toBeInTheDocument()
  })

  it('applies actor, action, target, and date filters', async () => {
    mockAuditLogsQuery({
      data: buildAuditLogsPage([
        buildAuditLog({ id: 1, action: 'CREATE' }),
        buildAuditLog({ id: 2, action: 'DELETE', oldValue: null, newValue: 'deleted' }),
      ]),
    })

    render(<AuditLogViewer />)
    fireEvent.change(screen.getByLabelText('작업자 ID'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('작업'), { target: { value: 'DELETE' } })
    fireEvent.change(screen.getByLabelText('대상 유형'), { target: { value: 'USER' } })
    fireEvent.change(screen.getByLabelText('대상 ID'), { target: { value: '33' } })
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-06-05' } })
    fireEvent.submit(screen.getByRole('form', { name: '감사 로그 필터' }))

    await waitFor(() => {
      expect(useAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({
        page: 0,
        size: 20,
        entityType: 'USER',
        entityId: 33,
        userId: 7,
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-05T23:59:59.999Z',
      }))
    })

    const calls = vi.mocked(useAuditLogs).mock.calls
    const lastFilter = calls[calls.length - 1]?.[0]
    expect(lastFilter).not.toHaveProperty('action')
    expect(screen.getByText('DELETE')).toBeInTheDocument()
    expect(screen.queryByText('CREATE')).not.toBeInTheDocument()
  })

  it('requests the next audit log page', async () => {
    vi.mocked(useAuditLogs).mockImplementation((filter) => ({
      data: buildAuditLogsPage([buildAuditLog()], {
        totalElements: 21,
        totalPages: 2,
        number: filter?.page ?? 0,
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchAuditLogs,
    } as unknown as ReturnType<typeof useAuditLogs>))

    render(<AuditLogViewer />)
    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    await waitFor(() => {
      expect(useAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 20 }))
    })
  })
})
