/**
 * Expiry Management Page component.
 * Displays expiry alerts with filtering and acknowledgment functionality.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Clock, AlertCircle, Info, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import type { ExpiryAlert, ExpiryAlertSummary, AlertLevel } from '@/types/expiry'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * Fetches expiry alerts from the API.
 *
 * @param filters - Optional filter parameters
 * @returns Promise resolving to array of expiry alerts
 */
async function fetchExpiryAlerts(filters?: { level?: AlertLevel; includeAcknowledged?: boolean }) {
  const params = new URLSearchParams()
  if (filters?.level) params.append('level', filters.level)
  if (filters?.includeAcknowledged) params.append('includeAcknowledged', 'true')
  
  const response = await api.get<ExpiryAlert[]>('/v1/alerts/expiry', { params })
  return Array.isArray(response.data) ? response.data : []
}

/**
 * Fetches expiry alert summary from the API.
 *
 * @returns Promise resolving to alert summary counts
 */
async function fetchExpiryAlertSummary() {
  const response = await api.get<ExpiryAlertSummary>('/v1/alerts/expiry/summary')
  return {
    total: response.data?.total ?? 0,
    critical: response.data?.critical ?? 0,
    warning: response.data?.warning ?? 0,
    notice: response.data?.notice ?? 0,
    info: response.data?.info ?? 0,
  }
}

/**
 * Acknowledges an expiry alert.
 *
 * @param alertId - The alert ID to acknowledge
 * @returns Promise resolving on success
 */
async function acknowledgeAlert(alertId: number) {
  await api.post(`/v1/alerts/${alertId}/acknowledge`)
}

/**
 * Alert level configuration with styling and icons.
 */
const ALERT_LEVEL_CONFIG: Record<AlertLevel, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  CRITICAL: { label: '긴급', color: 'text-white', bgColor: 'bg-error', icon: AlertTriangle },
  WARNING: { label: '주의', color: 'text-white', bgColor: 'bg-warning', icon: AlertCircle },
  NOTICE: { label: '관찰', color: 'text-neutral-900', bgColor: 'bg-yellow-400', icon: Clock },
  INFO: { label: '안내', color: 'text-white', bgColor: 'bg-info', icon: Info },
}

/**
 * Expiry Management Page with alert summary cards and data table.
 * Supports filtering by alert level and acknowledging alerts.
 *
 * @returns ExpiryPage JSX element
 */
export function ExpiryPage() {
  const [selectedLevel, setSelectedLevel] = useState<AlertLevel | 'ALL'>('ALL')
  const [includeAcknowledged, setIncludeAcknowledged] = useState(false)
  const queryClient = useQueryClient()

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['expiryAlerts', selectedLevel, includeAcknowledged],
    queryFn: () => fetchExpiryAlerts({
      level: selectedLevel === 'ALL' ? undefined : selectedLevel,
      includeAcknowledged,
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['expiryAlertSummary'],
    queryFn: fetchExpiryAlertSummary,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiryAlerts'] })
      queryClient.invalidateQueries({ queryKey: ['expiryAlertSummary'] })
    },
  })

  const handleAcknowledge = (alertId: number) => {
    acknowledgeMutation.mutate(alertId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const summaryCards = [
    { key: 'critical' as const, label: '긴급', count: summary?.critical ?? 0, color: 'bg-error', icon: AlertTriangle },
    { key: 'warning' as const, label: '주의', count: summary?.warning ?? 0, color: 'bg-warning', icon: AlertCircle },
    { key: 'notice' as const, label: '관찰', count: summary?.notice ?? 0, color: 'bg-yellow-400', icon: Clock },
    { key: 'info' as const, label: '안내', count: summary?.info ?? 0, color: 'bg-info', icon: Info },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-neutral-900">유통기한 관리</h1>
      <p className="text-neutral-600 mb-6">
        유통기한이 임박한 상품을 모니터링하고 관리하세요.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => setSelectedLevel(selectedLevel === card.key.toUpperCase() as AlertLevel ? 'ALL' : card.key.toUpperCase() as AlertLevel)}
            className={`bg-white p-6 rounded-lg shadow text-left transition-all ${
              selectedLevel === card.key.toUpperCase() ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-500">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color === 'bg-yellow-400' ? 'text-yellow-600' : 'text-white'}`} />
            </div>
            <p className={`text-3xl font-bold ${card.color === 'bg-yellow-400' ? 'text-neutral-900' : 'text-neutral-900'}`}>
              {card.count}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-700">필터:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAcknowledged}
              onChange={(e) => setIncludeAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-600">확인 완료 포함</span>
          </label>
          {selectedLevel !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedLevel('ALL')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {alertsLoading ? (
          <EmptyState
            title="유통기한 알림 로딩 중"
            description="LOT별 유통기한 상태를 불러오는 중입니다."
            variant="empty"
          />
        ) : alerts.length === 0 ? (
          <EmptyState
            title="유통기한 알림이 없습니다"
            description="현재 확인이 필요한 임박 또는 만료 LOT이 없습니다."
            icon={CheckCircle}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">단계</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">상품</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">LOT 번호</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">유통기한</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">잔여일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">수량</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">확인 상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {alerts.map((alert) => {
                  const config = ALERT_LEVEL_CONFIG[alert.alertLevel]
                  const Icon = config.icon
                  return (
                    <tr key={alert.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-neutral-900">{alert.productName}</p>
                          <p className="text-sm text-neutral-500">{alert.productBarcode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{alert.lotNumber}</td>
                      <td className="px-4 py-3 text-neutral-900">{formatDate(alert.expiryDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          alert.daysUntilExpiry <= 1 ? 'text-error' :
                          alert.daysUntilExpiry <= 7 ? 'text-warning' :
                          alert.daysUntilExpiry <= 14 ? 'text-yellow-600' :
                          'text-info'
                        }`}>
                          D-{alert.daysUntilExpiry}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{alert.quantity}</td>
                      <td className="px-4 py-3">
                        {alert.acknowledged ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                            <CheckCircle className="w-3 h-3" />
                            확인 완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3" />
                            확인 필요
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!alert.acknowledged && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                            className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                          >
                            확인 처리
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
