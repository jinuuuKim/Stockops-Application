/**
 * ABC-XYZ matrix component.
 * Displays a 3x3 grid with color-coded cells.
 * Clickable cells reveal the product list in a modal.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { Fragment, useState } from 'react'
import type { AbcXyzMatrixCell } from '@/types/analytics'
import { X } from 'lucide-react'

interface AbcXyzMatrixProps {
  cells: AbcXyzMatrixCell[]
}

const ABC_CLASSES: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']
const XYZ_CLASSES: Array<'X' | 'Y' | 'Z'> = ['X', 'Y', 'Z']

function getCellColor(abc: string, xyz: string): string {
  // AX = green (best), CZ = red (worst)
  const score = ABC_CLASSES.indexOf(abc as 'A') + XYZ_CLASSES.indexOf(xyz as 'X')
  if (abc === 'A' && xyz === 'X') return 'bg-emerald-500 text-white'
  if (abc === 'C' && xyz === 'Z') return 'bg-red-500 text-white'
  if (score <= 1) return 'bg-emerald-300 text-white'
  if (score >= 3) return 'bg-red-300 text-white'
  if (score === 2) return 'bg-amber-300 text-white'
  return 'bg-neutral-200 text-neutral-700'
}

export function AbcXyzMatrix({ cells }: AbcXyzMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<AbcXyzMatrixCell | null>(null)

  function getCell(abc: string, xyz: string): AbcXyzMatrixCell | undefined {
    return cells.find((c) => c.abcClass === abc && c.xyzClass === xyz)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary">XYZ →</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {/* Header row */}
          <div className="flex items-center justify-center text-xs font-medium text-text-secondary">ABC ↓</div>
          {XYZ_CLASSES.map((xyz) => (
            <div key={xyz} className="flex items-center justify-center text-sm font-bold text-text-primary py-2">
              {xyz}
            </div>
          ))}

          {/* Matrix rows */}
          {ABC_CLASSES.map((abc) => (
            <Fragment key={abc}>
              <div className="flex items-center justify-center text-sm font-bold text-text-primary">
                {abc}
              </div>
              {XYZ_CLASSES.map((xyz) => {
                const cell = getCell(abc, xyz)
                return (
                  <button
                    key={`${abc}-${xyz}`}
                    type="button"
                    onClick={() => cell && setSelectedCell(cell)}
                    className={`rounded-lg p-4 transition-transform hover:scale-105 ${getCellColor(abc, xyz)} ${cell && cell.productCount > 0 ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                  >
                    <div className="text-2xl font-bold">{cell?.productCount ?? 0}</div>
                    <div className="text-xs opacity-90">{abc}{xyz}</div>
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span>최우선 관리 (AX)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-300 inline-block" />
            <span>중간 관리</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" />
            <span>저우선순위 (CZ)</span>
          </div>
        </div>
      </div>

      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-text-primary">
                {selectedCell.abcClass}{selectedCell.xyzClass} 분류 품목 ({selectedCell.productCount}개)
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                aria-label="닫기"
                className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {selectedCell.products.length === 0 ? (
                <p className="text-text-secondary text-center py-8">등록된 품목이 없습니다</p>
              ) : (
                <ul className="space-y-2">
                  {selectedCell.products.map((product) => (
                    <li key={product.productId} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                      <span className="text-sm font-medium text-text-primary">{product.productName}</span>
                      <span className="text-xs text-text-secondary font-mono">ID: {product.productId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
