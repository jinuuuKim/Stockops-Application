/**
 * Inventory turnover table component.
 * Displays sortable table with turnover metrics per product.
 * Highlights high and low turnover rates.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useMemo } from 'react'
import type { InventoryTurnoverItem } from '@/types/analytics'
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react'

type SortKey = 'productName' | 'turnoverRate' | 'cogs' | 'avgInventory'
type SortDir = 'asc' | 'desc'

interface InventoryTurnoverTableProps {
  items: InventoryTurnoverItem[]
}

export function InventoryTurnoverTable({ items }: InventoryTurnoverTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('turnoverRate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [items, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
  }

  function handleExportCsv() {
    const headers = ['Product', 'Barcode', 'Turnover Rate', 'COGS', 'Avg Inventory']
    const rows = sortedItems.map((item) => [
      item.productName,
      item.productBarcode,
      item.turnoverRate.toFixed(2),
      item.cogs.toString(),
      item.avgInventory.toString(),
    ])
    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory-turnover-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const avgTurnover = items.length > 0 ? items.reduce((sum, i) => sum + i.turnoverRate, 0) / items.length : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
            <p className="text-xs text-text-secondary">전체 품목</p>
            <p className="text-xl font-bold text-text-primary">{items.length}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
            <p className="text-xs text-text-secondary">평균 회전율</p>
            <p className="text-xl font-bold text-text-primary">{avgTurnover.toFixed(2)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium text-text-secondary"
        >
          <Download className="w-4 h-4" />
          CSV 내보내기
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  <button type="button" onClick={() => handleSort('productName')} className="flex items-center gap-1 hover:text-text-primary">
                    품목 {sortIcon('productName')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">바코드</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">
                  <button type="button" onClick={() => handleSort('turnoverRate')} className="flex items-center gap-1 ml-auto hover:text-text-primary">
                    회전율 {sortIcon('turnoverRate')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">
                  <button type="button" onClick={() => handleSort('cogs')} className="flex items-center gap-1 ml-auto hover:text-text-primary">
                    COGS {sortIcon('cogs')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">
                  <button type="button" onClick={() => handleSort('avgInventory')} className="flex items-center gap-1 ml-auto hover:text-text-primary">
                    평균재고 {sortIcon('avgInventory')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedItems.map((item) => {
                const isHigh = item.turnoverRate > avgTurnover * 1.5
                const isLow = item.turnoverRate < avgTurnover * 0.5
                return (
                  <tr key={item.productId} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-text-primary">{item.productName}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{item.productBarcode}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        isHigh ? 'bg-emerald-100 text-emerald-700' :
                        isLow ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {item.turnoverRate.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{item.cogs.toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.avgInventory.toLocaleString('ko-KR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
