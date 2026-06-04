/**
 * AI recommendation workspace page.
 * Displays deterministic reorder recommendations with forecast data,
 * confidence metadata, and approval workflow to create draft purchase orders.
 * Replaces the previous mock/chatbot placeholder UI.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useAIRecommendations, useApproveRecommendation } from '@/hooks/useAIRecommendation'
import type { AIRecommendation, AIRecommendationStatus } from '@/types/aiRecommendation'
import api from '@/lib/api'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Ban,
  RefreshCw,
  Filter,
  ShoppingCart,
} from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

interface CenterOption {
  id: number
  code: string
  name: string
}

interface WarehouseOption {
  id: number
  code: string
  name: string
  centerId: number
}

const STATUS_CONFIG: Record<AIRecommendationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  READY_FOR_APPROVAL: { label: '승인 대기', color: 'bg-amber-100 text-amber-700', icon: TrendingUp },
  NO_ACTION: { label: '조치 불필요', color: 'bg-neutral-100 text-neutral-600', icon: CheckCircle2 },
  INSUFFICIENT_HISTORY: { label: '데이터 부족', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  APPROVED_TO_DRAFT: { label: '승인 완료', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatDecimal(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '-'
  return value.toFixed(decimals)
}

export function AIFeaturesPage() {
  const user = useAuthStore((s) => s.user)
  const isOnline = useOnlineStatus()
  const scopeMetadata = user?.scopeMetadata

  const [centerId, setCenterId] = useState<number | undefined>(undefined)
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const filter = { centerId, warehouseId }
  const recommendationsQuery = useAIRecommendations(filter)
  const approveMutation = useApproveRecommendation()

  useEffect(() => {
    async function loadFilters() {
      try {
        const [centersRes, warehousesRes] = await Promise.all([
          api.get<CenterOption[]>('/v1/centers'),
          api.get<WarehouseOption[]>('/v1/warehouses'),
        ])
        setCenters(centersRes.data)
        setWarehouses(warehousesRes.data)
      } catch {
        // Filter data will remain empty
      }
    }
    loadFilters()
  }, [])

  useEffect(() => {
    if (scopeMetadata && !scopeMetadata.global) {
      /* eslint-disable react-hooks/set-state-in-effect -- applies server-provided single-scope defaults to the filter controls. */
      if (scopeMetadata.centerIds.length === 1) {
        setCenterId(scopeMetadata.centerIds[0])
      }
      if (scopeMetadata.warehouseIds.length === 1) {
        setWarehouseId(scopeMetadata.warehouseIds[0])
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [scopeMetadata])

  const scopedCenters = scopeMetadata?.global
    ? centers
    : centers.filter((c) => scopeMetadata?.centerIds.includes(c.id) ?? false)

  const scopedWarehouses = centerId
    ? warehouses.filter((w) => w.centerId === centerId)
    : warehouses

  const filteredWarehouses = scopeMetadata?.global
    ? scopedWarehouses
    : scopedWarehouses.filter((w) => scopeMetadata?.warehouseIds.includes(w.id) ?? false)

  const handleCenterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setCenterId(value ? Number(value) : undefined)
    setWarehouseId(undefined)
  }, [])

  const handleWarehouseChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setWarehouseId(value ? Number(value) : undefined)
  }, [])

  const handleApprove = useCallback(async (recommendationId: number) => {
    setApprovingId(recommendationId)
    try {
      await approveMutation.mutateAsync(recommendationId)
    } finally {
      setApprovingId(null)
    }
  }, [approveMutation])

  const recommendations = recommendationsQuery.data ?? []

  const readyCount = recommendations.filter((r) => r.status === 'READY_FOR_APPROVAL').length
  const approvedCount = recommendations.filter((r) => r.status === 'APPROVED_TO_DRAFT').length
  const insufficientCount = recommendations.filter((r) => r.status === 'INSUFFICIENT_HISTORY').length
  const noActionCount = recommendations.filter((r) => r.status === 'NO_ACTION').length

  return (
    <div className="space-y-6" data-testid="ai-recommendations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI 발주 추천</h1>
          <p className="text-text-secondary mt-1">
            수요 예측 기반 자동 발주 추천을 확인하고 승인하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => recommendationsQuery.refetch()}
            disabled={recommendationsQuery.isLoading || !isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="ai-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${recommendationsQuery.isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200" data-testid="ai-filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">필터</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ai-center-filter" className="block text-xs font-medium text-text-secondary mb-1">센터</label>
            <select
              id="ai-center-filter"
              value={centerId ?? ''}
              onChange={handleCenterChange}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="ai-center-filter"
            >
              <option value="">전체 센터</option>
              {scopedCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ai-warehouse-filter" className="block text-xs font-medium text-text-secondary mb-1">창고</label>
            <select
              id="ai-warehouse-filter"
              value={warehouseId ?? ''}
              onChange={handleWarehouseChange}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="ai-warehouse-filter"
            >
              <option value="">전체 창고</option>
              {filteredWarehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="ai-summary-cards">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">승인 대기</h3>
          <p className="text-2xl font-bold text-amber-600" data-testid="ai-ready-count">{readyCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">승인 완료</h3>
          <p className="text-2xl font-bold text-emerald-600" data-testid="ai-approved-count">{approvedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">데이터 부족</h3>
          <p className="text-2xl font-bold text-red-600" data-testid="ai-insufficient-count">{insufficientCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-xs font-medium text-text-secondary mb-1">조치 불필요</h3>
          <p className="text-2xl font-bold text-neutral-600" data-testid="ai-noaction-count">{noActionCount}</p>
        </div>
      </div>

      {/* Loading State */}
      {recommendationsQuery.isLoading && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 animate-pulse" data-testid="ai-loading">
          <div className="space-y-4">
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-4 bg-neutral-200 rounded w-2/3" />
            <div className="h-40 bg-neutral-100 rounded" />
          </div>
        </div>
      )}

      {/* Error State */}
      {recommendationsQuery.error && (
        <EmptyState
          title="추천 데이터를 불러오지 못했습니다"
          description="필터를 변경하거나 다시 시도해주세요."
          variant="error"
          actionLabel="다시 시도"
          onAction={() => recommendationsQuery.refetch()}
        />
      )}

      {/* Empty State */}
      {!recommendationsQuery.isLoading && !recommendationsQuery.error && recommendations.length === 0 && (
        <EmptyState
          title="추천 데이터가 없습니다"
          description="센터/창고 필터를 변경하거나, AI 스케줄러가 실행될 때까지 기다려주세요."
          icon={ShoppingCart}
        />
      )}

      {/* Recommendation Table */}
      {!recommendationsQuery.isLoading && !recommendationsQuery.error && recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden" data-testid="ai-recommendation-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">상품</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">현재고</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">안전재고</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">7일 예측</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">리드타임</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">추천 발주량</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">가중 일평균</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">설명</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recommendations.map((rec) => (
                  <RecommendationRow
                    key={rec.id}
                    recommendation={rec}
                    isApproving={approvingId === rec.id}
                    isOnline={isOnline}
                    onApprove={handleApprove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

interface RecommendationRowProps {
  recommendation: AIRecommendation
  isApproving: boolean
  isOnline: boolean
  onApprove: (id: number) => void
}

function RecommendationRow({ recommendation: rec, isApproving, isOnline, onApprove }: RecommendationRowProps) {
  const statusConfig = STATUS_CONFIG[rec.status]
  const StatusIcon = statusConfig.icon

  return (
    <tr
      className={`hover:bg-neutral-50 ${rec.status === 'INSUFFICIENT_HISTORY' ? 'bg-red-50/30' : ''}`}
      data-testid={`ai-recommendation-row-${rec.id}`}
    >
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-text-primary" data-testid={`ai-rec-product-${rec.id}`}>
          {rec.productName ?? `상품 #${rec.productId}`}
        </div>
        {rec.productBarcode && (
          <div className="text-xs text-text-light">{rec.productBarcode}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono" data-testid={`ai-rec-stock-${rec.id}`}>
        {formatNumber(rec.currentStockQuantity)}
      </td>
      <td className="px-4 py-3 text-right font-mono" data-testid={`ai-rec-safety-${rec.id}`}>
        {formatNumber(rec.safetyStockQuantity)}
      </td>
      <td className="px-4 py-3 text-right font-mono" data-testid={`ai-rec-forecast-${rec.id}`}>
        {formatNumber(rec.sevenDayForecastQuantity)}
      </td>
      <td className="px-4 py-3 text-right font-mono" data-testid={`ai-rec-leadtime-${rec.id}`}>
        {rec.leadTimeDays}일
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold" data-testid={`ai-rec-quantity-${rec.id}`}>
        {rec.status === 'INSUFFICIENT_HISTORY' ? (
          <span className="text-red-500">-</span>
        ) : (
          formatNumber(rec.recommendedQuantity)
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono" data-testid={`ai-rec-weighted-${rec.id}`}>
        {formatDecimal(rec.weightedDailyDemand)}
      </td>
      <td className="px-4 py-3 max-w-xs">
        {rec.status === 'INSUFFICIENT_HISTORY' ? (
          <div className="flex items-start gap-1 text-red-600" data-testid={`ai-rec-insufficient-${rec.id}`}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="text-xs">확인된 출고 이력이 없어 예측을 생성할 수 없습니다</span>
          </div>
        ) : rec.explanationSummary ? (
          <div className="text-xs text-text-secondary truncate" title={rec.explanationSummary} data-testid={`ai-rec-explanation-${rec.id}`}>
            {rec.explanationSummary}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3" data-testid={`ai-rec-actions-${rec.id}`}>
        {rec.status === 'READY_FOR_APPROVAL' && (
          <button
            type="button"
            onClick={() => onApprove(rec.id)}
            disabled={isApproving || !isOnline}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            data-testid={`ai-approve-btn-${rec.id}`}
            title={!isOnline ? '오프라인에서는 승인할 수 없습니다.' : undefined}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {isApproving ? '승인 중...' : '발주 승인'}
          </button>
        )}
        {rec.status === 'APPROVED_TO_DRAFT' && rec.approvedPurchaseOrderNumber && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700" data-testid={`ai-po-link-${rec.id}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>발주 {rec.approvedPurchaseOrderNumber}</span>
          </div>
        )}
        {rec.status === 'INSUFFICIENT_HISTORY' && (
          <div className="flex items-center gap-1 text-xs text-red-500" data-testid={`ai-insufficient-badge-${rec.id}`}>
            <Ban className="w-3.5 h-3.5" />
            <span>불가</span>
          </div>
        )}
        {rec.status === 'NO_ACTION' && (
          <div className="flex items-center gap-1 text-xs text-neutral-500" data-testid={`ai-noaction-badge-${rec.id}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>충분</span>
          </div>
        )}
      </td>
    </tr>
  )
}
