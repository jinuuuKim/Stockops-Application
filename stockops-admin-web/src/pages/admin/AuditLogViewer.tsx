import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { getAdminErrorMessage } from '@/api/admin'
import { useAuditLogs } from '@/hooks/useAdmin'
import type { AuditLog, AuditLogFilter } from '@/types/admin'

const auditLogPageSize = 20

interface AuditLogFilterForm {
  actor: string
  action: string
  targetType: string
  targetId: string
  from: string
  to: string
}

const emptyFilters: AuditLogFilterForm = {
  actor: '',
  action: '',
  targetType: '',
  targetId: '',
  from: '',
  to: '',
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toStartDate(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined
}

function toEndDate(value: string): string | undefined {
  return value ? `${value}T23:59:59.999Z` : undefined
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getActorLabel(log: AuditLog): string {
  if (log.performedByName) return log.performedByName
  if (log.performedByEmail) return log.performedByEmail
  if (log.performedBy) return `사용자 #${log.performedBy}`
  return '시스템'
}

function getTargetLabel(log: AuditLog): string {
  if (log.targetIdentifier) return log.targetIdentifier
  if (log.entityId) return `${log.entityType} #${log.entityId}`
  return log.entityType
}

function getChangeSummary(log: AuditLog): string {
  if (log.oldValue && log.newValue) return `${log.oldValue} → ${log.newValue}`
  if (log.newValue) return `새 값: ${log.newValue}`
  if (log.oldValue) return `이전 값: ${log.oldValue}`
  return '변경 상세 없음'
}

export function AuditLogViewer() {
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<AuditLogFilterForm>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilterForm>(emptyFilters)
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)

  const queryFilter = useMemo<AuditLogFilter>(() => ({
    page,
    size: auditLogPageSize,
    entityType: appliedFilters.targetType.trim() || undefined,
    entityId: parseOptionalNumber(appliedFilters.targetId),
    userId: parseOptionalNumber(appliedFilters.actor),
    startDate: toStartDate(appliedFilters.from),
    endDate: toEndDate(appliedFilters.to),
  }), [appliedFilters, page])

  const auditLogsQuery = useAuditLogs(queryFilter)
  const auditLogsPage = auditLogsQuery.data
  const logs = auditLogsPage?.content ?? []
  const actionFilter = appliedFilters.action.trim().toLowerCase()
  const visibleLogs = actionFilter
    ? logs.filter((log) => log.action.toLowerCase().includes(actionFilter))
    : logs
  const totalPages = auditLogsPage?.totalPages ?? 0
  const totalElements = auditLogsPage?.totalElements ?? 0
  const displayPage = (auditLogsPage?.number ?? page) + 1
  const selectedLog = visibleLogs.find((log) => log.id === selectedLogId) ?? null

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedFilters(filters)
    setSelectedLogId(null)
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setSelectedLogId(null)
    setPage(0)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">감사 로그</h1>
        <p className="mt-2 text-sm text-text-secondary">실제 감사 로그 API에서 작업자, 대상, 기간 조건으로 조회합니다.</p>
      </div>

      <form aria-label="감사 로그 필터" onSubmit={handleApplyFilters} className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label htmlFor="audit-actor" className="block text-sm font-medium text-neutral-700 mb-1">작업자 ID</label>
            <input
              id="audit-actor"
              type="number"
              min="1"
              value={filters.actor}
              onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))}
              placeholder="예: 7"
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="audit-action" className="block text-sm font-medium text-neutral-700 mb-1">작업</label>
            <input
              id="audit-action"
              type="text"
              value={filters.action}
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
              placeholder="CREATE"
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="audit-target-type" className="block text-sm font-medium text-neutral-700 mb-1">대상 유형</label>
            <input
              id="audit-target-type"
              type="text"
              value={filters.targetType}
              onChange={(event) => setFilters((current) => ({ ...current, targetType: event.target.value }))}
              placeholder="USER"
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="audit-target-id" className="block text-sm font-medium text-neutral-700 mb-1">대상 ID</label>
            <input
              id="audit-target-id"
              type="number"
              min="1"
              value={filters.targetId}
              onChange={(event) => setFilters((current) => ({ ...current, targetId: event.target.value }))}
              placeholder="예: 33"
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="audit-from" className="block text-sm font-medium text-neutral-700 mb-1">시작일</label>
            <input
              id="audit-from"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="audit-to" className="block text-sm font-medium text-neutral-700 mb-1">종료일</label>
            <input
              id="audit-to"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">작업 필터는 백엔드 계약에 전용 파라미터가 없어 현재 조회된 페이지 안에서만 좁힙니다.</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleResetFilters} className="px-4 py-2 min-h-[44px] rounded-lg border border-neutral-300 hover:bg-neutral-50">
              초기화
            </button>
            <button type="submit" className="px-4 py-2 min-h-[44px] rounded-lg bg-primary-600 text-white hover:bg-primary-700">
              필터 적용
            </button>
          </div>
        </div>
      </form>

      {auditLogsQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-text-secondary" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          감사 로그를 불러오는 중입니다.
        </div>
      )}

      {auditLogsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
          <div className="flex items-center justify-center gap-2 font-medium text-red-800">
            <AlertCircle className="h-5 w-5" />
            감사 로그를 불러오지 못했습니다.
          </div>
          <p className="mt-2 text-sm text-red-700">{getAdminErrorMessage(auditLogsQuery.error, '감사 로그 조회 중 오류가 발생했습니다.')}</p>
          <button type="button" onClick={() => auditLogsQuery.refetch()} className="mt-4 px-4 py-2 min-h-[44px] rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50">
            다시 시도
          </button>
        </div>
      )}

      {!auditLogsQuery.isLoading && !auditLogsQuery.isError && visibleLogs.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="font-medium text-text-primary">조건에 맞는 감사 로그가 없습니다.</p>
          <p className="mt-2 text-sm text-text-secondary">감사 로그 API가 빈 결과를 반환했습니다. 임시 로그는 표시하지 않습니다.</p>
        </div>
      )}

      {!auditLogsQuery.isLoading && !auditLogsQuery.isError && visibleLogs.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="w-full min-w-[860px]">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">시간</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">작업자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">작업</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">대상</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">요약</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log) => (
                    <tr key={log.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatDateTime(log.performedAt)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{getActorLabel(log)}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{getTargetLabel(log)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{getChangeSummary(log)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLogId(log.id)}
                          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                        >
                          상세 보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-secondary">총 {totalElements.toLocaleString()}건 · 현재 페이지 {visibleLogs.length.toLocaleString()}건 표시 · {displayPage} / {Math.max(totalPages, 1)} 페이지</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLogId(null)
                    setPage((current) => Math.max(current - 1, 0))
                  }}
                  disabled={page === 0}
                  className="px-4 py-2 min-h-[44px] rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLogId(null)
                    setPage((current) => current + 1)
                  }}
                  disabled={totalPages === 0 || page + 1 >= totalPages}
                  className="px-4 py-2 min-h-[44px] rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-text-primary">로그 상세</h2>
            {selectedLog ? (
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-text-secondary">작업자</dt>
                  <dd className="mt-1 text-text-primary">{getActorLabel(selectedLog)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">작업</dt>
                  <dd className="mt-1 text-text-primary">{selectedLog.action}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">대상</dt>
                  <dd className="mt-1 text-text-primary">{getTargetLabel(selectedLog)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">요약</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-text-primary">{getChangeSummary(selectedLog)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">시간</dt>
                  <dd className="mt-1 text-text-primary">{formatDateTime(selectedLog.performedAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">IP 주소</dt>
                  <dd className="mt-1 text-text-primary">{selectedLog.ipAddress || '제공되지 않음'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-secondary">User-Agent</dt>
                  <dd className="mt-1 break-words text-text-primary">{selectedLog.userAgent || '제공되지 않음'}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">로그를 선택하면 작업자, 작업, 대상, 요약, 시간, IP/User-Agent 상세가 표시됩니다.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
