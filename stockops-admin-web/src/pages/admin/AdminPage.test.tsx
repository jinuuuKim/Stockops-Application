import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AdminPage } from './AdminPage'
import type { AdminNotice, AuditLog, AdminStats } from '@/types/admin'
import type { DashboardSummary } from '@/types/dashboard'
import type { NotificationChannelConfig } from '@/types/notificationChannel'

vi.mock('@/hooks/useAdmin', () => ({
  useActiveAdminNotices: vi.fn(),
  useAdminDashboardSummary: vi.fn(),
  useAdminStats: vi.fn(),
  useRecentAuditLogs: vi.fn(),
}))

vi.mock('@/hooks/useNotificationChannelConfigs', () => ({
  useAllNotificationChannelConfigs: vi.fn(),
}))

import {
  useActiveAdminNotices,
  useAdminDashboardSummary,
  useAdminStats,
  useRecentAuditLogs,
} from '@/hooks/useAdmin'
import { useAllNotificationChannelConfigs } from '@/hooks/useNotificationChannelConfigs'

function buildSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalProducts: 1240,
    totalInventoryQuantity: 5000,
    todayInboundCount: 8,
    todayOutboundCount: 3,
    lowStockCount: 4,
    pendingCycleCounts: 2,
    criticalExpiryCount: 1,
    warningExpiryCount: 6,
    recentTransactionCount: 11,
    ...overrides,
  }
}

function buildStats(overrides: Partial<AdminStats> = {}): AdminStats {
  return {
    totalUsers: 42,
    totalProducts: 1240,
    totalOrders: 17,
    lowStockCount: 4,
    ...overrides,
  }
}

function buildNotice(overrides: Partial<AdminNotice> = {}): AdminNotice {
  return {
    id: 1,
    title: '시스템 점검 안내',
    content: '오늘 밤 시스템 점검이 있습니다.',
    type: 'SYSTEM',
    active: true,
    createdBy: 1,
    noticeAt: '2026-06-05T09:00:00Z',
    createdAt: '2026-06-05T08:00:00Z',
    updatedAt: '2026-06-05T08:30:00Z',
    ...overrides,
  }
}

function buildAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 1,
    entityType: 'USER',
    entityId: 33,
    targetIdentifier: 'USER-33',
    action: 'CREATE',
    oldValue: null,
    newValue: null,
    performedBy: 7,
    performedByName: 'Admin User',
    performedByEmail: 'admin@stockops.test',
    performedAt: '2026-06-05T10:00:00Z',
    ...overrides,
  }
}

function buildTeamsConfig(overrides: Partial<NotificationChannelConfig> = {}): NotificationChannelConfig {
  return {
    id: 1,
    centerId: 1,
    warehouseId: null,
    alertType: 'TEMPERATURE',
    channels: [{ type: 'WEBHOOK', enabled: true, webhookProvider: 'TEAMS' }],
    active: true,
    createdAt: '2026-06-05T08:00:00Z',
    updatedAt: '2026-06-05T08:30:00Z',
    ...overrides,
  }
}

function mockQuery<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  }
}

