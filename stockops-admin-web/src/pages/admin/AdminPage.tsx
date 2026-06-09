import { Activity, AlertTriangle, Bell, CheckCircle2, ClipboardList, Package, RefreshCw, Users } from 'lucide-react'
import {
  useActiveAdminNotices,
  useAdminDashboardSummary,
  useAdminStats,
  useRecentAuditLogs,
} from '@/hooks/useAdmin'
import { useAllNotificationChannelConfigs } from '@/hooks/useNotificationChannelConfigs'
import type { AdminNotice, AuditLog } from '@/types/admin'
import type { ChannelEntry, NotificationChannelConfig } from '@/types/notificationChannel'

type StatusState = 'loading' | 'ready' | 'empty' | 'error'

interface MetricCardProps {
  title: string
  value: string
  helper: string
  status: StatusState
  icon: React.ComponentType<{ className?: string }>
  tone: 'primary' | 'success' | 'warning' | 'info' | 'neutral'
}

const toneClasses: Record<MetricCardProps['tone'], string> = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-neutral-100 text-neutral-500',
}

function formatNumber(value: number | undefined): string {
  if (value === undefined) return '—'
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '일시 정보 없음'

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getStatusLabel(status: StatusState): string {
  switch (status) {
    case 'loading':
      return '불러오는 중'
    case 'error':
      return '불러오기 실패'
    case 'empty':
      return '데이터 없음'
    case 'ready':
      return 'API 연동됨'
  }
}

function MetricCard({ title, value, helper, status, icon: Icon, tone }: MetricCardProps) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5" aria-label={title}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
          <p className="mt-1 text-xs text-neutral-500">{helper}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-4 text-xs text-neutral-400">{getStatusLabel(status)}</p>
    </section>
  )
}

function findTeamsChannel(config: NotificationChannelConfig): ChannelEntry | undefined {
  return config.channels.find((channel) => channel.type === 'WEBHOOK' && channel.webhookProvider === 'TEAMS')
}

function getAuditActor(log: AuditLog): string {
  return log.performedByName ?? log.performedByEmail ?? (log.performedBy ? `사용자 #${log.performedBy}` : '시스템')
}

function getAuditTarget(log: AuditLog): string {
  if (log.targetIdentifier) return log.targetIdentifier
  if (log.entityId) return `${log.entityType} #${log.entityId}`
  return log.entityType
}

function noticeTypeLabel(type: AdminNotice['type']): string {
  switch (type) {
    case 'MAINTENANCE':
      return '점검'
    case 'UPDATE':
      return '업데이트'
    case 'SYSTEM':
      return '시스템'
  }
}

