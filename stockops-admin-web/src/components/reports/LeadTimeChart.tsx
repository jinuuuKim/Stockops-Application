/**
 * Lead time chart component.
 * Displays a Recharts line chart of monthly average lead time
 * alongside a supplier summary table.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useMemo } from 'react'
import type { LeadTimeMonthly, LeadTimeSupplier } from '@/types/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock, Truck, Download } from 'lucide-react'

interface LeadTimeChartProps {
  monthlyData?: LeadTimeMonthly[]
  suppliers?: LeadTimeSupplier[]
}

export function LeadTimeChart({ monthlyData, suppliers }: LeadTimeChartProps) {
  const chartData = useMemo(() => {
    if (monthlyData && monthlyData.length > 0) return monthlyData
    return []
  }, [monthlyData])

  const avgLeadTime = useMemo(() => {
    if (!chartData.length) return 0
    return chartData.reduce((sum, d) => sum + d.avgLeadTimeHours, 0) / chartData.length
  }, [chartData])

  function handleExportCsv() {
    const headers = ['Month', 'Avg Lead Time (hours)']
    const rows = chartData.map((d) => [d.month, d.avgLeadTimeHours.toString()])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lead-time-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {chartData.length > 0 ? (
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">평균 리드타임</p>
                <p className="text-xl font-bold text-text-primary">{avgLeadTime.toFixed(1)}시간</p>
              </div>
            </div>
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
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value) => [typeof value === 'number' ? `${value.toFixed(1)}시간` : `${value}시간`, '평균 리드타임']}
                />
                <Line
                  type="monotone"
                  dataKey="avgLeadTimeHours"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
          <Clock className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">월별 리드타임 데이터가 없습니다</p>
        </div>
      )}

      {suppliers && suppliers.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
            <Truck className="w-4 h-4 text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">공급사별 리드타임</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">공급사</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">발주 수</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">평균 리드타임 (시간)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {suppliers.map((s) => (
                  <tr key={s.supplierName} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-text-primary">{s.supplierName}</td>
                    <td className="px-4 py-3 text-right font-mono">{s.orderCount.toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        s.avgLeadTimeHours > 72 ? 'bg-red-100 text-red-700' :
                        s.avgLeadTimeHours > 48 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.avgLeadTimeHours.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
