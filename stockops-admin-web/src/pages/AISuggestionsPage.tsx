/**
 * AI suggestion approval workspace page.
 * Displays AI-generated suggestions with list filters, status badges,
 * detail view, approve/reject/execute actions, and stale-status conflict handling.
 * Uses backend-provided allowedActions to gate action buttons.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  useSuggestions,
  useSuggestion,
  useApproveSuggestion,
  useRejectSuggestion,
  useExecuteSuggestion,
} from '@/hooks/useAISuggestion'
import type { AISuggestion, AISuggestionStatus, AISuggestionAction } from '@/types/aiSuggestion'
import { showToast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import {
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  AlertTriangle,
  Brain,
} from 'lucide-react'

const STATUS_CONFIG: Record<AISuggestionStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: '대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: '승인', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  REJECTED: { label: '거부', color: 'bg-red-100 text-red-700', icon: XCircle },
  EXECUTED: { label: '실행 완료', color: 'bg-blue-100 text-blue-700', icon: Play },
  FAILED: { label: '실행 실패', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  INFO: { label: '정보', color: 'bg-sky-100 text-sky-700' },
  WARNING: { label: '주의', color: 'bg-amber-100 text-amber-700' },
  LOW: { label: '낮음', color: 'bg-neutral-100 text-neutral-600' },
  MEDIUM: { label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  HIGH: { label: '높음', color: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: '긴급', color: 'bg-red-100 text-red-700' },
}

const DEFAULT_SEVERITY_CONFIG = { label: '알 수 없음', color: 'bg-neutral-100 text-neutral-500' }

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function formatPayloadSummary(payloadJson: string | null | undefined): string {
  if (!payloadJson) return '-'
  try {
    const parsed = JSON.parse(payloadJson)
    return Object.entries(parsed)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  } catch {
    return payloadJson.slice(0, 80)
  }
}

export function AISuggestionsPage() {
  const isOnline = useOnlineStatus()

  const [statusFilter, setStatusFilter] = useState<AISuggestionStatus | ''>('')
  const [scopeTypeFilter, setScopeTypeFilter] = useState<string>('')
  const [scopeIdFilter, setScopeIdFilter] = useState<string>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveTarget, setApproveTarget] = useState<number | null>(null)
  const [executeTarget, setExecuteTarget] = useState<number | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const filter = {
    ...(statusFilter ? { status: statusFilter as AISuggestionStatus } : {}),
    ...(scopeTypeFilter ? { targetScopeType: scopeTypeFilter } : {}),
    ...(scopeIdFilter ? { targetScopeId: Number(scopeIdFilter) } : {}),
  }

  const suggestionsQuery = useSuggestions(filter)
  const detailQuery = useSuggestion(selectedId)
  const approveMutation = useApproveSuggestion()
  const rejectMutation = useRejectSuggestion()
  const executeMutation = useExecuteSuggestion()

  const suggestions = suggestionsQuery.data ?? []

  const pendingCount = suggestions.filter((s) => s.status === 'PENDING').length
  const approvedCount = suggestions.filter((s) => s.status === 'APPROVED').length
  const rejectedCount = suggestions.filter((s) => s.status === 'REJECTED').length
  const executedCount = suggestions.filter((s) => s.status === 'EXECUTED').length
  const failedCount = suggestions.filter((s) => s.status === 'FAILED').length

  const handleApprove = useCallback(async (id: number) => {
    try {
      await approveMutation.mutateAsync(id)
      showToast({ message: '제안이 승인되었습니다.', variant: 'success' })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (axiosErr.response?.status === 409) {
        showToast({ message: '제안 상태가 변경되었습니다. 새로고침 후 다시 시도하세요.', variant: 'error' })
      } else {
        showToast({ message: axiosErr.response?.data?.message ?? '승인에 실패했습니다.', variant: 'error' })
      }
    } finally {
      setApproveTarget(null)
    }
  }, [approveMutation])

  const handleReject = useCallback(async (id: number, reason: string) => {
    try {
      await rejectMutation.mutateAsync({ id, request: { rejectionReason: reason } })
      showToast({ message: '제안이 거부되었습니다.', variant: 'success' })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (axiosErr.response?.status === 409) {
        showToast({ message: '제안 상태가 변경되었습니다. 새로고침 후 다시 시도하세요.', variant: 'error' })
      } else {
        showToast({ message: axiosErr.response?.data?.message ?? '거부에 실패했습니다.', variant: 'error' })
      }
    } finally {
      setRejectTarget(null)
      setRejectReason('')
    }
  }, [rejectMutation])

  const handleExecute = useCallback(async (id: number) => {
    try {
      await executeMutation.mutateAsync({ id })
      showToast({ message: '제안이 실행되었습니다.', variant: 'success' })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (axiosErr.response?.status === 409) {
        showToast({ message: '제안 상태가 변경되었습니다. 새로고침 후 다시 시도하세요.', variant: 'error' })
      } else {
        showToast({ message: axiosErr.response?.data?.message ?? '실행에 실패했습니다.', variant: 'error' })
      }
    } finally {
      setExecuteTarget(null)
    }
  }, [executeMutation])

  const isActionAllowed = (suggestion: AISuggestion, action: AISuggestionAction): boolean => {
    return suggestion.allowedActions.includes(action)
  }

  return (
    <div className="space-y-6" data-testid="ai-suggestions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI 제안 관리</h1>
          <p className="text-text-secondary mt-1">
            AI 생성 제안을 검토하고 승인, 거부, 또는 실행하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => suggestionsQuery.refetch()}
            disabled={suggestionsQuery.isLoading || !isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="suggestion-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${suggestionsQuery.isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200" data-testid="suggestion-filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">필터</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="suggestion-status-filter" className="block text-xs font-medium text-text-secondary mb-1">상태</label>
            <select
              id="suggestion-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AISuggestionStatus | '')}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="suggestion-status-filter"
            >
              <option value="">전체 상태</option>
              <option value="PENDING">대기</option>
              <option value="APPROVED">승인</option>
              <option value="REJECTED">거부</option>
              <option value="EXECUTED">실행 완료</option>
              <option value="FAILED">실행 실패</option>
            </select>
          </div>
          <div>
            <label htmlFor="suggestion-scope-type-filter" className="block text-xs font-medium text-text-secondary mb-1">스코프 유형</label>
            <select
              id="suggestion-scope-type-filter"
              value={scopeTypeFilter}
              onChange={(e) => setScopeTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="suggestion-scope-type-filter"
            >
              <option value="">전체 스코프</option>
              <option value="ADMIN">관리</option>
              <option value="CENTER">센터</option>
              <option value="WAREHOUSE">창고</option>
              <option value="STORE">매장</option>
            </select>
          </div>
          <div>
            <label htmlFor="suggestion-scope-id-filter" className="block text-xs font-medium text-text-secondary mb-1">스코프 ID</label>
            <input
              id="suggestion-scope-id-filter"
              type="number"
              value={scopeIdFilter}
              onChange={(e) => setScopeIdFilter(e.target.value)}
              placeholder="ID 입력"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="suggestion-scope-id-filter"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="suggestion-summary-cards">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">대기</h3>
          <p className="text-2xl font-bold text-amber-600" data-testid="suggestion-pending-count">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">승인</h3>
          <p className="text-2xl font-bold text-emerald-600" data-testid="suggestion-approved-count">{approvedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">거부</h3>
          <p className="text-2xl font-bold text-red-600" data-testid="suggestion-rejected-count">{rejectedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">실행 완료</h3>
          <p className="text-2xl font-bold text-blue-600" data-testid="suggestion-executed-count">{executedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">실행 실패</h3>
          <p className="text-2xl font-bold text-red-800" data-testid="suggestion-failed-count">{failedCount}</p>
        </div>
      </div>

      {/* Loading State */}
      {suggestionsQuery.isLoading && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 animate-pulse" data-testid="suggestion-loading">
          <div className="space-y-4">
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-4 bg-neutral-200 rounded w-2/3" />
            <div className="h-40 bg-neutral-100 rounded" />
          </div>
        </div>
      )}

      {/* Error State */}
      {suggestionsQuery.error && (
        <EmptyState
          title="제안 데이터를 불러오지 못했습니다"
          description="필터를 변경하거나 다시 시도해주세요."
          variant="error"
          actionLabel="다시 시도"
          onAction={() => suggestionsQuery.refetch()}
        />
      )}

      {/* Empty State */}
      {!suggestionsQuery.isLoading && !suggestionsQuery.error && suggestions.length === 0 && (
        <EmptyState
          title="제안 데이터가 없습니다"
          description="필터를 변경하거나, AI 스케줄러가 실행될 때까지 기다려주세요."
          icon={Brain}
        />
      )}

      {/* Suggestion Table */}
      {!suggestionsQuery.isLoading && !suggestionsQuery.error && suggestions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden" data-testid="suggestion-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">유형</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">제목</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">심각도</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">스코프</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">신뢰도</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">생성일</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {suggestions.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    isExpanded={expandedRow === suggestion.id}
                    onToggleExpand={() => setExpandedRow(expandedRow === suggestion.id ? null : suggestion.id)}
                    onOpenDetail={() => setSelectedId(suggestion.id)}
                    isOnline={isOnline}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                    isExecuting={executeMutation.isPending}
                    onApprove={() => setApproveTarget(suggestion.id)}
                    onReject={() => setRejectTarget(suggestion.id)}
                    onExecute={() => setExecuteTarget(suggestion.id)}
                    isActionAllowed={isActionAllowed}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Panel - Loading State */}
      {selectedId && detailQuery.isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 animate-pulse" data-testid="suggestion-detail-loading">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-neutral-200 rounded w-24" />
            <div className="h-5 w-5 bg-neutral-200 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 bg-neutral-200 rounded w-16" />
              <div className="h-4 bg-neutral-100 rounded w-32" />
              <div className="h-4 bg-neutral-200 rounded w-12" />
              <div className="h-4 bg-neutral-100 rounded w-28" />
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-neutral-200 rounded w-20" />
              <div className="h-4 bg-neutral-100 rounded w-40" />
              <div className="h-4 bg-neutral-200 rounded w-14" />
              <div className="h-4 bg-neutral-100 rounded w-36" />
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel - Error State */}
      {selectedId && detailQuery.isError && (
        <EmptyState
          title="제안 상세를 불러오지 못했습니다"
          description="다시 시도해주세요."
          variant="error"
          actionLabel="다시 시도"
          onAction={() => detailQuery.refetch()}
        />
      )}

      {/* Detail Panel - Data */}
      {selectedId && detailQuery.data && (
        <SuggestionDetailPanel
          suggestion={detailQuery.data}
          onClose={() => setSelectedId(null)}
          isOnline={isOnline}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
          isExecuting={executeMutation.isPending}
          onApprove={() => setApproveTarget(detailQuery.data!.id)}
          onReject={() => setRejectTarget(detailQuery.data!.id)}
          onExecute={() => setExecuteTarget(detailQuery.data!.id)}
          isActionAllowed={isActionAllowed}
        />
      )}

      {/* Approve Confirmation */}
      <ConfirmDialog
        open={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => { if (approveTarget !== null) handleApprove(approveTarget) }}
        title="제안 승인"
        description="이 AI 제안을 승인하시겠습니까? 승인 후 실행 가능합니다."
        confirmLabel="승인"
      />

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectTarget !== null}
        onClose={() => { setRejectTarget(null); setRejectReason('') }}
        onConfirm={() => {
          if (rejectTarget !== null && rejectReason.trim()) {
            handleReject(rejectTarget, rejectReason.trim())
          }
        }}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        isPending={rejectMutation.isPending}
      />

      {/* Execute Confirmation */}
      <ConfirmDialog
        open={executeTarget !== null}
        onClose={() => setExecuteTarget(null)}
        onConfirm={() => { if (executeTarget !== null) handleExecute(executeTarget) }}
        title="제안 실행"
        description="이 AI 제안을 실행하시겠습니까? 실행 후 되돌릴 수 없습니다."
        confirmLabel="실행"
      />
    </div>
  )
}