export function AdminPage() {
  const summaryQuery = useAdminDashboardSummary()
  const statsQuery = useAdminStats()
  const activeNoticesQuery = useActiveAdminNotices()
  const recentAuditLogsQuery = useRecentAuditLogs()
  const teamsConfigsQuery = useAllNotificationChannelConfigs()

  const activeNotices = activeNoticesQuery.data ?? []
  const recentAuditLogs = recentAuditLogsQuery.data ?? []
  const teamsConfigs = (teamsConfigsQuery.data ?? []).filter(findTeamsChannel)
  const enabledTeamsConfigs = teamsConfigs.filter((config) => {
    const teamsChannel = findTeamsChannel(config)
    return config.active && teamsChannel?.enabled
  })

  const hasAnyError = summaryQuery.isError || statsQuery.isError || activeNoticesQuery.isError || recentAuditLogsQuery.isError || teamsConfigsQuery.isError
  const isAnyLoading = summaryQuery.isLoading || statsQuery.isLoading || activeNoticesQuery.isLoading || recentAuditLogsQuery.isLoading || teamsConfigsQuery.isLoading

  const teamsStatus: StatusState = teamsConfigsQuery.isLoading
    ? 'loading'
    : teamsConfigsQuery.isError
      ? 'error'
      : teamsConfigs.length === 0
        ? 'empty'
        : 'ready'

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">관리자 대시보드</h1>
          <p className="mt-1 text-sm text-neutral-500">계약된 운영 API에서 확인된 값만 표시합니다.</p>
        </div>
        {isAnyLoading && (
          <div className="flex items-center gap-2 text-sm text-neutral-500" role="status">
            <RefreshCw className="h-4 w-4 animate-spin" />
            대시보드 데이터를 불러오는 중입니다.
          </div>
        )}
      </div>

      {hasAnyError && (
        <div className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
          일부 운영 데이터를 불러오지 못했습니다. 실패한 영역은 임시 값 없이 오류 상태로 표시됩니다.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="전체 사용자"
          value={formatNumber(statsQuery.data?.totalUsers)}
          helper="/v1/admin/stats 기준"
          status={statsQuery.isLoading ? 'loading' : statsQuery.isError ? 'error' : 'ready'}
          icon={Users}
          tone="primary"
        />
        <MetricCard
          title="등록 상품"
          value={formatNumber(summaryQuery.data?.totalProducts)}
          helper="/v1/dashboard/summary 기준"
          status={summaryQuery.isLoading ? 'loading' : summaryQuery.isError ? 'error' : 'ready'}
          icon={Package}
          tone="info"
        />
        <MetricCard
          title="오늘 입출고"
          value={summaryQuery.data ? `${formatNumber(summaryQuery.data.todayInboundCount)} / ${formatNumber(summaryQuery.data.todayOutboundCount)}` : '—'}
          helper="입고 / 출고 건수"
          status={summaryQuery.isLoading ? 'loading' : summaryQuery.isError ? 'error' : 'ready'}
          icon={Activity}
          tone="success"
        />
        <MetricCard
          title="활성 공지"
          value={activeNoticesQuery.isError ? '—' : formatNumber(activeNotices.length)}
          helper="/v1/notices/active 기준"
          status={activeNoticesQuery.isLoading ? 'loading' : activeNoticesQuery.isError ? 'error' : activeNotices.length === 0 ? 'empty' : 'ready'}
          icon={Bell}
          tone="warning"
        />
        <MetricCard
          title="Teams 채널"
          value={teamsConfigsQuery.isError ? '—' : teamsConfigs.length === 0 ? '미설정' : `${enabledTeamsConfigs.length}/${teamsConfigs.length}`}
          helper="활성 / 등록 Teams webhook"
          status={teamsStatus}
          icon={CheckCircle2}
          tone={teamsConfigs.length > 0 && enabledTeamsConfigs.length === 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">최근 감사 로그</h2>
              <p className="text-sm text-neutral-500">/v1/audit-logs/recent 응답을 표시합니다.</p>
            </div>
            <ClipboardList className="h-5 w-5 text-neutral-400" />
          </div>
          {recentAuditLogsQuery.isLoading ? (
            <p className="text-sm text-neutral-500" role="status">감사 로그를 불러오는 중입니다.</p>
          ) : recentAuditLogsQuery.isError ? (
            <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning" role="alert">최근 감사 로그를 불러오지 못했습니다.</p>
          ) : recentAuditLogs.length === 0 ? (
            <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
              최근 감사 로그가 없습니다. 대체 로그나 샘플 이벤트는 표시하지 않습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAuditLogs.slice(0, 5).map((log) => (
                <article key={log.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-neutral-900">{log.action}</p>
                    <time className="text-xs text-neutral-500" dateTime={log.performedAt}>{formatDateTime(log.performedAt)}</time>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{getAuditActor(log)} · {getAuditTarget(log)}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">활성 공지</h2>
              <p className="text-sm text-neutral-500">현재 활성 공지만 표시합니다.</p>
            </div>
            <Bell className="h-5 w-5 text-neutral-400" />
          </div>
          {activeNoticesQuery.isLoading ? (
            <p className="text-sm text-neutral-500" role="status">활성 공지를 불러오는 중입니다.</p>
          ) : activeNoticesQuery.isError ? (
            <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning" role="alert">활성 공지를 불러오지 못했습니다.</p>
          ) : activeNotices.length === 0 ? (
            <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">활성화된 공지가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {activeNotices.slice(0, 5).map((notice) => (
                <article key={notice.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                  <p className="truncate font-medium text-neutral-900">{notice.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{noticeTypeLabel(notice.type)} · {formatDateTime(notice.noticeAt ?? notice.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Microsoft Teams 알림 상태</h2>
            <p className="text-sm text-neutral-500">notification-channel-configs API에서 Teams webhook 설정만 집계합니다.</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-neutral-400" />
        </div>
        {teamsConfigsQuery.isLoading ? (
          <p className="text-sm text-neutral-500" role="status">Teams 채널 설정을 불러오는 중입니다.</p>
        ) : teamsConfigsQuery.isError ? (
          <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning" role="alert">Teams 채널 상태를 불러오지 못했습니다.</p>
        ) : teamsConfigs.length === 0 ? (
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
            등록된 Microsoft Teams webhook 설정이 없습니다. 지원되지 않는 메신저 상태는 표시하지 않습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">등록 설정</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">{formatNumber(teamsConfigs.length)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">활성 설정</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">{formatNumber(enabledTeamsConfigs.length)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">비활성/중지</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">{formatNumber(teamsConfigs.length - enabledTeamsConfigs.length)}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