function mockDashboardQueries(overrides: {
  summary?: Record<string, unknown>
  stats?: Record<string, unknown>
  notices?: Record<string, unknown>
  auditLogs?: Record<string, unknown>
  teams?: Record<string, unknown>
} = {}) {
  vi.mocked(useAdminDashboardSummary).mockReturnValue(
    mockQuery(buildSummary(), overrides.summary) as unknown as ReturnType<typeof useAdminDashboardSummary>
  )
  vi.mocked(useAdminStats).mockReturnValue(
    mockQuery(buildStats(), overrides.stats) as unknown as ReturnType<typeof useAdminStats>
  )
  vi.mocked(useActiveAdminNotices).mockReturnValue(
    mockQuery([buildNotice(), buildNotice({ id: 2, title: '입고 정책 업데이트', type: 'UPDATE' })], overrides.notices) as unknown as ReturnType<typeof useActiveAdminNotices>
  )
  vi.mocked(useRecentAuditLogs).mockReturnValue(
    mockQuery([buildAuditLog()], overrides.auditLogs) as unknown as ReturnType<typeof useRecentAuditLogs>
  )
  vi.mocked(useAllNotificationChannelConfigs).mockReturnValue(
    mockQuery([
      buildTeamsConfig(),
      buildTeamsConfig({ id: 2, active: false, channels: [{ type: 'WEBHOOK', enabled: false, webhookProvider: 'TEAMS' }] }),
      buildTeamsConfig({ id: 3, channels: [{ type: 'EMAIL', enabled: true, webhookProvider: null }] }),
    ], overrides.teams) as unknown as ReturnType<typeof useAllNotificationChannelConfigs>
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDashboardQueries()
  })

  it('renders real dashboard metrics from contracted API hooks without placeholder widgets', () => {
    render(<AdminPage />)

    expect(within(screen.getByLabelText('전체 사용자')).getByText('42')).toBeInTheDocument()
    expect(within(screen.getByLabelText('등록 상품')).getByText('1,240')).toBeInTheDocument()
    expect(within(screen.getByLabelText('오늘 입출고')).getByText('8 / 3')).toBeInTheDocument()
    expect(within(screen.getByLabelText('활성 공지')).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Teams 채널')).getByText('1/2')).toBeInTheDocument()

    expect(screen.getByText('시스템 점검 안내')).toBeInTheDocument()
    expect(screen.getByText('입고 정책 업데이트')).toBeInTheDocument()
    expect(screen.getByText('CREATE')).toBeInTheDocument()
    expect(screen.getByText('Admin User · USER-33')).toBeInTheDocument()
    expect(screen.getByText('등록 설정')).toBeInTheDocument()
    expect(screen.getByText('활성 설정')).toBeInTheDocument()
    expect(screen.getByText('비활성/중지')).toBeInTheDocument()
    expect(screen.queryByText('메뉴 수')).not.toBeInTheDocument()
  })

  it('shows loading states while dashboard APIs are pending', () => {
    mockDashboardQueries({
      summary: { data: undefined, isLoading: true },
      stats: { data: undefined, isLoading: true },
      notices: { data: undefined, isLoading: true },
      auditLogs: { data: undefined, isLoading: true },
      teams: { data: undefined, isLoading: true },
    })

    render(<AdminPage />)

    expect(screen.getByText('대시보드 데이터를 불러오는 중입니다.')).toBeInTheDocument()
    expect(screen.getByText('감사 로그를 불러오는 중입니다.')).toBeInTheDocument()
    expect(screen.getByText('활성 공지를 불러오는 중입니다.')).toBeInTheDocument()
    expect(screen.getByText('Teams 채널 설정을 불러오는 중입니다.')).toBeInTheDocument()
  })

  it('shows honest empty states without substituting fake data', () => {
    mockDashboardQueries({
      notices: { data: [] },
      auditLogs: { data: [] },
      teams: { data: [] },
    })

    render(<AdminPage />)

    expect(screen.getByText('활성화된 공지가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText(/대체 로그나 샘플 이벤트는 표시하지 않습니다/)).toBeInTheDocument()
    expect(screen.getByText(/지원되지 않는 메신저 상태는 표시하지 않습니다/)).toBeInTheDocument()
    expect(within(screen.getByLabelText('Teams 채널')).getByText('미설정')).toBeInTheDocument()
  })

  it('surfaces API errors instead of fallback metrics', () => {
    mockDashboardQueries({
      summary: { data: undefined, isError: true, error: new Error('summary failed') },
      stats: { data: undefined, isError: true, error: new Error('stats failed') },
      notices: { data: undefined, isError: true, error: new Error('notices failed') },
      auditLogs: { data: undefined, isError: true, error: new Error('audit failed') },
      teams: { data: undefined, isError: true, error: new Error('teams failed') },
    })

    render(<AdminPage />)

    expect(screen.getByText(/일부 운영 데이터를 불러오지 못했습니다/)).toBeInTheDocument()
    expect(screen.getByText('최근 감사 로그를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByText('활성 공지를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByText('Teams 채널 상태를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(within(screen.getByLabelText('전체 사용자')).getByText('—')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Teams 채널')).getByText('—')).toBeInTheDocument()
  })
})