interface SuggestionRowProps {
  suggestion: AISuggestion
  isExpanded: boolean
  onToggleExpand: () => void
  onOpenDetail: () => void
  isOnline: boolean
  isApproving: boolean
  isRejecting: boolean
  isExecuting: boolean
  onApprove: () => void
  onReject: () => void
  onExecute: () => void
  isActionAllowed: (suggestion: AISuggestion, action: AISuggestionAction) => boolean
}

function SuggestionRow({
  suggestion: s,
  isExpanded,
  onToggleExpand,
  onOpenDetail,
  isOnline,
  isApproving,
  isRejecting,
  isExecuting,
  onApprove,
  onReject,
  onExecute,
  isActionAllowed,
}: SuggestionRowProps) {
  const statusConfig = STATUS_CONFIG[s.status]
  const severityConfig = SEVERITY_CONFIG[s.severity] ?? DEFAULT_SEVERITY_CONFIG
  const StatusIcon = statusConfig.icon

  return (
    <>
      <tr
        className={`hover:bg-neutral-50 ${s.status === 'FAILED' ? 'bg-red-50/30' : ''}`}
        data-testid={`suggestion-row-${s.id}`}
      >
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`} data-testid={`suggestion-status-${s.id}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </td>
        <td className="px-4 py-3 text-text-secondary" data-testid={`suggestion-type-${s.id}`}>
          {s.type}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-text-primary" data-testid={`suggestion-title-${s.id}`}>
            <button
              type="button"
              onClick={() => {
                onToggleExpand()
                onOpenDetail()
              }}
              className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            >
              {s.title}
            </button>
          </div>
          {s.summary && (
            <div className="text-xs text-text-secondary truncate max-w-xs" data-testid={`suggestion-summary-${s.id}`}>
              {s.summary}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${severityConfig.color}`} data-testid={`suggestion-severity-${s.id}`}>
            {severityConfig.label}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-text-secondary" data-testid={`suggestion-scope-${s.id}`}>
          {s.scopeMetadata?.targetScopeType ?? '-'}
          {s.scopeMetadata?.targetScopeId != null ? `#${s.scopeMetadata.targetScopeId}` : ''}
        </td>
        <td className="px-4 py-3 text-right font-mono" data-testid={`suggestion-confidence-${s.id}`}>
          {s.confidenceScore != null ? `${(s.confidenceScore * 100).toFixed(0)}%` : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-text-secondary" data-testid={`suggestion-created-${s.id}`}>
          {formatDateTime(s.auditSummary?.createdAt)}
        </td>
        <td className="px-4 py-3" data-testid={`suggestion-actions-${s.id}`}>
          <div className="flex items-center gap-1">
            {isActionAllowed(s, 'APPROVE') && (
              <button
                type="button"
                onClick={onApprove}
                disabled={isApproving || !isOnline}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                data-testid={`suggestion-approve-btn-${s.id}`}
                title={!isOnline ? '오프라인에서는 승인할 수 없습니다.' : undefined}
              >
                <CheckCircle2 className="w-3 h-3" />
                {isApproving ? '승인 중...' : '승인'}
              </button>
            )}
            {isActionAllowed(s, 'REJECT') && (
              <button
                type="button"
                onClick={onReject}
                disabled={isRejecting || !isOnline}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                data-testid={`suggestion-reject-btn-${s.id}`}
                title={!isOnline ? '오프라인에서는 거부할 수 없습니다.' : undefined}
              >
                <XCircle className="w-3 h-3" />
                거부
              </button>
            )}
            {isActionAllowed(s, 'EXECUTE') && (
              <button
                type="button"
                onClick={onExecute}
                disabled={isExecuting || !isOnline}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                data-testid={`suggestion-execute-btn-${s.id}`}
                title={!isOnline ? '오프라인에서는 실행할 수 없습니다.' : undefined}
              >
                <Play className="w-3 h-3" />
                {isExecuting ? '실행 중...' : '실행'}
              </button>
            )}
            {!isActionAllowed(s, 'APPROVE') && !isActionAllowed(s, 'REJECT') && !isActionAllowed(s, 'EXECUTE') && (
              <span className="text-xs text-neutral-400" data-testid={`suggestion-no-actions-${s.id}`}>
                {s.status === 'EXECUTED' ? '완료' : s.status === 'REJECTED' ? '거부됨' : s.status === 'FAILED' ? '실패' : '-'}
              </span>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr data-testid={`suggestion-expanded-${s.id}`}>
          <td colSpan={8} className="px-4 py-3 bg-neutral-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-text-primary mb-1">상세 정보</h4>
                <p className="text-text-secondary mb-2" data-testid={`suggestion-reason-${s.id}`}>{s.reason}</p>
                <p className="text-text-secondary" data-testid={`suggestion-action-${s.id}`}>
                  <span className="font-medium">권장 조치:</span> {s.recommendedAction}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-text-primary mb-1">페이로드</h4>
                <p className="text-text-secondary text-xs font-mono" data-testid={`suggestion-payload-${s.id}`}>
                  {formatPayloadSummary(s.payloadJson)}
                </p>
                {s.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs" data-testid={`suggestion-error-${s.id}`}>
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {s.errorMessage}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface SuggestionDetailPanelProps {
  suggestion: AISuggestion
  onClose: () => void
  isOnline: boolean
  isApproving: boolean
  isRejecting: boolean
  isExecuting: boolean
  onApprove: () => void
  onReject: () => void
  onExecute: () => void
  isActionAllowed: (suggestion: AISuggestion, action: AISuggestionAction) => boolean
}

function SuggestionDetailPanel({
  suggestion: s,
  onClose,
  isOnline,
  isApproving,
  isRejecting,
  isExecuting,
  onApprove,
  onReject,
  onExecute,
  isActionAllowed,
}: SuggestionDetailPanelProps) {
  const statusConfig = STATUS_CONFIG[s.status]
  const severityConfig = SEVERITY_CONFIG[s.severity] ?? DEFAULT_SEVERITY_CONFIG
  const StatusIcon = statusConfig.icon

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6" data-testid="suggestion-detail-panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">제안 상세</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500"
          data-testid="suggestion-detail-close"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-text-secondary">상태</span>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">제목</span>
            <p className="mt-1 text-sm text-text-primary">{s.title}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">유형</span>
            <p className="mt-1 text-sm text-text-primary">{s.type}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">심각도</span>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${severityConfig.color}`}>
                {severityConfig.label}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">신뢰도</span>
            <p className="mt-1 text-sm text-text-primary">{s.confidenceScore != null ? `${(s.confidenceScore * 100).toFixed(0)}%` : '-'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-text-secondary">사유</span>
            <p className="mt-1 text-sm text-text-primary">{s.reason}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">권장 조치</span>
            <p className="mt-1 text-sm text-text-primary">{s.recommendedAction}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">스코프</span>
            <p className="mt-1 text-sm text-text-primary">
              {s.scopeMetadata?.targetScopeType ?? '-'}
              {s.scopeMetadata?.targetScopeId != null ? ` #${s.scopeMetadata.targetScopeId}` : ''}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary">페이로드</span>
            <p className="mt-1 text-sm text-text-primary font-mono text-xs">{formatPayloadSummary(s.payloadJson)}</p>
          </div>
          {s.errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs font-medium text-red-700">오류 메시지</span>
              <p className="mt-1 text-sm text-red-700">{s.errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Metadata */}
      {(s.forecastSourceType || s.forecastSourceId || s.forecastModelVersion) && (
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <h3 className="text-sm font-medium text-text-primary mb-2">예측 메타데이터</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {s.forecastSourceType && (
              <div>
                <span className="text-text-secondary">예측 유형</span>
                <p className="text-text-primary font-medium">{s.forecastSourceType}</p>
              </div>
            )}
            {s.forecastSourceId != null && (
              <div>
                <span className="text-text-secondary">예측 ID</span>
                <p className="text-text-primary font-medium">{s.forecastSourceId}</p>
              </div>
            )}
            {s.forecastModelVersion && (
              <div>
                <span className="text-text-secondary">모델 버전</span>
                <p className="text-text-primary font-medium">{s.forecastModelVersion}</p>
              </div>
            )}
            {s.forecastGeneratedAt && (
              <div>
                <span className="text-text-secondary">생성 시각</span>
                <p className="text-text-primary font-medium">{formatDateTime(s.forecastGeneratedAt)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Summary */}
      {s.auditSummary && (
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <h3 className="text-sm font-medium text-text-primary mb-2">감사 정보</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-text-secondary">생성자</span>
              <p className="text-text-primary font-medium">{s.auditSummary.createdByUserId ?? '-'}</p>
            </div>
            <div>
              <span className="text-text-secondary">생성일</span>
              <p className="text-text-primary font-medium">{formatDateTime(s.auditSummary.createdAt)}</p>
            </div>
            {s.auditSummary.approvedByUserId != null && (
              <div>
                <span className="text-text-secondary">승인자</span>
                <p className="text-text-primary font-medium">{s.auditSummary.approvedByUserId}</p>
              </div>
            )}
            {s.auditSummary.approvedAt && (
              <div>
                <span className="text-text-secondary">승인일</span>
                <p className="text-text-primary font-medium">{formatDateTime(s.auditSummary.approvedAt)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        {isActionAllowed(s, 'APPROVE') && (
          <button
            type="button"
            onClick={onApprove}
            disabled={isApproving || !isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="detail-approve-btn"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isApproving ? '승인 중...' : '승인'}
          </button>
        )}
        {isActionAllowed(s, 'REJECT') && (
          <button
            type="button"
            onClick={onReject}
            disabled={isRejecting || !isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="detail-reject-btn"
          >
            <XCircle className="w-4 h-4" />
            {isRejecting ? '거부 중...' : '거부'}
          </button>
        )}
        {isActionAllowed(s, 'EXECUTE') && (
          <button
            type="button"
            onClick={onExecute}
            disabled={isExecuting || !isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="detail-execute-btn"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? '실행 중...' : '실행'}
          </button>
        )}
        {!isActionAllowed(s, 'APPROVE') && !isActionAllowed(s, 'REJECT') && !isActionAllowed(s, 'EXECUTE') && (
          <span className="text-sm text-neutral-400" data-testid="detail-no-actions">
            {s.status === 'EXECUTED' ? '이 제안은 이미 실행되었습니다.' : s.status === 'REJECTED' ? '이 제안은 거부되었습니다.' : s.status === 'FAILED' ? '이 제안은 실행에 실패했습니다.' : '현재 상태에서 수행할 수 있는 작업이 없습니다.'}
          </span>
        )}
      </div>
    </div>
  )
}

interface RejectDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  reason: string
  onReasonChange: (value: string) => void
  isPending: boolean
}

function RejectDialog({ open, onClose, onConfirm, reason, onReasonChange, isPending }: RejectDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }

      // Focus trap: keep focus within the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [onClose],
  )

  // Focus textarea when dialog opens; prevent body scroll
  useEffect(() => {
    if (open) {
      textareaRef.current?.focus()
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Handle Enter key submission in textarea (Ctrl+Enter or Meta+Enter)
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && reason.trim() && !isPending) {
      e.preventDefault()
      onConfirm()
    }
  }

  if (!open) return null

  const isReasonEmpty = !reason.trim()

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
      aria-describedby="reject-dialog-description"
      data-testid="reject-dialog"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop - no action on click (prevents accidental dismiss) */}
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="reject-dialog-title"
          className="text-lg font-semibold text-neutral-900 mb-2"
        >
          제안 거부
        </h2>
        <p
          id="reject-dialog-description"
          className="text-sm text-neutral-600 mb-4"
        >
          거부 사유를 입력해주세요.
        </p>
        <label htmlFor="reject-reason-textarea" className="sr-only">거부 사유</label>
        <textarea
          id="reject-reason-textarea"
          ref={textareaRef}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          rows={3}
          placeholder="거부 사유를 입력하세요"
          data-testid="reject-reason-input"
          aria-describedby="reject-dialog-description"
        />
        <div className="flex gap-3 justify-end mt-4">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
            data-testid="reject-cancel-btn"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isReasonEmpty || isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="reject-confirm-btn"
          >
            {isPending ? '거부 중...' : '거부'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
