/**
 * Reports page component with 5 tab-based analytics dashboards.
 * Integrates inventory turnover, ABC/XYZ classification, expiry waste,
 * lead time, and stock aging reports with center and date filters.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCenters } from '@/hooks/useCenter'
import {
  useInventoryTurnover,
  useAbcAnalysis,
  useXyzAnalysis,
  useAbcXyzMatrix,
  useExpiryWaste,
  useLeadTime,
  useStockAging,
} from '@/hooks/useReports'
import { InventoryTurnoverTable } from '@/components/reports/InventoryTurnoverTable'
import { AbcXyzMatrix } from '@/components/reports/AbcXyzMatrix'
import { ExpiryWasteChart } from '@/components/reports/ExpiryWasteChart'
import { LeadTimeChart } from '@/components/reports/LeadTimeChart'
import { EmptyState } from '@/components/common/EmptyState'
import {
  BarChart3,
  Grid3X3,
  AlertTriangle,
  Clock,
  Package,
  RefreshCw,
  Download,
  Filter,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

type ReportTab = 'turnover' | 'abc-xyz' | 'expiry-waste' | 'lead-time' | 'stock-aging'

const TABS: { key: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'turnover', label: '재고 회전율', icon: BarChart3 },
  { key: 'abc-xyz', label: 'ABC/XYZ 분류', icon: Grid3X3 },
  { key: 'expiry-waste', label: '유통기한 손실', icon: AlertTriangle },
  { key: 'lead-time', label: '리드타임', icon: Clock },
  { key: 'stock-aging', label: '재고 노후화', icon: Package },
]

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const to = new Date(today.getFullYear(), today.getMonth(), 0)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export function ReportsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: centers = [] } = useCenters()
  const [activeTab, setActiveTab] = useState<ReportTab>('turnover')
  const [centerId, setCenterId] = useState<number | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState<string>(getDefaultDateRange().from)
  const [dateTo, setDateTo] = useState<string>(getDefaultDateRange().to)

  const scopeMetadata = user?.scopeMetadata

  const scopedCenters = scopeMetadata?.global
    ? centers
    : centers.filter((c) => scopeMetadata?.centerIds.includes(c.id) ?? false)

  const isTurnoverActive = activeTab === 'turnover'
  const isAbcXyzActive = activeTab === 'abc-xyz'
  const isExpiryWasteActive = activeTab === 'expiry-waste'
  const isLeadTimeActive = activeTab === 'lead-time'
  const isStockAgingActive = activeTab === 'stock-aging'
  const requiresCenterSelection = isAbcXyzActive && centerId === undefined

  const turnoverQuery = useInventoryTurnover(dateFrom, dateTo, centerId, isTurnoverActive)
  const abcQuery = useAbcAnalysis(centerId, isAbcXyzActive)
  const xyzQuery = useXyzAnalysis(centerId, isAbcXyzActive)
  const matrixQuery = useAbcXyzMatrix(centerId, isAbcXyzActive)
  const expiryWasteQuery = useExpiryWaste(dateFrom, dateTo, centerId, isExpiryWasteActive)
  const leadTimeQuery = useLeadTime(dateFrom, dateTo, centerId, isLeadTimeActive)
  const stockAgingQuery = useStockAging(dateFrom, dateTo, centerId, isStockAgingActive)

  const activeQuery = (() => {
    switch (activeTab) {
      case 'turnover': return turnoverQuery
      case 'abc-xyz': return matrixQuery
      case 'expiry-waste': return expiryWasteQuery
      case 'lead-time': return leadTimeQuery
      case 'stock-aging': return stockAgingQuery
    }
  })()
  const canRunActiveQuery = !requiresCenterSelection

  const pieData = useMemo(() => {
    if (!stockAgingQuery.data?.summary) return []
    const s = stockAgingQuery.data.summary
    return [
      { name: '0-30일', value: s.zeroToThirtyQuantity, color: PIE_COLORS[0] },
      { name: '31-60일', value: s.thirtyOneToSixtyQuantity, color: PIE_COLORS[1] },
      { name: '61-90일', value: s.sixtyOneToNinetyQuantity, color: PIE_COLORS[2] },
      { name: '90일+', value: s.overNinetyQuantity, color: PIE_COLORS[3] },
      { name: '수요없음', value: s.noDemandQuantity, color: PIE_COLORS[4] },
    ].filter((d) => d.value > 0)
  }, [stockAgingQuery.data])

  function handleExportCsv() {
    if (!activeQuery.data) return
    let csv = ''
    let filename = ''

    if (activeTab === 'turnover' && turnoverQuery.data) {
      filename = 'inventory-turnover.csv'
      csv = '상품,바코드,회전율,매출원가,평균재고\n'
      csv += turnoverQuery.data.items.map((i) =>
        `"${i.productName}","${i.productBarcode}",${i.turnoverRate.toFixed(2)},${i.cogs},${i.avgInventory}`
      ).join('\n')
    } else if (activeTab === 'abc-xyz' && matrixQuery.data) {
      filename = 'abc-xyz-matrix.csv'
      csv = 'ABC 등급,XYZ 등급,상품 수,상품\n'
      csv += matrixQuery.data.cells.map((c) =>
        `"${c.abcClass}","${c.xyzClass}",${c.productCount},"${c.products.map((p) => p.productName).join('; ')}"`
      ).join('\n')
    } else if (activeTab === 'expiry-waste' && expiryWasteQuery.data) {
      filename = 'expiry-waste.csv'
      csv = '상품,센터,창고,격리 수량,격리 LOT 수\n'
      csv += expiryWasteQuery.data.rows.map((r) =>
        `"${r.productName}","${r.centerName}","${r.warehouseName}",${r.quarantinedQuantity},${r.quarantinedLotCount}`
      ).join('\n')
    } else if (activeTab === 'lead-time' && leadTimeQuery.data) {
      filename = 'lead-time.csv'
      csv = '상품,센터,창고,발주 수,샘플 수,총 리드타임(h),평균 리드타임(h)\n'
      csv += leadTimeQuery.data.rows.map((r) =>
        `"${r.productName}","${r.centerName}","${r.warehouseName}",${r.purchaseOrderCount},${r.leadTimeSampleCount},${r.totalLeadTimeHours},${r.averageLeadTimeHours}`
      ).join('\n')
    } else if (activeTab === 'stock-aging' && stockAgingQuery.data) {
      filename = 'stock-aging.csv'
      csv = '상품,센터,창고,가용 수량,평균 일수요,재고 커버일,노후화 구간\n'
      csv += stockAgingQuery.data.rows.map((r) =>
        `"${r.productName}","${r.centerName}","${r.warehouseName}",${r.availableQuantity},${r.averageDailyDemand ?? ''},${r.estimatedCoverageDays ?? ''},"${r.agingBucket}"`
      ).join('\n')
    }

    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">리포트 & 분석</h1>
          <p className="text-text-secondary mt-1">
            재고 회전율, ABC/XYZ 분류, 유통기한 손실, 리드타임, 재고 노후화 지표를 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (canRunActiveQuery) {
                activeQuery.refetch()
              }
            }}
            disabled={!canRunActiveQuery || activeQuery.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${activeQuery.isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!canRunActiveQuery || !activeQuery.data || activeQuery.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            CSV 내보내기
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200" data-testid="report-filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">필터</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="report-center-filter" className="block text-xs font-medium text-text-secondary mb-1">센터</label>
            <select
              id="report-center-filter"
              value={centerId ?? ''}
              onChange={(e) => setCenterId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">전체 센터</option>
              {scopedCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-date-from" className="block text-xs font-medium text-text-secondary mb-1">시작일</label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label htmlFor="report-date-to" className="block text-xs font-medium text-text-secondary mb-1">종료일</label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="report-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-neutral-200 text-text-secondary hover:bg-neutral-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {requiresCenterSelection && (
        <EmptyState
          title="센터 선택이 필요합니다"
          description="ABC/XYZ 분류는 센터별 수요 데이터를 기준으로 계산됩니다. 필터에서 센터를 선택해주세요."
        />
      )}

      {!requiresCenterSelection && activeQuery.isLoading && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-4 bg-neutral-200 rounded w-2/3" />
            <div className="h-40 bg-neutral-100 rounded" />
          </div>
        </div>
      )}

      {!requiresCenterSelection && activeQuery.error && (
        <EmptyState
          title="데이터를 불러오지 못했습니다"
          description="필터를 변경하거나 다시 시도해주세요."
          variant="error"
          actionLabel="다시 시도"
          onAction={() => activeQuery.refetch()}
        />
      )}

      {!requiresCenterSelection && activeTab === 'turnover' && turnoverQuery.data && (
        <InventoryTurnoverTable items={turnoverQuery.data.items} />
      )}

      {!requiresCenterSelection && activeTab === 'abc-xyz' && matrixQuery.data && (
        <div className="space-y-6">
          <AbcXyzMatrix cells={matrixQuery.data.cells} />
          {abcQuery.data && xyzQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AbcTable title="ABC 분류" items={abcQuery.data.items} />
              <XyzTable title="XYZ 분류" items={xyzQuery.data.items} />
            </div>
          )}
        </div>
      )}

      {!requiresCenterSelection && activeTab === 'expiry-waste' && expiryWasteQuery.data && (
        <ExpiryWasteChart
          summary={expiryWasteQuery.data.summary}
          monthlyData={expiryWasteQuery.data.monthlyData}
        />
      )}

      {!requiresCenterSelection && activeTab === 'lead-time' && leadTimeQuery.data && (
        <LeadTimeChart
          monthlyData={leadTimeQuery.data.monthlyData}
          suppliers={leadTimeQuery.data.suppliers}
        />
      )}

      {!requiresCenterSelection && activeTab === 'stock-aging' && stockAgingQuery.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <SummaryCard label="전체 품목" value={formatNumber(stockAgingQuery.data.summary.rowCount)} />
            <SummaryCard label="총 재고량" value={formatNumber(stockAgingQuery.data.summary.totalAvailableQuantity)} />
            <SummaryCard label="0-30일" value={formatNumber(stockAgingQuery.data.summary.zeroToThirtyQuantity)} variant="success" />
            <SummaryCard label="31-60일" value={formatNumber(stockAgingQuery.data.summary.thirtyOneToSixtyQuantity)} variant="default" />
            <SummaryCard label="61-90일" value={formatNumber(stockAgingQuery.data.summary.sixtyOneToNinetyQuantity)} variant="warning" />
            <SummaryCard label="90일+" value={formatNumber(stockAgingQuery.data.summary.overNinetyQuantity)} variant="danger" />
            <SummaryCard label="수요없음" value={formatNumber(stockAgingQuery.data.summary.noDemandQuantity)} variant="warning" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <h3 className="text-sm font-semibold text-text-primary mb-4">재고 노후화 분포</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">품목</th>
                      <th className="px-4 py-3 text-right font-medium text-text-secondary">가용재고</th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">에이징</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {stockAgingQuery.data.rows.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">데이터가 없습니다</td></tr>
                    ) : stockAgingQuery.data.rows.slice(0, 10).map((row) => (
                      <tr key={`${row.productId}-${row.warehouseId}`} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-text-primary">{row.productName}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(row.availableQuantity)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            row.agingBucket === '0-30' ? 'bg-emerald-100 text-emerald-700' :
                            row.agingBucket === '31-60' ? 'bg-blue-100 text-blue-700' :
                            row.agingBucket === '61-90' ? 'bg-amber-100 text-amber-700' :
                            row.agingBucket === '90+' ? 'bg-red-100 text-red-700' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {row.agingBucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'warning' | 'success' | 'danger' }) {
  const variantClasses = {
    default: 'text-neutral-600',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
    danger: 'text-red-500',
  }
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
      <h3 className="text-xs font-medium text-text-secondary mb-1">{label}</h3>
      <p className={`text-2xl font-bold ${variantClasses[variant]}`}>{value}</p>
    </div>
  )
}

function AbcTable({ title, items }: { title: string; items: import('@/types/analytics').AbcAnalysisItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">품목</th>
              <th className="px-4 py-3 text-right font-medium text-text-secondary">매출</th>
              <th className="px-4 py-3 text-center font-medium text-text-secondary">등급</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">데이터가 없습니다</td></tr>
            ) : items.slice(0, 10).map((item) => (
              <tr key={item.productId} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-text-primary">{item.productName}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(item.revenue)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    item.class === 'A' ? 'bg-emerald-100 text-emerald-700' :
                    item.class === 'B' ? 'bg-blue-100 text-blue-700' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {item.class}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function XyzTable({ title, items }: { title: string; items: import('@/types/analytics').XyzAnalysisItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">품목</th>
              <th className="px-4 py-3 text-right font-medium text-text-secondary">변동계수</th>
              <th className="px-4 py-3 text-center font-medium text-text-secondary">등급</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">데이터가 없습니다</td></tr>
            ) : items.slice(0, 10).map((item) => (
              <tr key={item.productId} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-text-primary">{item.productName}</td>
                <td className="px-4 py-3 text-right font-mono">{item.coefficientOfVariation.toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    item.class === 'X' ? 'bg-emerald-100 text-emerald-700' :
                    item.class === 'Y' ? 'bg-blue-100 text-blue-700' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {item.class}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
