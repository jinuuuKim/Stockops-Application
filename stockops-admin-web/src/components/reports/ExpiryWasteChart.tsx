/**
 * Expiry waste chart component.
 * Displays a Recharts bar chart of monthly quarantined quantity
 * alongside summary cards.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useMemo } from 'react'
import type { ExpiryWasteSummary, ExpiryWasteMonthly } from '@/types/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Package, Hash, Download } from 'lucide-react'

interface ExpiryWasteChartProps {
  summary: ExpiryWasteSummary
  monthlyData?: ExpiryWasteMonthly[]
}

export function ExpiryWasteChart({ summary, monthlyData }: ExpiryWasteChartProps) {
  const chartData = useMemo(() => {
    if (monthlyData && monthlyData.length > 0) return monthlyData
    return []
  }, [monthlyData])

  function handleExportCsv() {
    const headers = ['Month', 'Quarantined Quantity']
    const rows = chartData.map((d) => [d.month, d.quarantinedQuantity.toString()])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'expiry-waste-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <Package className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">격리 수량</p>
            <p className="text-xl font-bold text-text-primary">{summary.quarantinedQuantity.toLocaleString('ko-KR')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Hash className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">격리 LOT 수</p>
            <p className="text-xl font-bold text-text-primary">{summary.quarantinedLotCount.toLocaleString('ko-KR')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">영향 품목</p>
            <p className="text-xl font-bold text-text-primary">{summary.rowCount.toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">월별 격리 수량</h3>
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-xs font-medium text-text-secondary"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 800, height: 256 }}
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value) => [typeof value === 'number' ? `${value.toLocaleString('ko-KR')}개` : `${value}개`, '격리 수량']}
                />
                <Bar dataKey="quarantinedQuantity" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
          <AlertTriangle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">월별 데이터가 없습니다</p>
        </div>
      )}
    </div>
  )
}
